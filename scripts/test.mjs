import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Server-only modules need React's server condition. Navigation imports client
// icon components and must run with React's normal client exports instead.
const clientTests = ["workspace-navigation.test.mjs"];
const tests = readdirSync(new URL("../tests/", import.meta.url)).filter((name) => name.endsWith(".test.mjs"));
for (const [condition, group] of [
  [["--conditions=react-server"], tests.filter((name) => !clientTests.includes(name))],
  [[], tests.filter((name) => clientTests.includes(name))],
]) {
  const result = spawnSync(process.execPath, [...condition, "--test", ...group.map((name) => `tests/${name}`)], { stdio: "inherit", cwd: new URL("../", import.meta.url) });
  if (result.error || result.status !== 0) {
    console.error("Test group failed.");
    process.exit(result.status || 1);
  }
}
