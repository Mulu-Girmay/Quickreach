const bcrypt = require("bcryptjs");
const { connectDB, mongoose } = require("../lib/mongodb");
const { Volunteer } = require("../models");

const ALLOWED_ROLES = ["citizen", "volunteer", "dispatcher", "admin"];

const parseArgs = () => {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
};

const seedUser = async ({
  email,
  password,
  role,
  name,
  forceReset = false,
}) => {
  const normalizedRole = String(role).toLowerCase();
  const displayName = name || email.split("@")[0];

  const existing = await Volunteer.findOne({ email });

  if (existing && !forceReset) {
    console.log(
      `✓ Account "${email}" already exists with role "${existing.role}". Preserving existing credentials (idempotent).`,
    );
    return existing;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await Volunteer.findOneAndUpdate(
    { email },
    {
      $set: {
        name: displayName,
        role: normalizedRole,
        password: hashedPassword,
        approval_status: "approved",
        is_active: true,
      },
    },
    { upsert: true, new: true },
  );

  if (existing) {
    console.log(
      `✓ Updated existing account "${email}" -> role: ${normalizedRole} (credentials reset).`,
    );
  } else {
    console.log(`✓ Created new account "${email}" with role: ${normalizedRole}`);
  }
  console.log({
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  return user;
};

const run = async () => {
  const args = parseArgs();
  const {
    email,
    password,
    role = "dispatcher",
    name,
    force = false,
    "reset-password": resetPassword,
  } = args;
  const forceReset = force === "true" || force === true || resetPassword === "true";

  await connectDB();

  // If run with no arguments (e.g. `npm run seed`), seed default demo dispatcher and volunteer idempotently
  if (!email || !password) {
    if (!email && !password) {
      const dispatcherEmail =
        process.env.DISPATCHER_SEED_EMAIL || "dispatcher@quickreach.com";
      const defaultPassword =
        process.env.DISPATCHER_SEED_PASSWORD ||
        process.env.DEMO_ACCOUNTS_PASSWORD ||
        "password123";
      const dispatcherName = process.env.DISPATCHER_SEED_NAME || "Lead Dispatcher";

      const volunteerEmail =
        process.env.VOLUNTEER_SEED_EMAIL || "volunteer@quickreach.com";
      const volunteerPassword =
        process.env.VOLUNTEER_SEED_PASSWORD ||
        process.env.DEMO_ACCOUNTS_PASSWORD ||
        "password123";
      const volunteerName =
        process.env.VOLUNTEER_SEED_NAME || "Certified First Responder";

      console.log(
        "Seeding initial accounts idempotently (run with --force=true to reset passwords)...\n",
      );

      await seedUser({
        email: dispatcherEmail,
        password: defaultPassword,
        role: "dispatcher",
        name: dispatcherName,
        forceReset,
      });

      console.log("");

      await seedUser({
        email: volunteerEmail,
        password: volunteerPassword,
        role: "volunteer",
        name: volunteerName,
        forceReset,
      });

      console.log("\n💡 Credentials overview:");
      console.log(`   Dispatcher: ${dispatcherEmail} (password: ${defaultPassword})`);
      console.log(`   Volunteer:  ${volunteerEmail} (password: ${volunteerPassword})`);

      await mongoose.disconnect();
      process.exit(0);
    } else {
      console.error(
        'Usage: node src/scripts/createPrivilegedUser.js --email=you@example.com --password=SomeStrongPassword123 --role=dispatcher [--name="Your Name"] [--force=true]',
      );
      process.exit(1);
    }
  }

  const normalizedRole = String(role).toLowerCase();
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    console.error(
      `Invalid role "${role}". Must be one of: ${ALLOWED_ROLES.join(", ")}`,
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await seedUser({
    email,
    password,
    role: normalizedRole,
    name,
    forceReset,
  });

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed to create/update user:", err.message);
  process.exit(1);
});

