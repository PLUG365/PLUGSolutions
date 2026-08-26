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
  assert.match(workflow, /azure\/login@v2/);
  assert.match(workflow, /^\s+allow-no-subscriptions: true$/m);
  assert.match(workflow, /Lists.SelectedOperations.Selected|PLUG_SUBMISSIONS_LIST_ID/);
  assert.match(workflow, /gh pr create/);
  assert.match(workflow, /automation\/catalog-/);
  assert.match(workflow, /automation\/remove-/);
  assert.match(workflow, /catalog: remove/);
  assert.match(workflow, /git add -A -- "catalog\/solutions\/\$SLUG\.json"/);
  assert.match(workflow, /steps\.result\.outputs\.operation/);
  assert.match(workflow, /npm run check/);
  assert.doesNotMatch(
    workflow,
    /client-secret|AZURE_STATIC_WEB_APPS_API_TOKEN|AZURE_SUBSCRIPTION_ID|subscription-id:/,
  );
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /git push[^\n]*\bmain\b/);
});
