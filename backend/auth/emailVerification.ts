import crypto from "node:crypto";

import { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 48 * 60 * 60 * 1000;

export type VerifyEmailResult = "ok" | "invalid" | "expired";

export async function issueEmailVerification(userId: string, email: string, name: string): Promise<void> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const db = DbClient.getInstance();
  await db.query(
    `UPDATE nelvyon_users
     SET email_verification_token = $1,
         email_verification_expires = $2,
         email_verified = false
     WHERE user_id = $3`,
    [token, expiresAt.toISOString(), userId],
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail("email_verify", {
    email,
    name,
    appUrl,
    verifyUrl,
  });
}

export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  if (!token || token.length < 16) {
    return "invalid";
  }
  const db = DbClient.getInstance();
  const rows = await db.query<{ user_id: string; email_verification_expires: string | null }>(
    `SELECT user_id, email_verification_expires
     FROM nelvyon_users
     WHERE email_verification_token = $1
     LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) {
    return "invalid";
  }
  const exp = row.email_verification_expires;
  if (!exp || new Date(exp).getTime() < Date.now()) {
    return "expired";
  }
  await db.query(
    `UPDATE nelvyon_users
     SET email_verified = true,
         email_verification_token = NULL,
         email_verification_expires = NULL,
         updated_at = now()
     WHERE user_id = $1`,
    [row.user_id],
  );
  return "ok";
}
