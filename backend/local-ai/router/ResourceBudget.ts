import os from "node:os";
import { spawnSync } from "node:child_process";

import type { ModelProfile } from "./ModelRegistry";
import type { ResourceEstimate } from "./types";

export type SystemSnapshot = {
  ramFreeMiB: number;
  ramTotalMiB: number;
  vramUsedMiB?: number;
  vramTotalMiB?: number;
  gpuUtilization?: number;
};

export function getSystemSnapshot(): SystemSnapshot {
  const ramFreeMiB = Math.floor(os.freemem() / (1024 * 1024));
  const ramTotalMiB = Math.floor(os.totalmem() / (1024 * 1024));
  const gpu = readGpuSnapshot();
  return { ramFreeMiB, ramTotalMiB, ...gpu };
}

let gpuCache: { at: number; data: Pick<SystemSnapshot, "vramUsedMiB" | "vramTotalMiB" | "gpuUtilization"> } | null = null;
const GPU_CACHE_MS = 3000;

function readGpuSnapshot(): Pick<SystemSnapshot, "vramUsedMiB" | "vramTotalMiB" | "gpuUtilization"> {
  const now = Date.now();
  if (gpuCache && now - gpuCache.at < GPU_CACHE_MS) return gpuCache.data;
  const r = spawnSync(
    "nvidia-smi",
    ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { encoding: "utf8", timeout: 5000 },
  );
  if (r.status !== 0 || !r.stdout.trim()) return {};
  const p = r.stdout.trim().split(",").map((s) => s.trim());
  const data = {
    vramUsedMiB: Number(p[0]) || undefined,
    vramTotalMiB: Number(p[1]) || undefined,
    gpuUtilization: Number(p[2]) || undefined,
  };
  gpuCache = { at: now, data };
  return data;
}

const MIN_RAM_MIB = Number(process.env.ROUTER_MIN_RAM_MIB ?? 2048);
const MIN_VRAM_MIB = Number(process.env.ROUTER_MIN_VRAM_MIB ?? 512);
const RAM_RESERVE_MIB = Number(process.env.ROUTER_RAM_RESERVE_MIB ?? 4096);

function reclaimVramFromUnload(loadedModel: string | null, targetModel: string): number {
  if (!loadedModel || loadedModel.startsWith(targetModel.split(":")[0]!)) return 0;
  if (loadedModel.includes("8b")) return 4200;
  if (loadedModel.includes("3b")) return 3000;
  return 0;
}

export function estimateResources(
  profile: ModelProfile,
  queueDepth: number,
  loadedModel: string | null,
): ResourceEstimate {
  const snap = getSystemSnapshot();
  const alreadyLoaded = loadedModel != null && loadedModel.startsWith(profile.model.split(":")[0]!);
  const needVram = alreadyLoaded ? 0 : profile.estimatedVramMiB;
  const needRam = profile.estimatedRamMiB;
  const reclaimMiB = reclaimVramFromUnload(loadedModel, profile.model);

  const vramFree =
    snap.vramTotalMiB != null && snap.vramUsedMiB != null
      ? snap.vramTotalMiB - snap.vramUsedMiB
      : undefined;

  const effectiveVramFree = vramFree != null ? vramFree + reclaimMiB : undefined;
  const ramOk = snap.ramFreeMiB >= needRam + MIN_RAM_MIB;
  const vramOk = effectiveVramFree == null || effectiveVramFree >= needVram + MIN_VRAM_MIB;
  const windowsSafe = snap.ramFreeMiB >= RAM_RESERVE_MIB;

  const ok = ramOk && vramOk && windowsSafe;

  return {
    ok,
    estimatedCtx: profile.defaultNumCtx,
    estimatedVramMiB: needVram,
    estimatedRamMiB: needRam,
    vramAvailableMiB: vramFree,
    ramAvailableMiB: snap.ramFreeMiB,
    modelLoaded: loadedModel,
    queueDepth,
    reason: !ok
      ? !windowsSafe
        ? "insufficient_ram_windows_reserve"
        : !vramOk
          ? "insufficient_vram"
          : "insufficient_ram"
      : undefined,
  };
}
