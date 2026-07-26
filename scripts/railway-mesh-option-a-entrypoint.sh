#!/bin/sh
# Railway Mesh Option A — optional Tailscale userspace (cost 0).
# Activates ONLY when NELVYON_MESH_OPTION_A=1 AND TS_AUTHKEY is set.
# Forbidden: Funnel, Serve, exit node, subnet routes, public Ollama bind.
# Staging: default hostname nelvyon-staging-web.
# Prod canary (ADR-068 CEO): set NELVYON_MESH_HOSTNAME=nelvyon-prod-web-canary.
# Without MESH flags = identical to plain Next start (fail-closed).

set -eu

cd /app/apps/web

mesh_on="${NELVYON_MESH_OPTION_A:-0}"
# trim whitespace/newlines from Railway secret paste
auth="$(printf '%s' "${TS_AUTHKEY:-}" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [ "$mesh_on" = "1" ] && [ -n "$auth" ]; then
  echo "[mesh-option-a] enabling Tailscale userspace hostname=${NELVYON_MESH_HOSTNAME:-nelvyon-staging-web}"
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) ts_arch="amd64" ;;
    aarch64|arm64) ts_arch="arm64" ;;
    *)
      echo "[mesh-option-a] unsupported arch=$arch — skip mesh, start app fail-closed"
      exec node server.js
      ;;
  esac

  TS_VER="${TAILSCALE_VERSION:-1.82.0}"
  TS_DIR="/tmp/tailscale-mesh"
  mkdir -p "$TS_DIR"
  if [ ! -x "$TS_DIR/tailscale" ]; then
    echo "[mesh-option-a] fetching static Tailscale ${TS_VER} (${ts_arch})"
    wget -qO /tmp/tailscale.tgz \
      "https://pkgs.tailscale.com/stable/tailscale_${TS_VER}_${ts_arch}.tgz" \
      || {
        echo "[mesh-option-a] MESH_JOIN_FAIL reason=download"
        exec node server.js
      }
    tar -xzf /tmp/tailscale.tgz -C /tmp
    src="$(find /tmp -maxdepth 1 -type d -name "tailscale_${TS_VER}_${ts_arch}" | head -n1)"
    if [ -z "$src" ] || [ ! -x "$src/tailscale" ]; then
      echo "[mesh-option-a] MESH_JOIN_FAIL reason=extract"
      exec node server.js
    fi
    cp "$src/tailscale" "$src/tailscaled" "$TS_DIR/"
    chmod +x "$TS_DIR/tailscale" "$TS_DIR/tailscaled"
  fi

  mkdir -p /tmp/tailscale-state
  "$TS_DIR/tailscaled" \
    --state=/tmp/tailscale-state/tailscaled.state \
    --socket=/tmp/tailscale-state/tailscaled.sock \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --outbound-http-proxy-listen=127.0.0.1:1055 \
    >/tmp/tailscale-state/tailscaled.log 2>&1 &

  i=0
  while [ "$i" -lt 40 ]; do
    if "$TS_DIR/tailscale" --socket=/tmp/tailscale-state/tailscaled.sock status >/dev/null 2>&1; then
      break
    fi
    i=$((i + 1))
    sleep 0.5
  done

  mesh_ok=0
  # Capture stderr without printing auth material; redact key-shaped tokens
  if up_err="$("$TS_DIR/tailscale" --socket=/tmp/tailscale-state/tailscaled.sock up \
    --authkey="$auth" \
    --hostname="${NELVYON_MESH_HOSTNAME:-nelvyon-staging-web}" \
    --accept-dns=true \
    --accept-routes=false \
    --advertise-exit-node=false \
    --ssh=false \
    --reset 2>&1)"; then
    mesh_ok=1
  else
    safe_err="$(printf '%s' "$up_err" | sed -E 's/tskey-[A-Za-z0-9_-]+/[REDACTED]/g; s/API key [A-Za-z0-9]+/[REDACTED]/g' | tr '\n' ' ' | cut -c1-180)"
    echo "[mesh-option-a] MESH_JOIN_FAIL reason=tailscale_up detail=${safe_err}"
  fi

  if [ "$mesh_ok" = "1" ]; then
    export ALL_PROXY="socks5://127.0.0.1:1055"
    export HTTP_PROXY="http://127.0.0.1:1055"
    export HTTPS_PROXY="http://127.0.0.1:1055"
    export NELVYON_MESH_HTTP_PROXY="http://127.0.0.1:1055"
    export NO_PROXY="127.0.0.1,localhost,.railway.internal,.rlwy.app"
    echo "[mesh-option-a] MESH_JOIN_OK proxies_set=1"
  else
    echo "[mesh-option-a] MESH_JOIN_FAIL proxies_set=0 — app starts; Ollama remote fail-closed"
  fi
else
  if [ "$mesh_on" = "1" ] && [ -z "$auth" ]; then
    echo "[mesh-option-a] MESH_JOIN_FAIL reason=TS_AUTHKEY_unset"
  fi
fi

exec node server.js
