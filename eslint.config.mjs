// ESLint for the sources (ES modules, run in the browser) and the Node tools. Run `npm run lint`.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["src/**/*.js"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser } },
    rules: {
      // "try { … } catch (e) {}" is used on purpose where a missing feature (no OTBR, no ZHA, blocked storage) is fine
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.js", "eslint.config.mjs"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2024, globals: { ...globals.node } },
  },
];
