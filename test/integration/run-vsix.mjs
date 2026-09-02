import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const requested = process.env.VSIX_PATH;
const vsix = requested
  ? path.resolve(root, requested)
  : path.join(
      root,
      (await readdir(root)).find((name) => /^status-bar-tasks(?:-.*)?\.vsix$/.test(name)) || "",
    );
if (!vsix.endsWith(".vsix")) {
  throw new Error("Build the VSIX before running the packaged smoke test.");
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "sbt-vsix-"));
const dataDir = path.join(tempRoot, "data");
const extensionsDir = path.join(tempRoot, "ext");
const version = process.env.VSCODE_TEST_VERSION || "stable";
const vscodeExecutablePath = await downloadAndUnzipVSCode(version);
const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(
  vscodeExecutablePath,
  { reuseMachineInstall: true },
);
const install = spawnSync(
  cli,
  [
    ...cliArgs,
    "--install-extension",
    vsix,
    "--force",
    "--extensions-dir",
    extensionsDir,
    "--user-data-dir",
    dataDir,
  ],
  {
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);
if (install.status !== 0) {
  throw new Error("VSIX installation failed.");
}

const launchArgs = [
  path.join(root, "test-workspace", "multi-root.code-workspace"),
  "--skip-welcome",
  "--skip-release-notes",
  "--user-data-dir",
  dataDir,
  "--extensions-dir",
  extensionsDir,
];
if (process.platform === "linux") {
  launchArgs.push("--disable-gpu");
  if (process.env.CI) launchArgs.push("--no-sandbox");
}

try {
  await runTests({
    vscodeExecutablePath,
    reuseMachineInstall: true,
    extensionDevelopmentPath: path.join(root, "test", "runner"),
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
