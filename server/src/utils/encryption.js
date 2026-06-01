import crypto from "crypto";

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "default_super_secret_key_skills_sphere";
  // Always derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a value non-deterministically using AES-256-GCM.
 * Suitable for fields that are NOT queried by exact match.
 * Supports strings, arrays, and objects.
 * 
 * @param {string|Object|Array} val - Value to encrypt
 * @returns {string} Encrypted ciphertext string
 */
export const encrypt = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" && val.startsWith("v1:")) return val;
  
  const stringText = typeof val === "string" ? val : JSON.stringify(val);
  const isJson = typeof val !== "string";

  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(stringText, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: v1:gcm:<iv>:<authTag>:<isJson>:<encrypted>
  return `v1:gcm:${iv.toString("hex")}:${authTag}:${isJson ? "1" : "0"}:${encrypted}`;
};

/**
 * Encrypts a value deterministically using AES-256-CBC.
 * Suitable for fields that ARE queried by exact match (e.g. emails).
 * Supports strings, arrays, and objects.
 * 
 * @param {string|Object|Array} val - Value to encrypt
 * @returns {string} Encrypted ciphertext string
 */
export const encryptDeterministic = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" && val.startsWith("v1:")) return val;

  const stringText = typeof val === "string" ? val : JSON.stringify(val);
  const isJson = typeof val !== "string";

  const key = getEncryptionKey();
  // Derive IV deterministically from the plaintext using HMAC-SHA256
  const iv = crypto
    .createHmac("sha256", key)
    .update(stringText)
    .digest()
    .slice(0, 16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(stringText, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Format: v1:cbc:<iv>:<isJson>:<encrypted>
  return `v1:cbc:${iv.toString("hex")}:${isJson ? "1" : "0"}:${encrypted}`;
};

/**
 * Decrypts a ciphertext string back to its original type (string or object/array).
 * Detects the mode (GCM or CBC) automatically.
 * Returns the original value if it is not encrypted.
 * 
 * @param {string} ciphertext - Encrypted ciphertext string
 * @returns {any} Decrypted value
 */
export const decrypt = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== "string") return ciphertext;
  if (!ciphertext.startsWith("v1:")) return ciphertext; // Return plain text if not encrypted

  try {
    const parts = ciphertext.split(":");
    const mode = parts[1];
    const key = getEncryptionKey();

    if (mode === "gcm") {
      const iv = Buffer.from(parts[2], "hex");
      const authTag = Buffer.from(parts[3], "hex");
      const isJson = parts[4] === "1";
      const encrypted = parts[5];

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return isJson ? JSON.parse(decrypted) : decrypted;
    } else if (mode === "cbc") {
      const iv = Buffer.from(parts[2], "hex");
      const isJson = parts[3] === "1";
      const encrypted = parts[4];

      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return isJson ? JSON.parse(decrypted) : decrypted;
    }
  } catch (error) {
    // If decryption fails, return the original text (fallback)
    return ciphertext;
  }
  return ciphertext;
};
