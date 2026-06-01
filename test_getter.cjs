const { encrypt } = require("./server/src/utils/encryption.js");
const mongoose = require("mongoose");
require("dotenv").config({ path: "server/.env" });

const userSchema = new mongoose.Schema({
  name: { type: String, get: val => val + "_decrypted", set: val => val + "_encrypted" }
}, { toJSON: { getters: true }, toObject: { getters: true } });
const TestUser = mongoose.model("TestUser", userSchema);

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const u = new TestUser({ name: "Alice" });
  await u.save();
  const fromDb = await TestUser.findById(u._id);
  console.log("Raw from DB using lean:", await TestUser.findById(u._id).lean());
  console.log("Accessed property:", fromDb.name);
  process.exit(0);
}
test().catch(console.error);
