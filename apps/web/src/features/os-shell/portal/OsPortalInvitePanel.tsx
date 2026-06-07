"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import {
  OsErrorBanner,
  OsGhostButton,
  OsPrimaryButton,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import {
  buildPortalInviteUrl,
  osPortalApi,
  type PortalInviteListItem,
} from "@/features/os-shell/portal/api";

const INVITE_LINK_KEY = "nelvyon.os.portal.inviteLinks";

type StoredLink = { inviteId: string; email: string; url: string; createdAt: string };

function readStoredLinks(clientId: string): StoredLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${INVITE_LINK_KEY}.${clientId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeLink(clientId: string, entry: StoredLink) {
  const prev = readStoredLinks(clientId).filter((l) => l.inviteId !== entry.inviteId);
  sessionStorage.setItem(`${INVITE_LINK_KEY}.${clientId}`, JSON.stringify([entry, ...prev].slice(0, 10)));
}

function statusLabel(status: string): string {
  if (status === "accepted") return "Aceptada";
  if (status === "expired") return "Expirada";
  if (status === "pending") return "Pendiente";
  return status;
}

export function OsPortalInvitePanel({
  clientId,
  defaultEmail,
}: {
  clientId: string;
  defaultEmail?: string | null;
}) {
  const [email, setEmail] = useState(defaultEmail?.trim() ?? "");
  const [invites, setInvites] = useState<PortalInviteListItem[]>([]);
  const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await osPortalApi.listInvites(clientId);
      setInvites(res.items ?? []);
      setStoredLinks(readStoredLinks(clientId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar invitaciones");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (defaultEmail && !email) setEmail(defaultEmail.trim());
  }, [defaultEmail, email]);

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Introduce un email");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setCopyMsg(null);
    try {
      const result = await osPortalApi.createInvite({ client_id: clientId, email: trimmed });
      const url = buildPortalInviteUrl(result.token);
      setLastLink(url);
      storeLink(clientId, {
        inviteId: result.invite_id,
        email: result.email,
        url,
        createdAt: new Date().toISOString(),
      });
      setStoredLinks(readStoredLinks(clientId));
      setSuccess(`Invitación creada para ${result.email}. Enlace listo para copiar.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear invitación");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Enlace copiado");
    } catch {
      setCopyMsg("No se pudo copiar — selecciona el enlace manualmente");
    }
  }

  function linkForInvite(inv: PortalInviteListItem): string | null {
    const stored = storedLinks.find((l) => l.inviteId === inv.id);
    return stored?.url ?? (lastLink && inv.status === "pending" ? lastLink : null);
  }

  return (
    <section className="mb-10 rounded-xl border border-white/10 bg-[#0b1428] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Portal cliente</h2>
          <p className="text-sm text-white/45">Invita contactos a revisar entregables y aprobar trabajo.</p>
        </div>
        <OsGhostButton type="button" onClick={() => void load()}>
          Actualizar
        </OsGhostButton>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {success ? <p className="mb-3 text-sm text-emerald-400">{success}</p> : null}
      {copyMsg ? <p className="mb-3 text-sm text-white/60">{copyMsg}</p> : null}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          <span className="text-white/45">Email del cliente</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
            className="h-9 rounded-lg border border-white/15 bg-black/20 px-3 text-white"
          />
        </label>
        <OsPrimaryButton type="button" disabled={submitting} onClick={() => void handleInvite()}>
          {submitting ? "Creando…" : "Invitar al portal"}
        </OsPrimaryButton>
      </div>

      {lastLink ? (
        <div className="mb-6 rounded-lg border border-[#0084FF]/30 bg-[#0084FF]/10 p-3 text-sm">
          <p className="text-white/70">Enlace de activación (válido 7 días):</p>
          <p className="mt-1 break-all font-mono text-xs text-white">{lastLink}</p>
          <div className="mt-2">
            <OsGhostButton type="button" onClick={() => void copyText(lastLink)}>
              Copiar enlace
            </OsGhostButton>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/40">Cargando invitaciones…</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-white/40">Sin invitaciones para este cliente.</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Expira</th>
              <th className="px-4 py-2 text-left">Enlace</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const url = linkForInvite(inv);
              return (
                <tr key={inv.id} className="border-b border-white/5 text-sm">
                  <td className="px-4 py-2 text-white">{inv.email}</td>
                  <td className="px-4 py-2 text-white/80">{statusLabel(inv.status)}</td>
                  <td className="px-4 py-2 text-white/55">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {url && inv.status === "pending" ? (
                      <button
                        type="button"
                        className="text-[#0084FF] hover:underline"
                        onClick={() => void copyText(url)}
                      >
                        Copiar
                      </button>
                    ) : (
                      <span className="text-white/35">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </OsTable>
      )}
    </section>
  );
}
