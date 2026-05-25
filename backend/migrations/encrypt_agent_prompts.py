#!/usr/bin/env python3
"""
Frente 58 — Encrypt all OS agent prompts and upload to DB.

Usage (from repo root):
  set AGENT_ENCRYPTION_KEY=<64-char-hex>
  python backend/migrations/encrypt_agent_prompts.py [--rewrite] [--dry-run]

Scans backend/os-agents/**/*Agent.ts, extracts eliteRole/mission/fewShot, encrypts,
upserts into os_agent_prompts. With --rewrite, strips inline prompts from agent files.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
if str(_REPO / "backend") not in sys.path:
    sys.path.insert(0, str(_REPO / "backend"))

from sqlalchemy import text

from core.agent_encryption import encrypt_prompt
from core.database import db_manager
from services.agent_prompt_service import AgentPromptService

AGENTS_GLOB = _REPO / "backend" / "os-agents"
AGENT_ID_RE = re.compile(r'const\s+AGENT_ID\s*=\s*["\']([^"\']+)["\']')
ELITE_RE = re.compile(r'const\s+eliteRole\s*=\s*\n?\s*["`]((?:\\.|[^"`])*)["`]', re.DOTALL)
MISSION_RE = re.compile(r'const\s+mission\s*=\s*\n?\s*["`]((?:\\.|[^"`])*)["`]', re.DOTALL)
FEWSHOT_RE = re.compile(r'const\s+fewShot\s*=\s*\n?\s*["`]((?:\\.|[^"`])*)["`]', re.DOTALL)


def _unescape(s: str) -> str:
    return s.replace("\\n", "\n").replace('\\"', '"').replace("\\'", "'")


def parse_agent_file(path: Path) -> dict[str, str] | None:
    src = path.read_text(encoding="utf-8")
    aid = AGENT_ID_RE.search(src)
    if not aid:
        return None
    elite = ELITE_RE.search(src)
    mission = MISSION_RE.search(src)
    few = FEWSHOT_RE.search(src)
    if not elite and not mission:
        return None
    return {
        "agent_id": aid.group(1).strip().lower(),
        "elite_role": _unescape(elite.group(1)) if elite else "",
        "mission": _unescape(mission.group(1)) if mission else "",
        "few_shot": _unescape(few.group(1)) if few else "{}",
        "sector": path.parent.name,
        "agent_class": path.stem,
    }


def rewrite_agent_file(path: Path, agent_id: str) -> bool:
    src = path.read_text(encoding="utf-8")
    if "resolveAgentPrompts" in src:
        return False
    new_run = f"""  async run(input: RateLimitInput): Promise<RateLimitOutput> {{
    return runRateLimitAgentCore(AGENT_ID, this.llm, input, 0.1);
  }}"""
    # Generic rewrite: replace run() body with vault call
    pattern = re.compile(
        r"async run\(input:[^)]+\)[^{]*\{[\s\S]*?return run\w+AgentCore\([^;]+;\s*\}",
        re.MULTILINE,
    )
    sector = path.parent.name
    core_fn = None
    m = re.search(r"return (run\w+AgentCore)\(", src)
    if m:
        core_fn = m.group(1)
    if not core_fn:
        return False

    temp_match = re.search(r"return " + core_fn + r"\((AGENT_ID)[^)]+\)", src)
    temp = "0.1"
    if temp_match:
        temp_m = re.search(r",\s*(0\.\d+)\s*\)", src[temp_match.start() : temp_match.end() + 20])
        if temp_m:
            temp = temp_m.group(1)

    replacement = f"""async run(input: Parameters<typeof {core_fn}>[2]>[0]): Promise<ReturnType<typeof {core_fn}>> {{
    return {core_fn}(AGENT_ID, this.llm, input, {temp});
  }}"""

    if "resolveAgentPrompts" not in src:
        import_line = 'import { resolveAgentPrompts } from "../../AgentPromptVault";\n'
        if import_line.strip() not in src and "AgentPromptVault" not in src:
            # shared.ts cores will load vault — no import needed in agent file
            pass

    new_src = pattern.sub(replacement, src, count=1)
    if new_src == src:
        return False
    path.write_text(new_src, encoding="utf-8")
    return True


async def upsert_prompt(record: dict[str, str]) -> None:
    payload = json.dumps(
        {
            "elite_role": record["elite_role"],
            "mission": record["mission"],
            "few_shot": record["few_shot"],
        },
        ensure_ascii=False,
    )
    encrypted = encrypt_prompt(payload)
    async with db_manager.async_session_maker() as session:
        await AgentPromptService.ensure_schema()
        await session.execute(
            text(
                """
                INSERT INTO os_agent_prompts (agent_id, prompt_encrypted, sector, agent_class, updated_at)
                VALUES (:id, :enc, :sector, :cls, NOW())
                ON CONFLICT (agent_id) DO UPDATE SET
                    prompt_encrypted = EXCLUDED.prompt_encrypted,
                    sector = EXCLUDED.sector,
                    agent_class = EXCLUDED.agent_class,
                    updated_at = NOW()
                """
            ),
            {
                "id": record["agent_id"],
                "enc": encrypted,
                "sector": record.get("sector"),
                "cls": record.get("agent_class"),
            },
        )
        await session.commit()


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rewrite", action="store_true", help="Strip inline prompts from agent TS files")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not os.environ.get("AGENT_ENCRYPTION_KEY", "").strip():
        print("AGENT_ENCRYPTION_KEY required", file=sys.stderr)
        return 1

    await db_manager.ensure_initialized()
    files = sorted(AGENTS_GLOB.glob("**/*Agent.ts"))
    count = 0
    skipped = 0
    for path in files:
        if path.name == "BaseOsAgent.ts":
            continue
        record = parse_agent_file(path)
        if not record:
            skipped += 1
            continue
        if args.dry_run:
            print(f"would encrypt: {record['agent_id']} ({path.relative_to(_REPO)})")
        else:
            await upsert_prompt(record)
        count += 1
        if args.rewrite and not args.dry_run:
            rewrite_agent_file(path, record["agent_id"])

    print(f"Processed {count} agents, skipped {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
