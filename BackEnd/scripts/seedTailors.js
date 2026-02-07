require("dotenv").config();
const mongoose = require("mongoose");

const Tailor = require("../models/Tailor");
const { tailors } = require("../models/dataStore");

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing in .env");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected for seeding");

  // overwrite to avoid duplicates
  await Tailor.deleteMany({});
  await Tailor.insertMany(tailors);

  console.log(`✅ Seeded ${tailors.length} tailors into MongoDB`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
