/* eslint-disable no-console */
import connectDB from "./src/database/db.js";
import app from "./src/app.js"; // Assuming Express app is exported
import request from "supertest";

async function run() {
  await connectDB();
  const server = app.listen(0);

  const email = "api_test@example.com";
  const password = "Password123!";

  console.log("Registering via API...");
  const regRes = await request(server)
    .post("/api/auth/register")
    .send({
      name: "API Test User",
      email,
      password,
      role: "student"
    });
  
  console.log("Register Status:", regRes.status);
  console.log("Register Body:", regRes.body);

  console.log("Logging in via API...");
  const loginRes = await request(server)
    .post("/api/auth/login")
    .send({
      email,
      password
    });
  
  console.log("Login Status:", loginRes.status);
  console.log("Login Body:", loginRes.body);

  server.close();
  process.exit(0);
}

run();
