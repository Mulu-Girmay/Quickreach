const { Volunteer } = require("../models");

// Demo accounts use a known, publicly-documented password. That's fine for
// local dev/staging demos, but if this ran in production it would be a
// standing backdoor — anyone who reads this file (it's on GitHub) could log
// in as a dispatcher. Gate it behind NODE_ENV so it never runs against a
// real deployment by accident.
const DEMO_SEEDING_ENABLED = process.env.NODE_ENV !== "production";

const seedDemoAccounts = async () => {
  if (!DEMO_SEEDING_ENABLED) {
    console.log(
      "ℹ️ Skipping demo account seeding (NODE_ENV=production). " +
        "Set NODE_ENV to something other than 'production' if you intended to seed demo logins.",
    );
    // Still keep indexes in sync even when we skip seeding.
    try {
      await Volunteer.syncIndexes();
    } catch (error) {
      console.warn("⚠️ Volunteer index sync skipped:", error.message);
    }
    return;
  }

  const bcrypt = require("bcryptjs");
  const demoPassword = process.env.DEMO_ACCOUNTS_PASSWORD || "password123";
  const demoAccounts = [
    {
      email: "dispatcher@quickreach.demo",
      password: demoPassword,
      role: "dispatcher",
      name: "HQ Commander",
    },
    {
      email: "volunteer@quickreach.demo",
      password: demoPassword,
      role: "volunteer",
      name: "Demo Volunteer",
    },
  ];

  console.warn(
    `⚠️ Seeding demo accounts (NODE_ENV=${process.env.NODE_ENV || "undefined"}). ` +
      "These are well-known credentials — never enable this in production.",
  );

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
