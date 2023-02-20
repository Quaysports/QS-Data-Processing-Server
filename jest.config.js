/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.m?js$": "babel-jest"
  },
  resetMocks: true,
};