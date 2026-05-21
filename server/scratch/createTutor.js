import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/database/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/skillsphere";

async function run() {
  console.log("Connecting to MongoDB at:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const email = "tutor@test.com";
  const plainPassword = "assowrd123"; // exactly as requested
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  // Upsert the user
  const user = await User.findOneAndUpdate(
    { email },
    {
      name: "Expert Tutor",
      password: hashedPassword,
      role: "tutor",
      isVerified: true,
      provider: "local",
    },
    { new: true, upsert: true }
  );

  console.log("Successfully created/updated Tutor user:");
  console.log("ID:", user._id);
  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("isVerified:", user.isVerified);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch((err) => {
  console.error("Error creating tutor user:", err);
  process.exit(1);
});
