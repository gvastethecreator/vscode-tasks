import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTests } from "@vscode/test-electron";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "sbt-"));
const launchArgs = [
  path.join(root, "test-workspace", "multi-root.code-workspace"),
  "--disable-extensions",
  "--skip-welcome",
  "--skip-release-notes",
  "--user-data-dir",
  path.join(tempRoot, "data"),
  "--extensions-dir",
  path.join(tempRoot, "ext"),
];

if (process.platform === "linux") {
  launchArgs.push("--disable-gpu");
  if (process.env.CI) launchArgs.push("--no-sandbox");
}

try {
  await runTests({
    version: process.env.VSCODE_TEST_VERSION || "stable",
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(root, "test", "integration", "suite", "index.cjs"),
    launchArgs,
  });
} finally {
  if (tempRoot.startsWith(os.tmpdir() + path.sep)) {
    await rm(tempRoot, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
}
