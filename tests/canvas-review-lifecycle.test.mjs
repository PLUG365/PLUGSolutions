import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function controlBlock(screen, controlName, nextControlName) {
  const start = screen.indexOf(`- ${controlName}:`);
  assert.notEqual(start, -1, `${controlName} is missing`);

  const end = nextControlName
    ? screen.indexOf(`- ${nextControlName}:`, start)
    : screen.length;
  assert.notEqual(end, -1, `${nextControlName} is missing`);

  return screen.slice(start, end);
}

for (const screenName of ["ReviewQueue", "ReviewDetail"]) {
  test(`${screenName} guards publish and withdrawal lifecycle transitions`, async () => {
    const screen = await readFile(
      new URL(
        `power-apps/plug-solutions-review/${screenName}.pa.yaml`,
        root,
      ),
      "utf8",
    );
    const prefix = screenName === "ReviewQueue" ? "Queue" : "Detail";
    const publish = controlBlock(
      screen,
      `btn${prefix}MarkPublished`,
      `btn${prefix}Withdraw`,
    );
    const withdraw = controlBlock(screen, `btn${prefix}Withdraw`);

    assert.match(publish, /Modified <> varSelectedRequest\.Modified/);
    assert.match(publish, /ReviewStatus\.Value/);
    assert.match(publish, /<> "承認"/);
    assert.match(publish, /ReviewStatus: \{Value: "公開済み"\}/);
    assert.match(publish, /ReviewedAt: Now\(\)/);
    assert.doesNotMatch(publish, /ReviewNotes:/);

    assert.match(withdraw, /Modified <> varSelectedRequest\.Modified/);
    assert.match(withdraw, /ReviewStatus\.Value/);
    assert.match(withdraw, /<> "公開済み"/);
    assert.match(withdraw, /IsBlank\(Trim\(txt(?:Queue)?ReviewNotes(?:Field)?\.Text\)\)/);
    assert.match(withdraw, /ReviewNotes: Trim\(txt(?:Queue)?ReviewNotes(?:Field)?\.Text\)/);
    assert.match(withdraw, /ReviewStatus: \{Value: "取り下げ"\}/);
    assert.match(withdraw, /ReviewedAt: Now\(\)/);

    assert.doesNotMatch(`${publish}\n${withdraw}`, /\bRemove(?:If)?\s*\(/);
  });

  test(`${screenName} makes approved public fields read-only and guards return-to-review`, async () => {
    const screen = await readFile(
      new URL(`power-apps/plug-solutions-review/${screenName}.pa.yaml`, root),
      "utf8",
    );
    const prefix = screenName === "ReviewQueue" ? "Queue" : "Detail";
    const returnButtonName = `btn${prefix}ReturnToReview`;
    const returnButton = controlBlock(screen, returnButtonName);

    assert.match(returnButton, /Text: ="審査に戻す"/);
    assert.match(returnButton, /Height: =48/);
    assert.match(returnButton, /Modified <> varSelectedRequest\.Modified/);
    assert.match(returnButton, /ReviewStatus\.Value/);
    assert.match(returnButton, /<> "承認"/);
    assert.match(returnButton, /ReviewStatus: \{Value: "要確認"\}/);
    assert.match(returnButton, /ReviewedAt: Now\(\)/);
    assert.doesNotMatch(returnButton, /ReviewNotes:/);
    assert.doesNotMatch(returnButton, /(?:Title|MakerDisplayName|Description|DistributionUrl|Slug):/);

    const publicControls = screenName === "ReviewQueue"
      ? [
          "txtQueueTitleField", "txtQueueMakerField", "txtQueueXField",
          "txtQueueDescriptionField", "txtQueueDistributionField", "txtQueueSlugField",
          "txtQueueThumbnailPathField",
        ]
      : [
          "txtTitle", "txtMakerDisplayName", "txtXHandle", "txtDescription",
          "txtDistributionUrl", "txtSlug", "txtThumbnailPath",
        ];
    for (let index = 0; index < publicControls.length; index += 1) {
      const next = publicControls[index + 1]
        ?? (screenName === "ReviewQueue" ? "txtQueueReviewNotesField" : "txtReviewNotes");
      const block = controlBlock(screen, publicControls[index], next);
      assert.match(block, /DisplayMode:/, `${publicControls[index]} lacks DisplayMode`);
      assert.equal(
        (block.match(/DisplayMode: =DisplayMode\.View/g) ?? []).length,
        1,
        `${publicControls[index]} is not view-only`,
      );
    }

    const removedLegacyControls = screenName === "ReviewQueue"
      ? [
          "txtQueueCatalogTypeField", "txtQueueCategoriesField", "txtQueueTagsField",
          "txtQueueLicenseField", "txtQueueCostField", "drpQueuePremiumField",
          "txtQueueSetupField", "txtQueueSourceField", "txtQueueInstructionsField",
          "txtQueuePrerequisitesField", "dpQueuePublishedDateField", "dpQueueUpdatedDateField",
        ]
      : [
          "txtCatalogType", "txtCatalogCategories", "txtCatalogTags", "txtSourceUrl",
          "txtInstructionsUrl", "txtCatalogLicense", "txtCatalogCost", "cmbPremiumRequired",
          "txtSetupTime", "txtCatalogPrerequisites", "dpCatalogPublishedDate", "dpCatalogUpdatedDate",
        ];
    for (const controlName of removedLegacyControls) {
      assert.equal(screen.includes(`- ${controlName}:`), false, `${controlName} should be removed`);
    }

    const actionNames = screenName === "ReviewQueue"
      ? ["btnQueueSave", "btnQueueReject", "btnQueueApprove"]
      : ["btnSaveDraft", "btnReject", "btnApprove"];
    for (const actionName of actionNames) {
      const block = controlBlock(screen, actionName);
      assert.match(block, /DisplayMode:/);
      assert.match(block, /DisplayMode\.Disabled/);
      if (!actionName.toLowerCase().includes("save")) {
        assert.match(block, /ReviewStatus\.Value/);
        assert.match(block, /"承認"/);
      }
    }

    assert.match(screen, /TypesAndUses/);
    assert.match(screen, /RelatedUrls/);
    assert.match(screen, /ThumbnailCandidateUrl/);
    const approve = controlBlock(
      screen,
      screenName === "ReviewQueue" ? "btnQueueApprove" : "btnApprove",
    );
    assert.doesNotMatch(approve, /txt(?:Queue)?Catalog(?:Type|Categories|Tags|License|Cost)/);
    assert.doesNotMatch(approve, /(?:PremiumRequired|SetupTime|Catalog(?:Published|Updated)Date)/);

    const lifecycleRegion = screen.slice(screen.indexOf("Children:"));
    for (const patch of lifecycleRegion.matchAll(/Patch\(掲載申請,[\s\S]*?\{([^}]*)\}/g)) {
      const fields = [...patch[1].matchAll(/(?:^|, )([A-Za-z][A-Za-z0-9_]*):/g)].map(([, key]) => key);
      for (const key of fields) {
        assert.ok(["ReviewStatus", "ReviewedAt", "ReviewNotes"].includes(key), `${screenName} patches non-review field ${key}`);
      }
    }
  });
}
