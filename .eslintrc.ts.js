module.exports = {
  extendsBase: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "no-extra-parens": "off",
    "@typescript-eslint/no-extra-parens": [
      "warn",
      "functions",
    ],
    "default-param-last": "off",
    "@typescript-eslint/default-param-last": ["error"],
  },
};
