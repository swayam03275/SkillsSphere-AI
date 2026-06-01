require("dotenv").config({ path: "server/.env" });
const mongoose = require("mongoose");
const { encryptDeterministic } = require("./server/src/utils/encryption.js");

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Try querying natively without mongoose hooks:
  const emailLower = "testauth4@gmail.com".toLowerCase().trim();
  const encryptedEmail = encryptDeterministic(emailLower);
  console.log("Encrypted email:", encryptedEmail);
  
  const rawUser = await mongoose.connection.collection("users").findOne({ email: encryptedEmail });
  console.log("Raw user found:", !!rawUser);

  process.exit(0);
}
test().catch(console.error);
