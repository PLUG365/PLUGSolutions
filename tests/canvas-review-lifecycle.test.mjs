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
}
