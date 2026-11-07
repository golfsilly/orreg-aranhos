import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function validate(overrides) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", "import { cliEnv } from './lib/cli-env.ts'; void cliEnv.DATABASE_URL;"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "", BOOTSTRAP_EMAIL: "", BOOTSTRAP_NAME: "", BOOTSTRAP_PASSWORD: "", ...overrides },
    encoding: "utf8",
  });
}

test("CLI environment accepts missing database for generation and validates supplied values", () => {
  assert.equal(validate({}).status, 0);
  assert.equal(validate({ DATABASE_URL: "mysql://test:test@localhost/test" }).status, 0);
  assert.notEqual(validate({ DATABASE_URL: "not-a-url" }).status, 0);
  assert.notEqual(validate({ BOOTSTRAP_PASSWORD: "short" }).status, 0);
  assert.equal(validate({ BOOTSTRAP_PASSWORD: "123456" }).status, 0);
});
