"use client";

import { Loader2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { whitelabelApi, type PartnerClient } from "@/features/whitelabel/api";

export default function WhiteLabelClientsPage() {
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whitelabelApi.listClients();
      setClients(res.clients ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function createClient() {
    if (!name.trim() || !adminEmail.trim()) return;
    setCreating(true);
    setMsg(null);
    try {
      await whitelabelApi.createSubworkspace(name.trim(), adminEmail.trim());
      setName("");
      setAdminEmail("");
      setMsg("Cliente creado — hereda la marca del partner");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al crear cliente");
    } finally {
      setCreating(false);
    }
  }

  return (
    <ProtectedLayout module="settings">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6" /> Clientes partner
            </h1>
            <p className="text-sm text-muted-foreground">
              Crea sub-workspaces para tus clientes. Ellos ven solo tu marca; tú facturas lo que quieras.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/white-label">← Configuración white-label</Link>
          </Button>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="mb-3 font-semibold">Nuevo cliente</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[160px] flex-1 rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente"
              value={name}
            />
            <input
              className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Email admin"
              type="email"
              value={adminEmail}
            />
            <Button disabled={creating} onClick={() => void createClient()} type="button">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crear sub-workspace
            </Button>
          </div>
          {msg ? <p className="mt-2 text-sm text-muted-foreground">{msg}</p> : null}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Workspace ID</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      Aún no tienes clientes partner. Crea el primero arriba.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr className="border-t" key={String(c.id ?? c.client_workspace_id)}>
                      <td className="px-4 py-3 font-medium">{c.client_name ?? c.workspace_name}</td>
                      <td className="px-4 py-3">{c.admin_email ?? "—"}</td>
                      <td className="px-4 py-3">{c.client_workspace_id}</td>
                      <td className="px-4 py-3 capitalize">{c.status ?? "active"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
