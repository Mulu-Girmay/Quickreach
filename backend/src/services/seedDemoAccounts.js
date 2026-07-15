const { Volunteer } = require("../models");

const seedDemoAccounts = async () => {
  const bcrypt = require("bcryptjs");
  const demoAccounts = [
    {
      email: "dispatcher@quickreach.demo",
      password: "password123",
      role: "dispatcher",
      name: "HQ Commander",
    },
    {
      email: "volunteer@quickreach.demo",
      password: "password123",
      role: "volunteer",
      name: "Demo Volunteer",
    },
  ];

  for (const account of demoAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    await Volunteer.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          name: account.name,
          role: account.role,
          password: hashedPassword,
        },
      },
      { upsert: true, new: true },
    );
  }

  try {
    await Volunteer.syncIndexes();
  } catch (error) {
    console.warn("⚠️ Volunteer index sync skipped:", error.message);
  }
};

module.exports = { seedDemoAccounts };
