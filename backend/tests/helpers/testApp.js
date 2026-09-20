const { createApp } = require("../../src/app");
const { generateToken } = require("../../src/lib/auth");
const { Volunteer } = require("../../src/models");

/**
 * Builds a fresh app + underlying http.Server for a test file. Each call
 * re-initializes sockets/io.js's module-level `io` singleton, which is fine
 * because Jest gives every test *file* its own module registry by default.
 */
const buildApp = () => createApp();

/**
 * Creates a real Volunteer document with the given role (default
 * "volunteer", approved) and returns { user, token } so integration tests
 * can hit protected routes with a real, valid JWT instead of mocking auth.
 */
const createUser = async (overrides = {}) => {
  const user = await Volunteer.create({
    name: "Test User",
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "not-used-directly",
    role: "volunteer",
    approval_status: "approved",
    ...overrides,
  });
  const token = generateToken(user);
  return { user, token };
};

module.exports = { buildApp, createUser };