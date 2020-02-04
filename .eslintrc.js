const base = require("./.eslintrc.base");
const ts = require("./.eslintrc.ts");

module.exports = {
  "parser": "@typescript-eslint/parser",
  "env": {
    "es6": true,
    "node": true
  },
  "extends": [
    ...base.extendsBase,
    ...ts.extendsBase,
  ],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    ...base.rules,
    ...ts.rules,
  }
};
