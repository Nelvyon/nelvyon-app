#!/usr/bin/env node
/**
 * NELVYON Phase 2 — hardware audit (owner machine).
 * Does NOT download models. Output: JSON + human summary.
 */
import { execSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function diskFreeGb() {
  try {
    const stats = fs.statfsSync(process.cwd());
    return Math.round((stats.bfree * stats.bsize) / 1024 ** 3);
  } catch {
    return null;
  }
}

const cpus = os.cpus();
const report = {
  auditedAt: new Date().toISOString(),
  platform: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: {
    model: cpus[0]?.model ?? "unknown",
    cores: cpus.length,
    physicalCoresEstimate: Math.ceil(cpus.length / 2),
    speedMhz: cpus[0]?.speed ?? null,
  },
  ramGb: Math.round(os.totalmem() / 1024 ** 3),
  gpu: null,
  cuda: { nvcc: false, nvidiaSmi: null },
  docker: { available: false, version: null },
  diskFreeGb: diskFreeGb(),
  inferenceNotes: [] ,
};

const smi = run("nvidia-smi --query-gpu=name,driver_version,memory.total,memory.free,compute_cap --format=csv,noheader");
if (smi) {
  const [name, driver, total, free, cap] = smi.split(",").map((s) => s.trim());
  report.gpu = { name, driver, vramTotalMiB: total, vramFreeMiB: free, computeCapability: cap };
  report.cuda.nvidiaSmi = true;
}
report.cuda.nvcc = run("nvcc --version") != null;
report.docker.version = run("docker --version");
report.docker.available = Boolean(report.docker.version);

const vramMiB = report.gpu?.vramTotalMiB ? parseInt(String(report.gpu.vramTotalMiB), 10) : 0;
const ram = report.ramGb;

if (vramMiB >= 8000) report.inferenceNotes.push("7B Q4_K_M likely feasible on GPU");
else if (vramMiB >= 6000) report.inferenceNotes.push("7B Q4 marginal; prefer 3B–4B Q4 or CPU offload");
else if (vramMiB > 0) report.inferenceNotes.push("Small models only (≤3B Q4) on GPU");
else report.inferenceNotes.push("No NVIDIA GPU detected — CPU inference only (slower)");

if (ram >= 32) report.inferenceNotes.push("32GB+ RAM: comfortable CPU offload for 7B Q4");
else if (ram >= 16) report.inferenceNotes.push("16GB RAM: limit concurrent sessions; prefer 3B models");
else report.inferenceNotes.push("<16GB RAM: restrict to small models and low concurrency");

report.inferenceNotes.push("Model selection pending real benchmarks — do not pull until Phase 2 sign-off");

console.log(JSON.stringify(report, null, 2));
