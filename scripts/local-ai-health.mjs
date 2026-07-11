#!/usr/bin/env node
import { runLocalAiHealthCheck } from "../backend/local-ai/LocalAiHealth.ts";
import { closeLocalAiPool } from "../backend/local-ai/db.ts";

const report = await runLocalAiHealthCheck();
await closeLocalAiPool();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
