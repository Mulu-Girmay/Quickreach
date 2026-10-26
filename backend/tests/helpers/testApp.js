const { createApp } = require("../../src/app");
const { generateToken } = require("../../src/lib/auth");
const { Volunteer } = require("../../src/models");

const buildApp = () => createApp();

const createUser = async (overrides = {}) => {
  const user = await Volunteer.create({
    name: "Test User",
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "hashedpassword123",
    role: "volunteer",
    approval_status: "approved",
    is_active: true,
    ...overrides,
  });
  const token = generateToken(user);
  return { user, token };
};

module.exports = { buildApp, createUser };
