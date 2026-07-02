/**
 * Elite gate exit — zero tolerance: any WARN or CRITICAL fails the smoke.
 */
export function finishSmokeGate({ critical, warn, passLabel = "ALL_PASS" }) {
  console.log(`critical=${critical.length} warnings=${warn.length}`);
  for (const w of warn) {
    console.log(`  WARN [${w.module}] ${w.check}: ${w.detail}`);
  }
  for (const f of critical) {
    console.log(`  FAIL [${f.module}] ${f.check}: ${f.detail}`);
  }
  if (critical.length === 0 && warn.length === 0) {
    console.log(passLabel);
    return 0;
  }
  console.log(critical.length > 0 ? "CRITICAL_FAIL" : "WARN_FAIL");
  return 1;
}
