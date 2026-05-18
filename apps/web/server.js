/**
 * Railway production entry (repo root: node apps/web/server.js).
 * Runs the Next.js standalone server from build:prod output.
 */
process.env.HOSTNAME = process.env.HOSTNAME ?? "0.0.0.0";
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./.next/standalone/apps/web/server.js");
