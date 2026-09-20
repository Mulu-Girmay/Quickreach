module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/helpers/env.js"],
  verbose: true,
  testTimeout: 20000,
  forceExit: true,
  clearMocks: true,
};