import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { DbClient } from "../db/DbClient";
import { sanitizeEnvValue } from "../db/envSanitize";
import { NelvyonMonitor } from "../monitoring";
import { OsAgentError } from "../os-agents/OsAgentError";
import type { AuthResult, JwtPayload, NelvyonUserRow } from "./types";

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES = "7d" as const;

export interface AuthDbPort {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

function assertJwtSecret(): string {
  const secret = sanitizeEnvValue(process.env.JWT_SECRET);
  if (secret.length === 0) {
    throw new Error(
      "AuthService: JWT_SECRET is not defined or empty. Set JWT_SECRET in the environment to a secret string of at least 32 characters.",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `AuthService: JWT_SECRET must be at least 32 characters (got ${secret.length}). Use a long random secret in production.`,
    );
  }
  return secret;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseNelvyonClaims(decoded: unknown): JwtPayload {
  if (typeof decoded !== "object" || decoded === null) {
    throw new OsAgentError("Unauthorized");
  }
  const o = decoded as Record<string, unknown>;
  if (
    typeof o.userId !== "string" ||
    typeof o.email !== "string" ||
    typeof o.tenantId !== "string" ||
    typeof o.plan !== "string"
  ) {
    throw new OsAgentError("Unauthorized");
  }
  return { userId: o.userId, email: o.email, tenantId: o.tenantId, plan: o.plan };
}

export class AuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly db: AuthDbPort,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(email: string, password: string, fullName: string): Promise<AuthResult> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      throw new OsAgentError("Invalid email format");
    }
    if (password.length < 8) {
      throw new OsAgentError("Password must be at least 8 characters");
    }
    const name = fullName.trim();
    if (name.length < 2) {
      throw new OsAgentError("Name must be at least 2 characters");
    }

    const passwordHash = await this.hashPassword(password);
    let rows: NelvyonUserRow[];
    try {
      rows = await this.db.query<NelvyonUserRow>(
        `INSERT INTO nelvyon_users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING user_id, email, password_hash, full_name, plan, tenant_id`,
        [trimmedEmail, passwordHash, name],
      );
    } catch (e: unknown) {
      NelvyonMonitor.trackAuthError(trimmedEmail, e);
      const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "23505") {
        throw new OsAgentError("Email already registered");
      }
      throw e;
    }

    const row = rows[0];
    if (!row) {
      throw new OsAgentError("Registration failed");
    }

    return this.issueTokenForUser(row);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const trimmedEmail = email.trim().toLowerCase();
    const rows = await this.db.query<NelvyonUserRow>(
      `SELECT user_id, email, password_hash, full_name, plan, tenant_id
       FROM nelvyon_users WHERE email = $1 LIMIT 1`,
      [trimmedEmail],
    );
    const row = rows[0];
    if (!row) {
      NelvyonMonitor.trackAuthError(trimmedEmail, new Error("User not found during login"));
      throw new OsAgentError("Invalid credentials");
    }
    const ok = await this.comparePassword(password, row.password_hash);
    if (!ok) {
      NelvyonMonitor.trackAuthError(trimmedEmail, new Error("Invalid password"));
      throw new OsAgentError("Invalid credentials");
    }
    return this.issueTokenForUser(row);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, { algorithms: ["HS256"] });
      return parseNelvyonClaims(decoded);
    } catch (e: unknown) {
      if (e instanceof OsAgentError) {
        throw e;
      }
      if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
        throw new OsAgentError("Unauthorized");
      }
      throw e;
    }
  }

  async getUserProfile(userId: string): Promise<{ userId: string; email: string; tenantId: string; plan: string; fullName: string } | null> {
    const rows = await this.db.query<Pick<NelvyonUserRow, "user_id" | "email" | "tenant_id" | "plan" | "full_name">>(
      `SELECT user_id, email, tenant_id, plan, full_name FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      userId: row.user_id,
      email: row.email,
      tenantId: row.tenant_id,
      plan: row.plan,
      fullName: row.full_name,
    };
  }

  private issueTokenForUser(row: NelvyonUserRow): AuthResult {
    const body: JwtPayload = {
      userId: row.user_id,
      email: row.email,
      tenantId: row.tenant_id,
      plan: row.plan,
    };
    const token = jwt.sign(body, this.jwtSecret, { expiresIn: JWT_EXPIRES, algorithm: "HS256" });
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expSec = typeof decoded?.exp === "number" ? decoded.exp : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    return {
      userId: row.user_id,
      email: row.email,
      tenantId: row.tenant_id,
      token,
      expiresAt: new Date(expSec * 1000).toISOString(),
    };
  }
}

let cachedService: AuthService | undefined;

export function getAuthService(): AuthService {
  if (!cachedService) {
    cachedService = new AuthService(assertJwtSecret(), DbClient.getInstance());
  }
  return cachedService;
}

export function resetAuthServiceForTests(): void {
  cachedService = undefined;
}
