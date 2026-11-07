import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

function pageDirectories(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const result = entries.some((entry) => entry.isFile() && entry.name === "page.tsx") ? [directory] : [];
  for (const entry of entries) if (entry.isDirectory() && entry.name !== "api") result.push(...pageDirectories(join(directory, entry.name)));
  return result;
}

test("every page has its own feature-based loading skeleton and clean route folder", () => {
  const root = join(process.cwd(), "app");
  const directories = pageDirectories(root);
  assert.ok(directories.length > 0);
  for (const directory of directories) {
    const label = relative(root, directory) || "/";
    const files = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
    assert.ok(files.includes("loading.tsx"), `${label} is missing loading.tsx`);
    assert.match(readFileSync(join(directory, "loading.tsx"), "utf8"), /@\/features\/.+skeleton/, `${label} must use a feature skeleton`);
    if (directory !== root) {
      assert.deepEqual(files.filter((file) => /\.(?:tsx?|jsx?)$/.test(file)).sort(), ["loading.tsx", "page.tsx"], `${label} must keep components outside its route folder`);
      assert.match(readFileSync(join(directory, "page.tsx"), "utf8"), /export \{ default \} from "@\/features\//, `${label} must delegate its page implementation to a feature`);
    }
  }
});
