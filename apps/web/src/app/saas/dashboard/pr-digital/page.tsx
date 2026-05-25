"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { prDigitalApi } from "@/features/pr-digital/api";

export default function PrDigitalPage() {
  const [company, setCompany] = useState("NELVYON");
  const [sector, setSector] = useState("saas");
  const [news, setNews] = useState("Lanzamiento de módulo PR Digital IA para agencias");
  const [type, setType] = useState("press_release");
  const [preview, setPreview] = useState<{ title?: string; content?: string; headlines?: string[] } | null>(null);
  const [releases, setReleases] = useState<unknown[]>([]);
  const [media, setMedia] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([
      prDigitalApi.releases("ws-client-1"),
      prDigitalApi.mediaList(sector),
    ]);
    setReleases(r.releases ?? []);
    setMedia(m.media ?? []);
  }, [sector]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      if (type === "crisis") {
        const c = (await prDigitalApi.crisis({ company, sector, situation: news })) as {
          title?: string;
          content?: string;
        };
        setPreview({ title: c.title, content: c.content });
      } else {
        const g = (await prDigitalApi.generate({ company, sector, news, type })) as {
          title?: string;
          content?: string;
        };
        const h = await prDigitalApi.headlines({ company, sector, news });
        setPreview({ title: g.title, content: g.content, headlines: h.headlines });
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copyText = () => {
    if (preview?.content) void navigator.clipboard.writeText(preview.content);
  };

  const downloadTxt = () => {
    if (!preview?.content) return;
    const blob = new Blob([preview.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company}-pr.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">PR Digital IA</h1>
      <p className="mb-4 text-sm text-slate-500">Notas de prensa, crisis y medios objetivo</p>
      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2">
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" value={company} />
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setSector(e.target.value)} placeholder="Sector" value={sector} />
        <select className="rounded border px-2 py-1 text-sm" onChange={(e) => setType(e.target.value)} value={type}>
          <option value="press_release">Nota de prensa</option>
          <option value="crisis">Crisis</option>
          <option value="bio">Bio corporativa</option>
        </select>
        <textarea
          className="rounded border px-2 py-1 text-sm md:col-span-2"
          onChange={(e) => setNews(e.target.value)}
          placeholder="Logro o novedad"
          rows={3}
          value={news}
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 md:col-span-2" disabled={busy} onClick={() => void generate()} type="button">
          Generar con IA
        </button>
      </div>
      {preview?.content ? (
        <div className="mb-4 rounded-xl border bg-white p-4 text-sm shadow-sm">
          <h2 className="mb-2 font-semibold">{preview.title}</h2>
          <pre className="whitespace-pre-wrap text-slate-700">{preview.content}</pre>
          {preview.headlines?.length ? (
            <ul className="mt-3 list-disc pl-5">
              {preview.headlines.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button className="rounded border px-3 py-1 text-xs" onClick={copyText} type="button">
              Copiar
            </button>
            <button className="rounded border px-3 py-1 text-xs" onClick={downloadTxt} type="button">
              Descargar .txt
            </button>
          </div>
        </div>
      ) : null}
      <h3 className="mb-2 text-sm font-medium text-slate-700">Medios objetivo — {sector}</h3>
      <ul className="mb-4 rounded-xl border bg-white p-3 text-sm">
        {media.map((m, i) => (
          <li className="border-b py-2" key={i}>
            {JSON.stringify(m)}
          </li>
        ))}
      </ul>
      <h3 className="mb-2 text-sm font-medium text-slate-700">Historial</h3>
      <ul className="rounded-xl border bg-white p-3 text-sm">
        {releases.map((r, i) => (
          <li className="border-b py-2" key={i}>
            {JSON.stringify(r).slice(0, 120)}…
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
