/**
 * Fail-closed readers for ADR-062 dual-write transition.
 * Dual-write is PREPARED_OFF until CEO cutover — defaults are OFF.
 */

function isExactOne(raw: string | undefined): boolean {
  return (raw ?? "").trim() === "1";
}

/** NELVYON_ERP_RELATIONAL_DUAL_WRITE — default off unless exactly "1". */
export function isErpRelationalDualWriteEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isExactOne(env.NELVYON_ERP_RELATIONAL_DUAL_WRITE);
}

/** NELVYON_ERP_RELATIONAL_READ — default off unless exactly "1". */
export function isErpRelationalReadEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isExactOne(env.NELVYON_ERP_RELATIONAL_READ);
}

/**
 * Read flip requires dual-write. Misconfig (READ without DUAL_WRITE) → both treated off.
 */
export function resolveErpRelationalMode(env: NodeJS.ProcessEnv = process.env): {
  dualWrite: boolean;
  read: boolean;
  misconfigured: boolean;
} {
  const dualWrite = isErpRelationalDualWriteEnabled(env);
  const readRequested = isErpRelationalReadEnabled(env);
  const misconfigured = readRequested && !dualWrite;
  return {
    dualWrite,
    read: dualWrite && readRequested,
    misconfigured,
  };
}
