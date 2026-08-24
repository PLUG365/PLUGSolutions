import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("pull requests run CI without access to production secrets", async () => {
  const workflow = await readFile(new URL(".github/workflows/ci.yml", root), "utf8");

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
  assert.doesNotMatch(workflow, /^\s+skip_api_build:/m);
  assert.doesNotMatch(workflow, /^\s*workflow_run:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:\s*$/m);
});
