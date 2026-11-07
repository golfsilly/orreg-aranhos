import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx,js,jsx}", "features/**/*.{ts,tsx,js,jsx}", "components/**/*.{ts,tsx,js,jsx}", "lib/**/*.{ts,tsx,js,mjs,cjs}", "scripts/**/*.{ts,js,mjs,cjs}", "*.config.{ts,js,mjs,cjs}"],
    ignores: ["lib/env.ts", "lib/cli-env.ts"],
    rules: {
      "no-restricted-properties": ["error", { object: "process", property: "env", message: "Use the validated T3 Env schema in lib/env.ts or lib/cli-env.ts." }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
