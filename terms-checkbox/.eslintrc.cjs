/** @type {import('@types/eslint').Linter.FlatConfig} */
module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error", "log"] }],
  },
};
