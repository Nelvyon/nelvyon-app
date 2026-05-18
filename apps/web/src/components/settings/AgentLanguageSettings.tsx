"use client";

import { useEffect, useState } from "react";

type LanguageCode = "auto" | "es" | "en" | "fr" | "de" | "pt" | "it" | "nl" | "pl" | "ru" | "zh";

type SupportedLanguage = {
  code: Exclude<LanguageCode, "auto">;
  name: string;
  flag: string;
};

export default function AgentLanguageSettings() {
  const [value, setValue] = useState<LanguageCode>("auto");
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      setStatus("");
      try {
        const [prefRes, supportedRes] = await Promise.all([
          fetch("/api/saas/agent-language/preference"),
          fetch("/api/saas/agent-language/supported"),
        ]);
        if (!prefRes.ok || !supportedRes.ok) throw new Error("load_failed");
        const pref = (await prefRes.json()) as { langCode?: LanguageCode };
        const supported = (await supportedRes.json()) as { languages?: SupportedLanguage[] };
        if (!mounted) return;
        setValue(pref.langCode ?? "auto");
        setLanguages(supported.languages ?? []);
      } catch {
        if (mounted) setStatus("No se pudo cargar la configuración de idioma");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => setStatus("No se pudo cargar la configuración de idioma"));
    return () => {
      mounted = false;
    };
  }, []);

  async function onChangeLang(next: LanguageCode): Promise<void> {
    setValue(next);
    setStatus("");
    try {
      const res = await fetch("/api/saas/agent-language/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ langCode: next }),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("Preferencia de idioma guardada");
    } catch {
      setStatus("No se pudo guardar la preferencia");
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold">Idioma de respuestas de agentes</h2>
      <p className="mt-1 text-sm text-zinc-400">Define si los agentes responden en un idioma fijo o lo detectan automáticamente.</p>
      <div className="mt-4">
        <label className="mb-1 block text-sm text-zinc-300" htmlFor="agent-language-select">
          Idioma del agente
        </label>
        <select
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          disabled={loading}
          id="agent-language-select"
          onChange={(e) => void onChangeLang(e.target.value as LanguageCode)}
          value={value}
        >
          <option value="auto">Auto-detectar</option>
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
