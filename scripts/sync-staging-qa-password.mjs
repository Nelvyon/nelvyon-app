#!/usr/bin/env node
/**
 * Sincroniza la contraseña del usuario QA de staging con el secreto
 * STAGING_QA_PASSWORD, usando el MISMO hash que valida el login.
 *
 * Contexto: el smoke P0 falla con 401 porque la contraseña del usuario QA en la
 * base de staging y el secreto de GitHub han divergido. La recuperación por
 * email NO es una alternativa: `qa-audit-20260612@nelvyon.test` usa el TLD
 * `.test`, reservado por la RFC 2606 y sin registros MX, así que SES rechaza
 * siempre el envío.
 *
 * USO
 *   DATABASE_URL='<cadena de staging>' node scripts/sync-staging-qa-password.mjs
 *
 * En PowerShell, para que la cadena NO quede en el historial:
 *   $env:DATABASE_URL = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText
 *   node scripts/sync-staging-qa-password.mjs
 *   Remove-Item Env:\DATABASE_URL
 *
 * Este script NUNCA imprime la contraseña, el hash ni DATABASE_URL. La
 * contraseña generada se escribe SOLO en stdout del paso final, para que la
 * pegues en `gh secret set`, y jamás se guarda en disco.
 *
 * Salvaguardas antes de tocar nada:
 *   - rechaza si DATABASE_URL no parece de staging
 *   - rechaza si el usuario QA no existe o hay más de uno
 *   - actualiza ÚNICAMENTE la fila de ese user_id
 *   - verifica el login real contra staging antes de dar por bueno el cambio
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Client } from "pg";

const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const STAGING_URL = "https://ideal-victory-staging.up.railway.app";
// Mismo coste que `backend/auth/AuthService.ts`.
const BCRYPT_ROUNDS = 10;

function abortar(mensaje) {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) abortar("Falta DATABASE_URL. Ver el encabezado de este fichero.");

// --- Salvaguarda 1: que sea staging, no producción ---------------------------
const esStaging = /staging|ideal-victory/i.test(dbUrl);
const pareceProd = /prod|nelvyon\.com/i.test(dbUrl) && !esStaging;
if (!esStaging || pareceProd) {
  abortar(
    "DATABASE_URL no parece apuntar a staging. Este script solo debe ejecutarse\n" +
      "  contra la base de staging. No se ha modificado nada.",
  );
}

const cliente = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await cliente.connect();
  console.log("✓ conectado a la base de staging");

  // --- Salvaguarda 2: exactamente un usuario QA ------------------------------
  const { rows } = await cliente.query(
    "SELECT user_id, email FROM nelvyon_users WHERE email = $1",
    [QA_EMAIL],
  );
  if (rows.length === 0) abortar(`No existe el usuario ${QA_EMAIL}. Nada que sincronizar.`);
  if (rows.length > 1) abortar(`Hay ${rows.length} filas con ese email. Abortado por seguridad.`);

  const usuario = rows[0];
  console.log(`✓ usuario QA encontrado (user_id=${usuario.user_id})`);

  // --- Contraseña fuerte, nunca en disco -------------------------------------
  const contrasena = randomBytes(24).toString("base64url");
  const hash = await bcrypt.hash(contrasena, BCRYPT_ROUNDS);

  // --- Salvaguarda 3: solo esa fila -----------------------------------------
  const res = await cliente.query(
    `UPDATE nelvyon_users
        SET password_hash = $1,
            password_reset_token = NULL,
            password_reset_expires = NULL,
            updated_at = now()
      WHERE user_id = $2`,
    [hash, usuario.user_id],
  );
  if (res.rowCount !== 1) abortar(`El UPDATE afectó a ${res.rowCount} filas. Revisa la base.`);
  console.log("✓ contraseña actualizada (1 fila)");

  // --- Verificación: el login real debe funcionar ---------------------------
  const login = await fetch(`${STAGING_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: contrasena }),
  });
  if (!login.ok) {
    abortar(
      `El login de verificación devolvió ${login.status}. La contraseña se ha\n` +
        "  actualizado pero el login no la acepta: NO la pongas en el secreto todavía.",
    );
  }
  console.log("✓ login verificado contra staging\n");

  console.log("─".repeat(66));
  console.log("Ejecuta ahora, y pega la línea de abajo cuando te la pida por stdin:\n");
  console.log("  gh secret set STAGING_QA_PASSWORD\n");
  console.log("Contraseña (cópiala, no queda guardada en ningún sitio):\n");
  console.log(`  ${contrasena}\n`);
  console.log("Después limpia la pantalla:  clear   (o  cls  en Windows)");
  console.log("─".repeat(66));
} finally {
  await cliente.end().catch(() => {});
}
