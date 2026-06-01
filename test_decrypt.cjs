const { decrypt } = require("./server/src/utils/encryption.js");
require("dotenv").config({ path: "server/.env" });
const ciphertext = "v1:gcm:a02a19ae8a0e138cf430b563:58cf1207bab9460a08737686f7eda382:0:f1b8a514d7c865db2650080fb05fcecb"; // Example ciphertext.
// Avoid printing secrets to stdout. Log only presence of the secret.
console.log("JWT_SECRET set:", !!process.env.JWT_SECRET);
