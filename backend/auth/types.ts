export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  plan: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  tenantId: string;
  token: string;
  expiresAt: string;
}

export interface NelvyonUserRow {
  user_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  plan: string;
  tenant_id: string;
}
