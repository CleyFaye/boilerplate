import eslintConfig from "@keeex/eslint-config";

export default await eslintConfig({
  "environments": "node",
  "mocha": false,
  "react": false,
  "typescript": true,
});
