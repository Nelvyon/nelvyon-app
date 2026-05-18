import { useEffect, useMemo, useState } from "react";

type ServiceStatus = {
  id: string;
  serviceName: string;
  status: "operational" | "degraded";
  responseMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
};

type UptimeStatusResponse = {
  overall: "operational" | "degraded" | "outage";
  services: ServiceStatus[];
  checkedAt: string;
};

type Incident = {
  id: string;
  serviceName: string;
  title: string;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
  description: string | null;
};

function getBadgeClass(status: string): string {
  if (status === "operational") return "bg-emerald-500";
  if (status === "degraded") return "bg-amber-500";
  return "bg-rose-500";
}

export default function StatusPage() {
  const [status, setStatus] = useState<UptimeStatusResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const [statusRes, incidentsRes] = await Promise.all([fetch("/api/uptime/status"), fetch("/api/uptime/incidents")]);
        if (!mounted) return;
        if (statusRes.ok) {
          const data = (await statusRes.json()) as UptimeStatusResponse;
          setStatus(data);
        }
        if (incidentsRes.ok) {
          const data = (await incidentsRes.json()) as { incidents: Incident[] };
          setIncidents(data.incidents);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const overallLabel = useMemo(() => {
    if (!status) return "unknown";
    return status.overall;
  }, [status]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">NELVYON Status</h1>
        <p className="mt-2 text-slate-400">Estado en tiempo real de los servicios públicos.</p>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Estado general</h2>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getBadgeClass(overallLabel)}`}>
              {overallLabel}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {status?.checkedAt ? `Última actualización: ${new Date(status.checkedAt).toLocaleString()}` : "Sin datos todavía"}
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-medium">Servicios</h2>
          {loading && <p className="mt-3 text-sm text-slate-400">Cargando estado...</p>}
          {!loading && (!status || status.services.length === 0) && <p className="mt-3 text-sm text-slate-400">No hay checks recientes.</p>}
          <ul className="mt-4 space-y-3">
            {status?.services.map((service) => (
              <li key={service.id} className="flex items-start justify-between rounded-lg border border-slate-800 p-4">
                <div>
                  <p className="font-medium">{service.serviceName}</p>
                  <p className="text-sm text-slate-400">
                    {service.responseMs !== null ? `${service.responseMs} ms` : "Sin latencia"} - {new Date(service.checkedAt).toLocaleTimeString()}
                  </p>
                  {service.errorMessage && <p className="mt-1 text-sm text-rose-300">{service.errorMessage}</p>}
                </div>
                <span className={`mt-1 inline-block h-3 w-3 rounded-full ${getBadgeClass(service.status)}`} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-medium">Incidentes activos</h2>
          {incidents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No hay incidentes abiertos.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <li key={incident.id} className="rounded-lg border border-slate-800 p-4">
                  <p className="font-medium">{incident.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{incident.serviceName}</p>
                  <p className="mt-1 text-sm text-slate-400">{incident.description ?? "Sin descripción"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
