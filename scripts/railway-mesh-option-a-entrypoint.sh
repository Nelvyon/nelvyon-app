#!/bin/sh
# Railway staging Mesh Option A — optional Tailscale userspace (cost 0).
# Activates ONLY when NELVYON_MESH_OPTION_A=1 AND TS_AUTHKEY is set.
# Forbidden: Funnel, Serve, exit node, subnet routes, production use.
# Prod without these env vars = identical to plain Next start.

set -eu

cd /app/apps/web

mesh_on="${NELVYON_MESH_OPTION_A:-0}"
auth="${TS_AUTHKEY:-}"

if [ "$mesh_on" = "1" ] && [ -n "$auth" ]; then
  echo "[mesh-option-a] enabling Tailscale userspace (staging)"
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
        echo "[mesh-option-a] download failed — start app without mesh"
        exec node server.js
      }
    tar -xzf /tmp/tailscale.tgz -C /tmp
    # tarball extracts to tailscale_${ver}_${arch}/
    src="$(find /tmp -maxdepth 1 -type d -name "tailscale_${TS_VER}_${ts_arch}" | head -n1)"
    cp "$src/tailscale" "$src/tailscaled" "$TS_DIR/"
    chmod +x "$TS_DIR/tailscale" "$TS_DIR/tailscaled"
  fi

  mkdir -p /tmp/tailscale-state
  # userspace only — no TUN privilege, no exit node, no subnet routes
  "$TS_DIR/tailscaled" \
    --state=/tmp/tailscale-state/tailscaled.state \
    --socket=/tmp/tailscale-state/tailscaled.sock \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --outbound-http-proxy-listen=127.0.0.1:1055 \
    >/tmp/tailscale-state/tailscaled.log 2>&1 &

  i=0
  while [ "$i" -lt 30 ]; do
    if "$TS_DIR/tailscale" --socket=/tmp/tailscale-state/tailscaled.sock status >/dev/null 2>&1; then
      break
    fi
    i=$((i + 1))
    sleep 0.5
  done

  "$TS_DIR/tailscale" --socket=/tmp/tailscale-state/tailscaled.sock up \
    --authkey="$auth" \
    --hostname="${NELVYON_MESH_HOSTNAME:-nelvyon-staging-web}" \
    --accept-dns=true \
    --accept-routes=false \
    --advertise-exit-node=false \
    --ssh=false \
    --reset \
    || echo "[mesh-option-a] tailscale up failed — app continues; Ollama probes fail-closed"

  # Route Node fetch to Tailscale SOCKS (private mesh only)
  export ALL_PROXY="socks5://127.0.0.1:1055"
  export HTTP_PROXY="http://127.0.0.1:1055"
  export HTTPS_PROXY="http://127.0.0.1:1055"
  export NO_PROXY="127.0.0.1,localhost,.railway.internal,.rlwy.app"
  echo "[mesh-option-a] userspace up — proxies set for private OLLAMA_HOST"
else
  if [ "$mesh_on" = "1" ] && [ -z "$auth" ]; then
    echo "[mesh-option-a] NELVYON_MESH_OPTION_A=1 but TS_AUTHKEY unset — skip mesh"
  fi
fi

exec node server.js
