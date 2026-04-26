import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toLocaleString'][arguments.length=0]",
          message:
            "Avoid local-time Date formatting. Use formatUtcDateTime from lib/time/utc or pass explicit UTC options.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString'][arguments.length=0]",
          message:
            "Avoid local-time Date formatting. Use a UTC formatter (timeZone: 'UTC') for all date displays.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleTimeString'][arguments.length=0]",
          message:
            "Avoid local-time Date formatting. Use a UTC formatter (timeZone: 'UTC') for all time displays.",
        },
      ],
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
