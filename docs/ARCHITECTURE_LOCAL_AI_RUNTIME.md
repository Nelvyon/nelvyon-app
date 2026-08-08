# ARCHITECTURE — Local AI runtime for agents (cost = 0)

> Status: **Mesh Option A local PASS** · Railway staging **WAITING_TS_AUTHKEY** · prod OFF · Date: **2026-07-23**  
> Constraint: no paid APIs · no Funnel/Serve/exit/subnet · **do not expose owner PC to public Internet**  
> Related: ADR-034/036/041/042 · `docs/ops/MESH_OPTION_A_STAGING.md`

---

## Goal

Make local/open-weight models reachable by **agent runtimes** (autonomous packs, OS `LlmClient`, Private AI router) without:

- `OLLAMA_HOST=http://localhost:11434` from Railway (impossible / forbidden),
- OpenAI / paid LLM defaults,
- opening the owner workstation to the public Internet,
- new monthly cloud GPU spend.

---

## Recommended architecture (0 incremental cost)

### Option A — Private mesh to owner GPU (preferred)

```
[Railway @nelvyon/web] --Tailscale/WireGuard--> [Owner GPU host: Ollama :11434]
                         private overlay only
```

| Layer | Choice |
|-------|--------|
| Network | Tailscale or WireGuard **private** — no public inbound ports on PC |
| Auth | Mesh ACL + service identity; Railway uses Tailscale IP / MagicDNS name only |
| App config | `OLLAMA_HOST=http://100.x.y.z:11434` (private) · never public DNS |
| Models | `OLLAMA_MODEL` = 3b fast · `OLLAMA_STRATEGY_MODEL` = 8b quality |
| Flags | Prod IA still **CEO-gated**; mesh can be staging-first |
| Rollback | Unset `OLLAMA_*` · leave mesh; agents fail-closed / `LLM_NOT_CONFIGURED` |

**Security:** PRIVATE_MODE still blocks public egress; Tailscale peer is allowlisted host. No Cloudflare tunnel to open web. No MFA bypass.

**Cost:** $0 if owner already has GPU + Tailscale free tier.

### Option B — Same-project private worker (only if already in Railway plan)

Ollama as **private** Railway service (`*.railway.internal`) in the same project — **only** if no new billable GPU addon. If Railway would charge GPU, **reject** and stay on Option A.

### Option C — Dev/cert only (current verified path)

Ollama on `127.0.0.1:11434` for local gates, Phase C, pack gate. Staging/prod remain IA OFF until CEO + Option A/B.

#### `OLLAMA_HOST` — formato aceptado

`OLLAMA_HOST` admite la convención **oficial de Ollama**, `host:port` sin esquema, y también una URL completa. Ambas son equivalentes:

```
OLLAMA_HOST=127.0.0.1:11434            # convención Ollama
OLLAMA_HOST=http://127.0.0.1:11434     # URL completa
```

`OLLAMA_BASE_URL` y `NELVYON_LOCAL_AI_URL` esperan URL completa. Si no hay ninguna definida, en desarrollo se asume `http://127.0.0.1:11434`; en producción queda vacío y la IA local se desactiva de forma explícita.

#### Windows: el servidor solo escucha donde le diga `OLLAMA_HOST`

`OLLAMA_HOST` cumple **dos papeles**: le dice al *cliente* a dónde conectarse y le dice al *servidor* en qué interfaz enlazarse. Si está fijado a la IP de Tailscale a nivel de usuario, el servidor escucha **solo** ahí y `127.0.0.1:11434` no responde:

```powershell
Get-NetTCPConnection -LocalPort 11434 -State Listen | Select LocalAddress
# LocalAddress
# 100.x.y.z          <- solo la interfaz mesh; loopback NO responde
```

Eso rompe los gates locales: `PRIVATE_MODE` solo permite hosts loopback/Docker privados, así que una IP CGNAT de Tailscale (`100.64.0.0/10`) es rechazada por el allowlist y el error aflora como `ollama_unreachable`, indistinguible de que el servidor esté caído.

**La opción más segura, y la preferente, es loopback puro.** Si esta máquina no necesita servir el modelo a la mesh, deja `OLLAMA_HOST=127.0.0.1:11434` y termina aquí: el puerto no se publica en ninguna interfaz y no hace falta tocar el firewall. Todo lo que sigue solo aplica cuando además se necesita acceso Tailscale desde otra máquina.

Para que **loopback y mesh convivan**, el servidor debe enlazarse al comodín:

```powershell
[Environment]::SetEnvironmentVariable('OLLAMA_HOST','0.0.0.0:11434','User')
# reiniciar Ollama para que tome el nuevo bind
```

> ⚠️ **`0.0.0.0:11434` es exclusivamente dev/cert, y exige restricción de firewall.** Este documento prohíbe exponer Ollama en `0.0.0.0` (ver *What is forbidden*), y con razón: el comodín publica el 11434 en **todas** las interfaces, incluida la LAN. Ollama no admite enlazar varias direcciones concretas, así que el comodín es la única forma de tener loopback y mesh a la vez, y **solo es aceptable en la máquina del owner, para gates locales y certificación, acompañado de la regla de firewall de abajo**. Producción no expone Ollama públicamente en ningún caso: el acceso remoto va por Option A (mesh privada) u Option B (red interna de Railway), nunca por un puerto abierto. `PRIVATE_MODE` **no se toca**: su allowlist sigue rechazando cualquier host que no sea loopback o Docker privado, y este bind no la relaja — solo hace que el loopback que ya se permitía vuelva a responder.

#### Restringir el 11434 por firewall (procedimiento seguro)

No borres reglas por comodín. `Remove-NetFirewallRule` con un `-DisplayName '*llama*'` puede llevarse reglas ajenas que casen por accidente, y no es reversible. Identifica primero, borra después, y solo la regla concreta:

```powershell
# 1. Listar TODO lo relacionado con Ollama, sin borrar nada.
Get-NetFirewallRule -DisplayName '*llama*' |
  Select-Object Name, DisplayName, Direction, Action, Enabled, Profile
```

```powershell
# 2. Inspeccionar la candidata: qué puerto abre y a quién se lo abre.
#    Sustituye <NAME> por el campo Name EXACTO del paso 1 (no el DisplayName).
$regla = Get-NetFirewallRule -Name '<NAME>'
$regla | Get-NetFirewallPortFilter    | Select-Object Protocol, LocalPort
$regla | Get-NetFirewallAddressFilter | Select-Object RemoteAddress
```

La regla amplia que hay que retirar es la que cumple **las tres** condiciones: `Direction = Inbound`, `Action = Allow`, y `RemoteAddress = Any` sobre el 11434. Si ninguna las cumple, no borres nada: salta al paso 4.

```powershell
# 3. Eliminar ÚNICAMENTE esa regla, por Name exacto. Ensaya primero con -WhatIf.
Remove-NetFirewallRule -Name '<NAME>' -WhatIf
Remove-NetFirewallRule -Name '<NAME>' -Confirm
```

```powershell
# 4. Permitir el 11434 SOLO desde el rango CGNAT de Tailscale.
New-NetFirewallRule -DisplayName "Ollama 11434 solo Tailscale" `
  -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow `
  -RemoteAddress 100.64.0.0/10
```

```powershell
# 5. Verificar: debe quedar UNA sola regla Inbound/Allow sobre el 11434,
#    y su RemoteAddress debe ser 100.64.0.0/10 (nunca "Any").
Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True |
  Where-Object { ($_ | Get-NetFirewallPortFilter).LocalPort -eq 11434 } |
  ForEach-Object {
    [pscustomobject]@{
      Name          = $_.Name
      DisplayName   = $_.DisplayName
      RemoteAddress = ($_ | Get-NetFirewallAddressFilter).RemoteAddress
    }
  }
```

No añadas una regla `-Action Block` de respaldo para el mismo puerto: en Windows Firewall las reglas de bloqueo tienen **prioridad sobre las de permitir**, así que anularía también el acceso mesh que se acaba de conceder. No hace falta: la acción por defecto del perfil de entrada ya es bloquear, de modo que lo que no se permite explícitamente queda fuera. El tráfico loopback no atraviesa el firewall, así que `127.0.0.1:11434` sigue funcionando sin ninguna regla.

Sin esa regla, el bind en comodín **incumple la política de este documento** y debe revertirse a `OLLAMA_HOST=127.0.0.1:11434`.

---

## What is forbidden

| Pattern | Why |
|---------|-----|
| Staging/prod → `localhost:11434` on laptop | Unreachable; security anti-pattern |
| Public expose Ollama (0.0.0.0 / ngrok / open CF tunnel) | Attack surface |
| `AUTONOMOUS_ALLOW_OPENAI=1` as default | Violates IA privada |
| Silent mock success when LLM missing | Honesty |

---

## Activation checklist (CEO)

1. Approve Option A or B.  
2. Configure private `OLLAMA_HOST` + models (3b/8b).  
3. Set `AUTONOMOUS_QUALITY_ROUTING=1` for pack QA path (ADR-036) on **staging first**.  
4. Keep prod IA flags OFF until soak evidence.  
5. Never set OpenAI allow by default.

---

## Rollback

Unset `OLLAMA_HOST` / `OLLAMA_BASE_URL` / `AUTONOMOUS_QUALITY_ROUTING` → fail-closed. No data migration.

---

## Prep implementada (código · sin activar mesh)

| Pieza | Rol |
|-------|-----|
| `backend/local-ai/OllamaRuntimePrep.ts` | Host safety (ban loopback remoto) · `probeOllamaHealth` · snapshot prep |
| Tests | `backend/local-ai/__tests__/OllamaRuntimePrep.test.ts` |
| Canary doc | `docs/ops/CANARY_IA_FLAGS.md` |

### Procedimiento humano (solo tras CEO Option A)

```bash
# En el host GPU (privado): Ollama escuchando solo en IP mesh, no 0.0.0.0 público
# En Railway STAGING (no prod primero):
# OLLAMA_HOST=http://100.x.y.z:11434
# OLLAMA_CONFIGURED=1
# OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
# OLLAMA_STRATEGY_MODEL=llama3.1:8b-instruct-q4_K_M
# NELVYON_LOCAL_ROUTER_ENABLED=1   # canary
# AUTONOMOUS_QUALITY_ROUTING=1     # canary opcional
# Nunca: AUTONOMOUS_ALLOW_OPENAI=1 por defecto
```

Rollback: unset todas las vars anteriores.

---

## Decision gate

**No instalar Tailscale/WireGuard/Ollama remoto desde Cursor.** CEO aprueba Option A/B → ops ejecuta mesh → canary staging vía `CANARY_IA_FLAGS.md`.
