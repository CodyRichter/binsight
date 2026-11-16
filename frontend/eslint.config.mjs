// Lint rules for the frontend. The limits here are the ones stated in
// AGENTS.md; change them there first.
import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import tseslint from "typescript-eslint";

const sizeLimit = (max) => ["error", { max, skipBlankLines: true, skipComments: true }];

export default tseslint.config(
  { ignores: [".next/", "out/", "build/", "node_modules/", "src/types/api.generated.ts"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  comments.recommended,
  {
    rules: {
      "max-lines": sizeLimit(300),
      "max-params": ["error", 5],
      "max-depth": ["error", 3],
      complexity: ["error", 10],
      "no-console": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "xxx"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "@eslint-community/eslint-comments/require-description": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message: "Import from the feature's index file, not its internals.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.ts"],
    rules: { "max-lines-per-function": sizeLimit(40) },
  },
  {
    files: ["**/*.tsx"],
    rules: { "max-lines": sizeLimit(150) },
  },
  {
    files: ["src/**"],
    ignores: ["src/lib/api/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call the backend through src/lib/api/." },
      ],
    },
  },
);
