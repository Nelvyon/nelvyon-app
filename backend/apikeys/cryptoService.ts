import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const raw = process.env.API_KEYS_ENCRYPTION_SECRET ?? "";
  if (raw.length < 32) {
    const padded = raw.padEnd(32, "0");
    return Buffer.from(padded, "utf8").subarray(0, KEY_LENGTH);
  }
  return Buffer.from(raw, "utf8").subarray(0, KEY_LENGTH);
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
