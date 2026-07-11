#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const composeDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "backend", "local-ai");
execSync("docker compose down", { cwd: composeDir, stdio: "inherit" });
console.log("LOCAL_AI_DOWN_OK");
