/* eslint-disable no-console */
import mongoose from "mongoose";
import connectDB from "./src/database/db.js";
import User from "./src/database/models/User.js";

async function run() {
  await connectDB();
  const count = await User.countDocuments();
  console.log("Users in DB:", count);
  process.exit(0);
}
run();
