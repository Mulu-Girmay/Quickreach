const { connectDB, mongoose } = require("../lib/mongodb");
const { Hospital } = require("../models");

const parseArgs = () => {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
};

const run = async () => {
  const { name, lat, lng, capacity, available_beds, contact } = parseArgs();

  if (!name || lat === undefined || lng === undefined) {
    console.error(
      'Usage: node src/scripts/addHospital.js --name="Hospital Name" --lat=9.03 --lng=38.75 [--capacity=200] [--available_beds=45] [--contact="+251..."]',
    );
    process.exit(1);
  }

  await connectDB();

  const hospital = await Hospital.create({
    name,
    lat: Number(lat),
    lng: Number(lng),
    capacity: capacity !== undefined ? Number(capacity) : undefined,
    available_beds:
      available_beds !== undefined ? Number(available_beds) : undefined,
    contact,
  });

  console.log(`✅ Created hospital "${hospital.name}"`);
  console.log({
    id: hospital._id,
    lat: hospital.lat,
    lng: hospital.lng,
    capacity: hospital.capacity,
    available_beds: hospital.available_beds,
  });

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Failed to create hospital:", err.message);
  process.exit(1);
});
