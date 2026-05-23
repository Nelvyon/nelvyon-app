"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardHelpdeskApi } from "@/features/dashboard/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

type Row = Record<string, unknown>;

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

export default function HelpdeskTicketPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [ticket, setTicket] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;
    const t = await dashboardHelpdeskApi.ticket(id);
    setTicket(t);
  }, [id]);

  useEffect(() => {
    load().catch(() => setTicket(null));
  }, [load]);

  async function sendReply() {
    if (!reply.trim() || !Number.isFinite(id)) return;
    setSending(true);
    try {
      await dashboardHelpdeskApi.reply(id, reply.trim());
      setReply("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function resolve() {
    if (!Number.isFinite(id)) return;
    setResolving(true);
    try {
      await dashboardHelpdeskApi.resolve(id);
      await load();
    } finally {
      setResolving(false);
    }
  }

  const messages = (ticket?.messages as Row[] | undefined) ?? [];

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <ProtectedLayout module="inbox">
        <p className="text-sm text-destructive">ID de ticket inválido</p>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/helpdesk">← Helpdesk</Link>
          </Button>
          <h1 className="text-xl font-bold">{str(ticket?.subject, "Ticket")}</h1>
          {ticket?.status ? <StatusBadge status={str(ticket.status)} /> : null}
          {ticket?.priority ? <StatusBadge status={str(ticket.priority)} /> : null}
          {ticket?.status !== "resolved" ? (
            <Button className="ml-auto" disabled={resolving} onClick={resolve} variant="outline">
              {resolving ? "Resolviendo…" : "Resolver"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-4 text-sm shadow-card">
          <dl className="grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Canal</dt>
              <dd className="capitalize">{str(ticket?.channel)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>{str(ticket?.client_name ?? ticket?.contact_name)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd>{str(ticket?.created_at)}</dd>
            </div>
          </dl>
        </div>

        <section className="space-y-4">
          <h2 className="font-semibold">Conversación</h2>
          <div className="space-y-3">
            {messages.map((m) => {
              const inbound = str(m.direction) === "inbound";
              return (
                <div
                  className={`max-w-[85%] rounded-xl border p-4 ${inbound ? "bg-muted/40" : "ml-auto bg-primary/5"}`}
                  key={str(m.id)}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{str(m.sender_name ?? m.agent_name, inbound ? "Cliente" : "Agente")}</span>
                    <span>{str(m.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{str(m.content ?? m.body)}</p>
                </div>
              );
            })}
            {messages.length === 0 ? (
              <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Sin mensajes</p>
            ) : null}
          </div>
        </section>

        {ticket?.status !== "resolved" ? (
          <section className="rounded-xl border bg-card p-4 shadow-card">
            <h2 className="font-semibold">Responder</h2>
            <textarea
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escribe tu respuesta…"
              rows={4}
              value={reply}
            />
            <Button className="mt-3" disabled={!reply.trim() || sending} onClick={sendReply}>
              {sending ? "Enviando…" : "Enviar respuesta"}
            </Button>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Este ticket está resuelto.</p>
        )}
      </div>
    </ProtectedLayout>
  );
}
