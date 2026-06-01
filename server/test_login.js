/* eslint-disable no-console */
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./src/database/db.js";
import { registerUserAndIssueToken, loginUser } from "./src/modules/auth/service.js";
import User from "./src/database/models/User.js";

dotenv.config({ path: '.env' });

async function run() {
  await connectDB();

  const email = "test_login_bug@example.com";
  const password = "Password123!";

  // cleanup
  const existing = await User.find({});
  for (let u of existing) {
    if (u.get('email') === email) {
       await User.deleteOne({ _id: u._id });
    }
  }

  console.log("Registering user...");
  try {
    await registerUserAndIssueToken({
      name: "Test User",
      email: email,
      password: password,
      role: "student"
    });
    console.log("Registered!");
  } catch (e) {
    console.error("Register Error:", e.message);
  }

  console.log("Attempting login...");
  try {
    const result = await loginUser(" Test_Login_Bug@example.com ", password);
    console.log("Login Success!");
  } catch (e) {
    console.error("Login Error:", e.message);
  }

  await mongoose.disconnect();
}

run();
