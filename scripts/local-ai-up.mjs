#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const composeDir = path.join(root, "..", "backend", "local-ai");

execSync("docker compose up -d postgres", { cwd: composeDir, stdio: "inherit" });
console.log("LOCAL_AI_UP_OK — postgres on 127.0.0.1:5434");
