"use client";

/**
 * /saas/deliverability sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: metricas -> `W3crmKpiTile`; IP dedicada y warm-up ->
 * `W3crmContentBox`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET /api/saas/deliverability` y su `POST` con
 * las dos acciones (`dedicated-ip`, que reenvia el `warmupDay` vigente, y
 * `warmup-advance`), el umbral de salud en 80 y la etiqueta del boton con el
 * dia siguiente de warm-up.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

type Snapshot = {
  bounceRate: number;
  complaintRate: number;
  sent30d: number;
  bounced30d: number;
  healthScore: number;
  dedicatedIp: string | null;
  warmupDay: number;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function healthTone(score: number): boolean {
  return score >= 80;
}

export default function DeliverabilityPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dedicatedIp, setDedicatedIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingIp, setSavingIp] = useState(false);
  const [advancingWarmup, setAdvancingWarmup] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability");
      const d = (await res.json().catch(() => ({}))) as { snapshot?: Snapshot; error?: string };
      if (!res.ok) {
        throw new Error(d.error ?? `Error ${res.status} al cargar métricas`);
      }
      setSnapshot(d.snapshot ?? null);
      setDedicatedIp(d.snapshot?.dedicatedIp ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar métricas de deliverability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveDedicatedIp() {
    setSavingIp(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dedicated-ip", dedicatedIp, warmupDay: snapshot?.warmupDay ?? 0 }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al guardar la IP dedicada`);
      await load();
      setFeedback("✓ IP dedicada guardada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la IP dedicada");
    } finally {
      setSavingIp(false);
    }
  }

  async function advanceWarmup() {
    setAdvancingWarmup(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "warmup-advance" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al avanzar el warm-up`);
      await load();
      setFeedback("✓ Warm-up avanzado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al avanzar el warm-up");
    } finally {
      setAdvancingWarmup(false);
    }
  }

  const salud = num(snapshot?.healthScore);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Deliverability Center" parentTitle="Gestión" pageTitle="Deliverability" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            </div>
          )}
          {feedback && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">{feedback}</div>
            </div>
          )}

          {loading ? (
            <div className="col-xl-12">
              <W3crmContentBox titulo="Métricas de envío" icono="fa-solid fa-paper-plane">
                <W3crmCargando texto="Cargando métricas…" />
              </W3crmContentBox>
            </div>
          ) : snapshot ? (
            <>
              <div className="col-xl-4 col-sm-6">
                <W3crmKpiTile label="Health score" value={`${salud}/100`} accent={healthTone(salud)} />
              </div>
              <div className="col-xl-4 col-sm-6">
                <W3crmKpiTile label="Bounce rate 30d" value={`${num(snapshot.bounceRate).toFixed(2)}%`} />
              </div>
              <div className="col-xl-4 col-sm-6">
                <W3crmKpiTile label="Enviados 30d" value={num(snapshot.sent30d).toLocaleString("es-ES")} />
              </div>
            </>
          ) : (
            <div className="col-xl-12">
              <W3crmContentBox titulo="Métricas de envío" icono="fa-solid fa-paper-plane">
                <W3crmEmptyState title="Sin métricas" description="No se pudieron cargar las métricas todavía." />
              </W3crmContentBox>
            </div>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Salud de envío de email, bounce rate y warm-up de IP dedicada
            </p>

            <W3crmContentBox titulo="Dedicated IP (SES)" icono="fa-solid fa-server">
              <p className="fs-14 text-muted">
                Configura una IP dedicada de Amazon SES y avanza el plan de warm-up progresivamente
                para maximizar la reputación de envío.
              </p>
              <div className="row align-items-end">
                <div className="col-xl-6 col-sm-12">
                  <div className="form-group mb-3">
                    <label htmlFor="dlv-ip" className="text-black font-w600">IP dedicada</label>
                    <input id="dlv-ip" className="form-control" placeholder="52.x.x.x"
                      value={dedicatedIp} onChange={(e) => setDedicatedIp(e.target.value)} />
                  </div>
                </div>
                <div className="col-xl-3 col-sm-6">
                  <div className="form-group mb-3">
                    <button type="button" className="btn btn-primary w-100" disabled={savingIp}
                      onClick={() => void saveDedicatedIp()}>
                      {savingIp ? "Guardando…" : "Guardar IP"}
                    </button>
                  </div>
                </div>
                <div className="col-xl-3 col-sm-6">
                  <div className="form-group mb-3">
                    <button type="button" className="btn btn-primary light w-100" disabled={advancingWarmup}
                      onClick={() => void advanceWarmup()}>
                      {advancingWarmup ? "Avanzando…" : `Avanzar warm-up (día ${num(snapshot?.warmupDay) + 1})`}
                    </button>
                  </div>
                </div>
              </div>
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
