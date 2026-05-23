"use client";

import { Send } from "lucide-react";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicWebinarsApi } from "@/features/dashboard/api";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

export default function WebinarLivePage() {
  const params = useParams();
  const slug = str(params?.slug);
  const [webinar, setWebinar] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [joined, setJoined] = useState(false);

  const loadWebinar = useCallback(async () => {
    const w = await publicWebinarsApi.get(slug);
    setWebinar(w);
    if (typeof window !== "undefined") {
      setEmail(localStorage.getItem(`webinar_email_${slug}`) || "");
    }
  }, [slug]);

  const loadChat = useCallback(async () => {
    const res = await publicWebinarsApi.chat(slug);
    setMessages(res.items ?? []);
  }, [slug]);

  useEffect(() => {
    loadWebinar().catch(() => setWebinar(null));
  }, [loadWebinar]);

  useEffect(() => {
    loadChat().catch(() => undefined);
    const t = setInterval(() => loadChat().catch(() => undefined), 3000);
    return () => clearInterval(t);
  }, [loadChat]);

  async function onJoin() {
    if (!email.trim()) return;
    await publicWebinarsApi.join(slug, email.trim());
    setJoined(true);
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;
    await publicWebinarsApi.sendChat(slug, { email, name: email, message });
    setMessage("");
    loadChat();
  }

  const joinUrl = str(webinar?.join_url);
  const isLive = str(webinar?.status) === "live";
  const isInternal = joinUrl.startsWith("/");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col bg-black">
        <div className="border-b border-white/10 p-4 text-white">
          <h1 className="text-lg font-semibold">{str(webinar?.title, "Webinar")}</h1>
          <p className="text-sm text-white/70">{isLive ? "En directo" : "Esperando inicio…"}</p>
        </div>
        <div className="relative flex flex-1 items-center justify-center p-4">
          {isLive && joinUrl ? (
            isInternal ? (
              <div className="text-center text-white">
                <p className="mb-4 text-lg">Sala del webinar</p>
                <p className="text-sm text-white/70">El host iniciará la transmisión en breve.</p>
                {joined ? (
                  <p className="mt-4 text-green-400">Estás registrado como asistente</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    <input
                      type="email"
                      placeholder="Tu email registrado"
                      className="rounded border px-3 py-2 text-black"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button onClick={onJoin}>Unirse</Button>
                  </div>
                )}
              </div>
            ) : (
              <iframe title="Webinar" src={joinUrl} className="h-full min-h-[400px] w-full rounded-lg" allow="camera; microphone; fullscreen" />
            )
          ) : (
            <p className="text-white/80">El webinar comenzará pronto</p>
          )}
        </div>
      </div>

      <aside className="flex w-full flex-col border-l lg:w-80">
        <div className="border-b p-3 font-medium">Chat</div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {messages.map((m) => (
            <div key={str(m.id)} className="rounded bg-muted p-2">
              <p className="font-medium">{str(m.name, str(m.email))}</p>
              <p>{str(m.message)}</p>
            </div>
          ))}
        </div>
        <form onSubmit={onSend} className="flex gap-2 border-t p-3">
          <input
            className="flex-1 rounded border px-2 py-1 text-sm"
            placeholder="Mensaje…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!email}
          />
          <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!email}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </aside>
    </div>
  );
}
