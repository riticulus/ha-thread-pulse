// ESLint checks the assembled card (dist/ha-thread-pulse.js): the files in src/ are parts of one function and cannot
// be checked alone. Run it with `npm run lint` – tools/lint.mjs maps every message back to the file in src/.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["dist/ha-thread-pulse.js"],
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
