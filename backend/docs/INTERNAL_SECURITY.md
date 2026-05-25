# NELVYON — Internal security & obfuscation (Frente 58)

**Confidential — do not publish.** For operators and core engineers only.

## Agent prompt encryption

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_ENCRYPTION_KEY` | **Yes (prod)** | AES-256 key, **32 bytes** as 64-char hex or base64url |
| `INTERNAL_AGENT_PROMPT_SECRET` | **Yes (prod)** | Shared secret for `/api/internal/agent-prompts/*` (OS runtime) |

Generate encryption key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Migration (encrypt all OS agent prompts from `backend/os-agents/**/*Agent.ts`):

```bash
set AGENT_ENCRYPTION_KEY=<64-char-hex>
set DATABASE_URL=...
python backend/migrations/encrypt_agent_prompts.py
python backend/migrations/encrypt_agent_prompts.py --rewrite   # strip inline prompts from TS
```

- Plaintext prompts live **only** in `os_agent_prompts.prompt_encrypted` (DB).
- `decrypt_prompt()` runs at runtime in memory; **never log** decrypted output.
- Agent `.ts` files reference `agent_id` only (via `AgentPromptVault`).

## Railway — pending variables

Add to **API service** on Railway:

- `AGENT_ENCRYPTION_KEY`
- `INTERNAL_AGENT_PROMPT_SECRET`
- `WHITELABEL_CORS_ORIGINS` (comma-separated `https://app.client.com` for verified white-label domains)

## Rate limiting tiers (middleware/rate_limit.py)

| Tier | Auth | Limit |
|------|------|-------|
| 1 | Anonymous | 10 req / min |
| 2 | API key (free plan) | 100 req / hour |
| 3 | API key (paid plan) | 1000 req / hour |
| 4 | JWT session | Unlimited |

Abuse → 1h IP block. Responses use generic `Too many requests` + `Retry-After` (no limit disclosure).

## Anti-scraping

`middleware/anti_scraping.py`: bot UA detection, >100 req/min/IP, enumeration decoys (200 + empty), strips `Server` / `X-Powered-By`.

## Fine-tuned models

OpenAI `ft:…` model IDs are **internal only**. Public API returns `custom_model_active: true/false` — never the real ID.
