/* eslint-disable no-undef */
/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
    "^.+.js?$": ["ts-jest",{}],
  },
  transformIgnorePatterns: [
    // This tells Jest to transform the psql-describe module
    '/node_modules/(?!(psql-describe)/)'
  ]
};