"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function PortalApprovePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = decodeURIComponent(String(params?.token ?? ""));
  const [preview, setPreview] = useState<{ title?: string; action?: string; status?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/portal/approve?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPreview(d);
      })
      .catch(() => setError("No se pudo cargar el entregable"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback: searchParams?.get("feedback") ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error");
      else setDone(true);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [token, searchParams]);

  return (
    <div className="min-h-screen bg-[#020817] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="text-xl font-semibold mb-2">Portal Nelvyon</h1>
        {loading && <p className="text-white/60">Cargando…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {done && <p className="text-emerald-400">✓ Decisión registrada. Gracias.</p>}
        {!loading && !done && !error && preview && (
          <>
            <p className="text-white/80 mb-4">{preview.title}</p>
            <p className="text-sm text-white/50 mb-6">
              Acción: {preview.action === "approve" ? "Aprobar entregable" : "Solicitar cambios"}
            </p>
            <button
              type="button"
              onClick={submit}
              className="w-full rounded-lg bg-[#0084ff] py-3 font-medium hover:bg-[#0070dd] transition"
            >
              Confirmar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
