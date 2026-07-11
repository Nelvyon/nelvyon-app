import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";

import { getLocalAiConfig } from "./config";

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32);
}

export class LocalAiBackupService {
  constructor(private readonly cfg = getLocalAiConfig()) {}

  async ensureBackupDir(): Promise<string> {
    const dir = path.resolve(this.cfg.backupDir);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /** Plain pg_dump to local file (gzip). Uses docker exec when LOCAL_AI_DOCKER_CONTAINER is set. */
  async createDump(): Promise<string> {
    const dir = await this.ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const out = path.join(dir, `local_ai_${stamp}.sql.gz`);
    const tmp = out.replace(".gz", "");
    const dumpInContainer = `/tmp/local_ai_${stamp}.sql`;

    execSync(
      `docker exec ${this.cfg.dockerContainer} pg_dump -U nelvyon_local -d nelvyon_local_ai --no-owner -f ${dumpInContainer}`,
      { stdio: "pipe" },
    );
    execSync(`docker cp ${this.cfg.dockerContainer}:${dumpInContainer} "${tmp}"`, { stdio: "pipe" });
    execSync(`docker exec ${this.cfg.dockerContainer} rm -f ${dumpInContainer}`, { stdio: "ignore" });
    await pipeline(createReadStream(tmp), createGzip(), createWriteStream(out));
    await fs.unlink(tmp);
    return out;
  }

  /** AES-256-GCM encrypted backup (owner passphrase). */
  async createEncryptedDump(passphrase: string): Promise<string> {
    const plain = await this.createDump();
    const encPath = plain.replace(".sql.gz", ".enc");
    const data = await fs.readFile(plain);
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveKey(passphrase, salt);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    const bundle = Buffer.concat([salt, iv, tag, encrypted]);
    await fs.writeFile(encPath, bundle);
    await fs.unlink(plain);
    return encPath;
  }

  async restoreDump(dumpPath: string, targetUrl?: string): Promise<void> {
    const url = targetUrl ?? this.cfg.databaseUrl;
    const containerPath = `/tmp/local_ai_restore_${Date.now()}.sql`;
    const isGz = dumpPath.endsWith(".gz");
    const plainPath = isGz ? dumpPath.replace(/\.gz$/, ".plain.sql") : dumpPath;
    if (isGz) {
      await pipeline(createReadStream(dumpPath), createGunzip(), createWriteStream(plainPath));
    }
    execSync(`docker cp "${plainPath}" ${this.cfg.dockerContainer}:${containerPath}`, { stdio: "pipe" });
    const dbName = url.split("/").pop()?.split("?")[0] ?? "nelvyon_local_ai";
    execSync(`docker exec ${this.cfg.dockerContainer} psql -U nelvyon_local -d ${dbName} -f ${containerPath}`, {
      stdio: "inherit",
    });
    execSync(`docker exec ${this.cfg.dockerContainer} rm -f ${containerPath}`, { stdio: "ignore" });
    if (isGz) await fs.unlink(plainPath).catch(() => {});
  }
}

let _svc: LocalAiBackupService | undefined;
export function getLocalAiBackupService(): LocalAiBackupService {
  _svc ??= new LocalAiBackupService();
  return _svc;
}
