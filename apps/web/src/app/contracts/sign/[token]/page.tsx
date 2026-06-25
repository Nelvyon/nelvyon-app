"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Contract {
  id: string; title: string; clientName: string; contractNumber: string;
  amount: number; currency: string; status: string; termsHtml: string | null;
}

export default function ContractSignPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [contract, setContract] = useState<Contract | null>(null);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/public/contracts/sign/${token}`, { method: "GET" })
      .then(r => r.json() as Promise<{ contract?: Contract; error?: string }>)
      .then(d => {
        if (d.contract) setContract(d.contract);
        else setError(d.error ?? "Contrato no encontrado");
      })
      .catch(() => setError("Error cargando el contrato"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSign() {
    setSigning(true);
    try {
      const r = await fetch(`/api/public/contracts/sign/${token}`, { method: "POST" });
      const d = await r.json() as { signed?: boolean; error?: string };
      if (d.signed) { setSigned(true); setContract(prev => prev ? { ...prev, status: "signed" } : prev); }
      else setError(d.error ?? "Error al firmar");
    } catch {
      setError("Error de red");
    } finally {
      setSigning(false);
    }
  }

  const fmt = (n: number, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

  if (loading) return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center">
      <p className="text-white/50">Cargando contrato…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-4xl mb-4">❌</p>
        <p className="text-white font-semibold text-lg">Enlace no válido</p>
        <p className="text-white/50 mt-2 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Contrato digital</p>
          <h1 className="text-2xl font-bold text-white">{contract?.title}</h1>
          <p className="text-white/50 text-sm mt-1">Ref. {contract?.contractNumber}</p>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Cliente</span>
            <span className="text-white font-medium">{contract?.clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Importe total</span>
            <span className="text-white font-bold text-lg">{fmt(contract?.amount ?? 0, contract?.currency)}</span>
          </div>
          {contract?.status === "signed" && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Estado</span>
              <span className="text-green-400 font-medium">✅ Firmado</span>
            </div>
          )}
        </div>

        {/* Terms */}
        {contract?.termsHtml && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 max-h-60 overflow-y-auto">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Términos y condiciones</p>
            <div className="text-white/70 text-sm prose-sm"
              dangerouslySetInnerHTML={{ __html: contract.termsHtml }} />
          </div>
        )}

        {/* Action */}
        {!signed && contract?.status !== "signed" ? (
          <div className="text-center space-y-3">
            <p className="text-white/50 text-xs">Al hacer clic en "Firmar contrato" acepta los términos indicados.</p>
            <button
              onClick={() => void handleSign()}
              disabled={signing}
              className="w-full rounded-xl bg-[#0084ff] py-4 text-white font-semibold text-base hover:bg-[#0070dd] disabled:opacity-50 transition-colors">
              {signing ? "Firmando…" : "✍️ Firmar contrato"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-green-400 font-semibold text-lg">Contrato firmado</p>
            <p className="text-white/50 text-sm mt-1">Recibirá una copia por email. Gracias por su confianza.</p>
          </div>
        )}

        <p className="text-center text-white/20 text-xs">Powered by Nelvyon</p>
      </div>
    </div>
  );
}
