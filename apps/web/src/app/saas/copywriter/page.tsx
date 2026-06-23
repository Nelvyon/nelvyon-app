"use client";

import { useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type CopyType = "email_subject" | "email_body" | "sms_message" | "social_post" | "ad_copy" | "landing_headline" | "cta_button" | "blog_intro";
type Tone = "formal" | "casual" | "urgente" | "inspirador";

const COPY_TYPES: { id: CopyType; label: string; icon: string; placeholder: string }[] = [
  { id: "email_subject", label: "Asunto de email", icon: "📧", placeholder: "Campaña de reactivación para clientes que no compran hace 3 meses. Ofrecemos 20% descuento." },
  { id: "email_body", label: "Cuerpo de email", icon: "📝", placeholder: "Email de bienvenida para nuevos clientes de nuestro plan Pro. Incluir próximos pasos y soporte." },
  { id: "sms_message", label: "SMS Marketing", icon: "💬", placeholder: "Oferta flash de 48h: 30% descuento en todos nuestros servicios. Solo para clientes existentes." },
  { id: "social_post", label: "Post Redes Sociales", icon: "📱", placeholder: "Lanzamiento de nuestra nueva función de IA para automatizar campañas de email marketing." },
  { id: "ad_copy", label: "Anuncio Digital", icon: "💰", placeholder: "Software de marketing todo en uno para pymes. Más barato que HubSpot. Prueba gratis 14 días." },
  { id: "landing_headline", label: "Titular Landing Page", icon: "🚀", placeholder: "Plataforma SaaS de marketing digital con IA para empresas que quieren crecer sin contratar." },
  { id: "cta_button", label: "Texto CTA / Botón", icon: "🎯", placeholder: "Botón para empezar prueba gratuita de nuestro software de marketing." },
  { id: "blog_intro", label: "Intro de Blog", icon: "✍️", placeholder: "Artículo sobre cómo las pymes pueden usar IA para automatizar su marketing y ahorrar tiempo." },
];

const TONES: { id: Tone; label: string }[] = [
  { id: "casual", label: "Cercano" },
  { id: "formal", label: "Formal" },
  { id: "urgente", label: "Urgente" },
  { id: "inspirador", label: "Inspirador" },
];

export default function SaasCopywriterPage() {
  const [type, setType] = useState<CopyType>("email_subject");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [variations, setVariations] = useState(3);
  const [loading, setLoading] = useState(false);
  const [copies, setCopies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const selectedType = COPY_TYPES.find(t => t.id === type)!;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!context.trim()) { setError("Describe qué quieres comunicar"); return; }
    setLoading(true);
    setError(null);
    setCopies([]);
    try {
      const res = await fetch("/api/saas/ai-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context: context.trim(), tone, variations }),
      });
      const data = (await res.json().catch(() => ({}))) as { copies?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error generando copy");
      setCopies(data.copies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, idx: number) {
    void navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="agentes" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Copywriter IA"
          subtitle="Genera textos de marketing persuasivos en segundos con IA"
        />

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          {/* Left: Config */}
          <div className="flex flex-col gap-4">
            {/* Type selector */}
            <NelvyonDsCard className="p-5">
              <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de contenido</p>
              <div className="grid grid-cols-2 gap-2">
                {COPY_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setType(t.id); setContext(""); setCopies([]); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${type === t.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                    <span>{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </NelvyonDsCard>

            {/* Form */}
            <NelvyonDsCard className="p-5">
              <form onSubmit={generate} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">¿Qué quieres comunicar? *</label>
                  <textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    rows={4}
                    placeholder={selectedType.placeholder}
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Tono</p>
                  <div className="flex gap-2">
                    {TONES.map(t => (
                      <button key={t.id} type="button" onClick={() => setTone(t.id)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${tone === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Variaciones: {variations}</p>
                  <input type="range" min={1} max={5} value={variations} onChange={e => setVariations(parseInt(e.target.value))}
                    className="w-full accent-primary" />
                </div>

                {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

                <NelvyonDsButton type="submit" disabled={loading || !context.trim()} className="w-full">
                  {loading ? "Generando con IA…" : `✨ Generar ${variations} variaciones`}
                </NelvyonDsButton>
              </form>
            </NelvyonDsCard>
          </div>

          {/* Right: Results */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {copies.length > 0 ? `${copies.length} variaciones generadas` : "Resultados aparecerán aquí"}
            </p>

            {loading && (
              <div className="space-y-3">
                {Array.from({ length: variations }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
                ))}
              </div>
            )}

            {copies.length === 0 && !loading && (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">{selectedType.icon}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Describe tu mensaje y la IA generará {variations} versiones optimizadas para conversión
                </p>
              </NelvyonDsCard>
            )}

            {copies.map((copy, i) => (
              <NelvyonDsCard key={i} className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Variación {i + 1}</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{copy}</p>
                  </div>
                  <button onClick={() => copyToClipboard(copy, i)}
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {copied === i ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                {type === "email_subject" && (
                  <p className="mt-2 text-xs text-muted-foreground">{copy.length} caracteres</p>
                )}
                {type === "sms_message" && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted/30">
                      <div className={`h-1 rounded-full ${copy.length > 160 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${Math.min(copy.length / 160 * 100, 100)}%` }} />
                    </div>
                    <p className={`text-xs ${copy.length > 160 ? "text-red-400" : "text-muted-foreground"}`}>{copy.length}/160</p>
                  </div>
                )}
              </NelvyonDsCard>
            ))}
          </div>
        </div>
      </div>
    </SaasShellLayout>
  );
}
