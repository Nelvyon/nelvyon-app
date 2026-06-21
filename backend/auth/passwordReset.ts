import crypto from "node:crypto";

import { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";
import { getAuthService } from "./AuthService";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000;

export type ResetPasswordResult = "ok" | "invalid" | "expired";

export async function requestPasswordReset(email: string): Promise<void> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return;
  }

  const db = DbClient.getInstance();
  const rows = await db.query<{ user_id: string; email: string; full_name: string }>(
    `SELECT user_id, email, full_name
     FROM nelvyon_users
     WHERE email = $1
     LIMIT 1`,
    [trimmedEmail],
  );
  const row = rows[0];
  if (!row) {
    return;
  }

  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await db.query(
    `UPDATE nelvyon_users
     SET password_reset_token = $1,
         password_reset_expires = $2,
         updated_at = now()
     WHERE user_id = $3`,
    [token, expiresAt.toISOString(), row.user_id],
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail("password_reset", {
    email: row.email,
    name: row.full_name,
    appUrl,
    resetUrl,
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ResetPasswordResult> {
  if (!token || token.length < 16) {
    return "invalid";
  }
  if (newPassword.length < 8) {
    return "invalid";
  }

  const db = DbClient.getInstance();
  const rows = await db.query<{ user_id: string; password_reset_expires: string | null }>(
    `SELECT user_id, password_reset_expires
     FROM nelvyon_users
     WHERE password_reset_token = $1
     LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) {
    return "invalid";
  }

  const exp = row.password_reset_expires;
  if (!exp || new Date(exp).getTime() < Date.now()) {
    return "expired";
  }

  const passwordHash = await getAuthService().hashPassword(newPassword);
  await db.query(
    `UPDATE nelvyon_users
     SET password_hash = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         updated_at = now()
     WHERE user_id = $2`,
    [passwordHash, row.user_id],
  );

  return "ok";
}
