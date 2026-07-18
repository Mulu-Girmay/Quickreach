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

const run = async () => {
  const { email, password, role = "dispatcher", name } = parseArgs();

  if (!email || !password) {
    console.error(
      'Usage: node src/scripts/createPrivilegedUser.js --email=you@example.com --password=SomeStrongPassword123 --role=admin [--name="Your Name"]',
    );
    process.exit(1);
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

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 10);
  const displayName = name || email.split("@")[0];

  const existing = await Volunteer.findOne({ email });

  const user = await Volunteer.findOneAndUpdate(
    { email },
    {
      $set: {
        name: displayName,
        role: normalizedRole,
        password: hashedPassword,
      },
    },
    { upsert: true, new: true },
  );

  if (existing) {
    console.log(
      ` Updated existing account "${email}" -> role: ${normalizedRole}`,
    );
  } else {
    console.log(` Created new account "${email}" with role: ${normalizedRole}`);
  }
  console.log({
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(" Failed to create/update user:", err.message);
  process.exit(1);
});
