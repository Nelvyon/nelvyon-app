"use client";

export type IntegrationProvider = "google" | "meta" | "tiktok" | "linkedin";

export interface IntegrationCardProps {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  accountName?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function IntegrationCard({
  name,
  description,
  icon,
  connected,
  accountName,
  onConnect,
  onDisconnect,
  loading = false,
}: IntegrationCardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-4xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      <div className="mt-6 space-y-3">
        {connected ? (
          <>
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Conectado
            </span>
            {accountName ? (
              <p className="truncate text-sm text-slate-700" title={accountName}>
                {accountName}
              </p>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={onDisconnect}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {loading ? <Spinner /> : null}
              Desconectar
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={onConnect}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Spinner /> : null}
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}
