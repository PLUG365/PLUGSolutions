import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function assertWorkflowTopLevelIsIndented(workflow) {
  const allowedTopLevel = /^(?:name|run-name|on|permissions|env|defaults|concurrency|jobs):/;

  for (const [index, line] of workflow.split(/\r?\n/).entries()) {
    if (line === "" || line.startsWith("#") || /^\s/.test(line)) {
      continue;
    }

    assert.match(
      line,
      allowedTopLevel,
      `unexpected unindented workflow content at line ${index + 1}`,
    );
  }
}

test("pull requests run CI without access to production secrets", async () => {
  const workflow = await readFile(new URL(".github/workflows/ci.yml", root), "utf8");

  assertWorkflowTopLevelIsIndented(workflow);

  assert.match(workflow, /^\s*pull_request:\s*$/m);
  assert.match(workflow, /^\s+push:\s*\n\s+branches:\s*\n\s+- main$/m);
  assert.match(workflow, /^permissions:\s*\n\s+contents: read$/m);
  assert.doesNotMatch(workflow, /AZURE_STATIC_WEB_APPS_API_TOKEN|environment:\s*production/);
});

test("production deploy is a manual, main-only, approval-gated release", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/deploy-production.yml", root),
    "utf8",
  );

  assertWorkflowTopLevelIsIndented(workflow);

  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s+reason:\s*$/m);
  assert.match(workflow, /^\s+required: true\s*$/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /^\s+run: npm run check\s*$/m);
  assert.match(workflow, /^\s+name: production\s*$/m);
  assert.match(workflow, /secrets\.AZURE_STATIC_WEB_APPS_API_TOKEN/);
  assert.match(
    workflow,
    /Azure\/static-web-apps-deploy@[a-f0-9]{40}/,
  );
  assert.match(workflow, /^\s+skip_app_build: true\s*$/m);
  assert.match(workflow, /NEXT_PUBLIC_SUBMISSION_FORM_URL: \$\{\{ vars\.NEXT_PUBLIC_SUBMISSION_FORM_URL \}\}/);
  assert.match(workflow, /NEXT_PUBLIC_LOUNGE_MODE: \$\{\{ vars\.NEXT_PUBLIC_LOUNGE_MODE \}\}/);
  assert.match(workflow, /NEXT_PUBLIC_LOUNGE_ROOM: \$\{\{ vars\.NEXT_PUBLIC_LOUNGE_ROOM \}\}/);
  assert.doesNotMatch(workflow, /secrets\.NEXT_PUBLIC_/);
  assert.doesNotMatch(workflow, /^\s+skip_api_build:/m);
  assert.doesNotMatch(workflow, /^\s*workflow_run:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:\s*$/m);
});

test("approved submission automation uses OIDC and creates reviewable PRs only", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/import-approved-submission.yml", root),
    "utf8",
  );

  assertWorkflowTopLevelIsIndented(workflow);

  assert.match(workflow, /^\s+schedule:\s*$/m);
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s+id-token: write$/m);
  assert.match(workflow, /^\s+contents: write$/m);
  assert.match(workflow, /^\s+pull-requests: write$/m);
  assert.match(workflow, /azure\/login@v3/);
  assert.match(workflow, /^\s+allow-no-subscriptions: true$/m);
  assert.match(workflow, /Lists.SelectedOperations.Selected|PLUG_SUBMISSIONS_LIST_ID/);
  assert.match(workflow, /gh pr create/);
  assert.match(workflow, /automation\/catalog-/);
  assert.match(workflow, /automation\/remove-/);
  assert.match(workflow, /catalog: remove/);
  assert.match(workflow, /git add -A -- "catalog\/solutions\/\$SLUG\.json"/);
  assert.match(workflow, /git ls-files --error-unmatch -- "public\/images\/solutions\/\$SLUG\.webp"/);
  assert.match(workflow, /test -e "public\/images\/solutions\/\$SLUG\.webp"/);
  assert.match(workflow, /steps\.result\.outputs\.operation/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm run verify:approved/);
  assert.match(workflow, /sourceRevision\?\.lastModifiedDateTime/);
  assert.doesNotMatch(workflow, /sourceRevision\?\.eTag/);
  const validationIndex = workflow.indexOf("- name: Validate prepared catalog change");
  const revisionIndex = workflow.indexOf("- name: Revalidate SharePoint revision");
  const commitIndex = workflow.indexOf("- name: Commit and push automation branch");
  assert.ok(validationIndex !== -1 && revisionIndex > validationIndex);
  assert.ok(commitIndex > revisionIndex);
  assert.doesNotMatch(workflow, /(?:PATCH|POST|PUT|DELETE)\s+https:\/\/graph\.microsoft\.com/i);
  assert.doesNotMatch(
    workflow,
    /client-secret|AZURE_STATIC_WEB_APPS_API_TOKEN|AZURE_SUBSCRIPTION_ID|subscription-id:/,
  );
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /git push[^\n]*\bmain\b/);
});

test("intake template normalizes public handles and assigns a non-PII slug", async () => {
  const workflow = JSON.parse(
    await readFile(
      new URL("power-platform/flows/plug-solutions-submission-review.definition.template.json", root),
      "utf8",
    ),
  );
  const create = workflow.actions.Create_only_when_not_registered.actions.Create_review_item;
  const parameters = create.inputs.parameters;
  assert.match(parameters["item/Slug"], /solution-/);
  assert.match(parameters["item/Slug"], /guid\(\)/);
  assert.ok(parameters["item/XHandle"].includes("startsWith(trim(string"));
  assert.equal(
    workflow.actions.Normalize_thumbnail_candidate.type,
    "Compose",
  );
  assert.match(
    workflow.actions.Normalize_thumbnail_candidate.inputs,
    /raw\.githubusercontent\.com/,
  );
  assert.equal(
    parameters["item/ThumbnailCandidateUrl"],
    "@outputs('Normalize_thumbnail_candidate')",
  );
});

test("approved export keeps raw Forms values behind a normalization gate", async () => {
  const workflow = JSON.parse(
    await readFile(
      new URL("power-platform/flows/plug-solutions-approved-json-export.definition.template.json", root),
      "utf8",
    ),
  );
  const normalize = workflow.actions.Normalize_raw_submission_values;
  assert.equal(normalize.type, "Compose");
  assert.ok(normalize.inputs.note.includes("Q6/Q8/画像候補を正規化"));
  assert.match(
    workflow.actions.Export_only_approved_complete_items.runAfter.Extract_labeled_related_urls[0],
    /Succeeded/,
  );
  assert.match(
    workflow.actions.Export_only_approved_complete_items.actions.Compose_public_catalog_item.inputs.maker.xHandle,
    /Normalize_raw_submission_values/,
  );
  const gate = workflow.actions.Export_only_approved_complete_items.expression.and
    .map((condition) => JSON.stringify(condition))
    .join("\n");
  assert.match(gate, /TypesAndUses/);
  assert.doesNotMatch(gate, /CatalogType|CatalogCategories|CatalogTags|CatalogLicense|CatalogCost|SetupTime|CatalogPublishedDate|CatalogUpdatedDate/);
  const item = workflow.actions.Export_only_approved_complete_items.actions.Compose_public_catalog_item.inputs;
  assert.match(item.license, /配布先を確認/);
  assert.match(item.cost, /配布先を確認/);
  assert.match(item.setupTime, /未記載/);
  assert.match(item.publishedAt, /ReviewedAt|utcNow/);
  assert.match(item.sourceUrl, /Extract_labeled_related_urls/);
  assert.match(item.instructionsUrl, /Extract_labeled_related_urls/);
  assert.match(workflow.actions.Extract_labeled_related_urls.inputs.note, /HTTPS/);
});

test("reactions Worker deployment is manual and skips without production credentials", async () => {
  const workflow = await readFile(new URL(".github/workflows/deploy-reactions-worker.yml", root), "utf8");
  assertWorkflowTopLevelIsIndented(workflow);
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /env\.CLOUDFLARE_API_TOKEN == ''/);
  assert.match(workflow, /::notice::Cloudflare production credentials/);
  assert.match(workflow, /npm run typecheck:worker && npm run test:worker/);
  assert.match(workflow, /d1 migrations apply plug-solutions-reactions --remote/);
  assert.match(workflow, /d1 execute plug-solutions-reactions --remote --file/);
  assert.match(workflow, /manifest-sql\.mjs/);
  assert.match(workflow, /npx --yes wrangler@4 deploy/);
  assert.doesNotMatch(workflow, /^\s+push:\s*$/m);

  const worker = await readFile(new URL("worker/src/index.mjs", root), "utf8");
  assert.match(worker, /access-control-allow-origin/);
  assert.match(worker, /DAILY_REACTION_CAP = 5000/);
  assert.match(worker, /SHA-256|subtle\.digest/);
  assert.doesNotMatch(worker, /console\.log|console\.error/);

  const panel = await readFile(new URL("app/ReactionPanel.tsx", root), "utf8");
  assert.match(panel, /localStorage/);
  assert.match(panel, /disabled=\{/);
  assert.match(panel, /NEXT_PUBLIC_REACTIONS_API_URL/);
});
