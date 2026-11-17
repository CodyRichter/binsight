// Lint rules for the frontend. The limits here are the ones stated in
// AGENTS.md; change them there first.
import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import tseslint from "typescript-eslint";

const sizeLimit = (max) => ["error", { max, skipBlankLines: true, skipComments: true }];

const design = (section) => `docs/design-language.md, ${section}.`;

const importPatterns = [
  {
    group: ["@/features/*/*"],
    message: "Import from the feature's index file, not its internals.",
  },
  {
    regex: "^(\\.\\./){2,}",
    message: "Reach other folders through the @/ alias.",
  },
];

const importPaths = [
  {
    name: "@mantine/core",
    importNames: ["Card", "Skeleton", "Stepper", "Accordion", "Tooltip", "Alert", "Blockquote"],
    message: `The design has no place for this component: ${design("Building it with Mantine")}`,
  },
  { name: "@mantine/carousel", message: design("Building it with Mantine") },
  { name: "@mantine/spotlight", message: design("Building it with Mantine") },
];

const hexColor = "#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b";
const hexColorRules = [
  {
    selector: `Literal[value=/${hexColor}/]`,
    message: `Colors come from src/lib/theme/tokens.ts: ${design("Tokens")}`,
  },
  {
    selector: `TemplateElement[value.raw=/${hexColor}/]`,
    message: `Colors come from src/lib/theme/tokens.ts: ${design("Tokens")}`,
  },
];

const pageStyleRules = [
  {
    selector: "JSXAttribute[name.name=/^(style|fz|fw|lh|lts|gradient|description)$/]",
    message: `Pages and features do not style text or add help text: ${design("Building it with Mantine")}`,
  },
  {
    selector:
      "JSXOpeningElement[name.name=/^(Button|ActionIcon|TextInput|Textarea)$/] > JSXAttribute[name.name='size']",
    message: `Buttons and inputs have one size, set in the theme: ${design("Building it with Mantine")}`,
  },
  {
    selector: "JSXAttribute[name.name='variant'][value.value=/^(light|gradient)$/]",
    message: `No light or gradient variants: ${design("Building it with Mantine")}`,
  },
  {
    selector: "JSXOpeningElement[name.name=/^Icon/] > JSXAttribute[name.name='stroke']",
    message: `Icon stroke is set once in the theme: ${design("Icons and motion")}`,
  },
  {
    selector:
      "JSXOpeningElement:not([name.object.name='Menu'][name.property.name='Item']) > JSXAttribute[name.name='color']",
    message: `Only a destructive menu row takes a color, color="danger": ${design("Building it with Mantine")}`,
  },
  {
    selector:
      "JSXOpeningElement[name.object.name='Menu'][name.property.name='Item'] > JSXAttribute[name.name='color']:not([value.value='danger'])",
    message: `Only a destructive menu row takes a color, color="danger": ${design("Building it with Mantine")}`,
  },
  {
    selector: "JSXAttribute Literal[value=/\\dpx/]",
    message: `Use theme keys, not pixel sizes: ${design("Building it with Mantine")}`,
  },
  {
    selector: "JSXAttribute TemplateElement[value.raw=/\\dpx/]",
    message: `Use theme keys, not pixel sizes: ${design("Building it with Mantine")}`,
  },
];

const layoutRules = [
  {
    selector:
      "JSXOpeningElement[name.name=/^(Stack|Box|Group|Flex|Grid|SimpleGrid|Container|Space|Center)$/]",
    message: `Components own all spacing; a page arranges them: ${design("Vertical rhythm")}`,
  },
  {
    selector:
      "JSXAttribute[name.name=/^(gap|rowGap|columnGap|m|mx|my|mt|mb|ml|mr|ms|me|p|px|py|pt|pb|pl|pr|ps|pe)$/]",
    message: `Components own all spacing; a page arranges them: ${design("Vertical rhythm")}`,
  },
];

const templateSpecimens = ["DesignFrame", "ListSpecimen", "TaskSpecimen"].map(
  (name) => `src/features/design/${name}.tsx`,
);

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "src/types/api.generated.ts"] },
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
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "@eslint-community/eslint-comments/require-description": "error",
      "no-restricted-imports": ["error", { paths: importPaths, patterns: importPatterns }],
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
    files: ["**/*.test.tsx"],
    rules: { "max-lines": sizeLimit(300), "max-lines-per-function": sizeLimit(40) },
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
  {
    files: ["src/**"],
    ignores: ["src/lib/theme/tokens.ts"],
    rules: { "no-restricted-syntax": ["error", ...hexColorRules] },
  },
  // These replace the rules above for the same files, so they repeat what they extend.
  {
    files: ["src/features/**", "src/pages/**"],
    rules: {
      "no-restricted-syntax": ["error", ...hexColorRules, ...pageStyleRules],
      "no-restricted-imports": [
        "error",
        {
          paths: importPaths,
          patterns: [
            ...importPatterns,
            {
              group: ["*.css"],
              message: `Custom CSS lives only in src/components/: ${design("Building it with Mantine")}`,
            },
          ],
        },
      ],
    },
  },
  // Pages and the template specimens a real page copies set no spacing of their own.
  {
    files: ["src/pages/**", ...templateSpecimens],
    rules: {
      "no-restricted-syntax": ["error", ...hexColorRules, ...pageStyleRules, ...layoutRules],
    },
  },
);
