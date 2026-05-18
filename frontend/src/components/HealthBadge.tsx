import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/theme-engine';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Wifi } from 'lucide-react';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'checking';

interface ServiceHealth {
  api: HealthStatus;
  db: HealthStatus;
  overall: HealthStatus;
  latencyMs: number;
  lastCheck: Date;
}

const STATUS_CONFIG: Record<HealthStatus, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  healthy: { color: '#22c55e', label: 'Online', icon: CheckCircle2 },
  degraded: { color: '#f59e0b', label: 'Degradado', icon: AlertTriangle },
  down: { color: '#ef4444', label: 'Offline', icon: XCircle },
  checking: { color: '#6b7280', label: 'Verificando...', icon: Activity },
};

export default function HealthBadge({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const [health, setHealth] = useState<ServiceHealth>({
    api: 'checking',
    db: 'checking',
    overall: 'checking',
    latencyMs: 0,
    lastCheck: new Date(),
  });
  const [showDetail, setShowDetail] = useState(false);

  const checkHealth = useCallback(async () => {
    const start = performance.now();
    let apiStatus: HealthStatus = 'down';
    let dbStatus: HealthStatus = 'down';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Try to reach the backend health endpoint
      const { getAPIBaseURL } = await import('@/lib/config');
      const base = getAPIBaseURL();
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        apiStatus = 'healthy';
        dbStatus = 'healthy'; // If API is healthy, DB is likely healthy too
      } else if (res.status < 500) {
        apiStatus = 'degraded';
        dbStatus = 'degraded';
      }
    } catch {
      // Check if it's a network issue or backend down
      try {
        await fetch('/api/config', { signal: AbortSignal.timeout(3000) });
        apiStatus = 'degraded'; // Frontend proxy works but backend doesn't
      } catch {
        apiStatus = 'down';
      }
    }

    const latency = Math.round(performance.now() - start);
    const overall: HealthStatus =
      apiStatus === 'healthy' && dbStatus === 'healthy' ? 'healthy' :
      apiStatus === 'down' && dbStatus === 'down' ? 'down' : 'degraded';

    setHealth({ api: apiStatus, db: dbStatus, overall, latencyMs: latency, lastCheck: new Date() });
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkHealth]);

  const config = STATUS_CONFIG[health.overall];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowDetail(!showDetail)} title={config.label}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
        style={{
          backgroundColor: hexToRgba(config.color, 0.1),
          border: `1px solid ${hexToRgba(config.color, 0.2)}`,
        }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
        <span className="text-[10px] font-semibold" style={{ color: config.color }}>{config.label}</span>
        {health.latencyMs > 0 && (
          <span className="text-[9px]" style={{ color: colors.textMuted }}>{health.latencyMs}ms</span>
        )}
      </button>

      {showDetail && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.borderHover}` }}
        >
          <div className="p-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <span className="text-xs font-semibold" style={{ color: colors.textPrimary }}>Estado del Sistema</span>
            <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
          </div>

          {/* Services */}
          {[
            { label: 'API Backend', status: health.api, icon: Activity },
            { label: 'Base de Datos', status: health.db, icon: Wifi },
          ].map((svc) => {
            const svcConfig = STATUS_CONFIG[svc.status];
            return (
              <div key={svc.label} className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${hexToRgba(colors.textPrimary, 0.03)}` }}>
                <div className="flex items-center gap-2">
                  <svc.icon className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-[11px]" style={{ color: colors.textSecondary }}>{svc.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: svcConfig.color }} />
                  <span className="text-[10px] font-medium" style={{ color: svcConfig.color }}>{svcConfig.label}</span>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: hexToRgba(colors.textMuted, 0.03) }}>
            <span className="text-[9px]" style={{ color: colors.textMuted }}>
              Latencia: {health.latencyMs}ms
            </span>
            <span className="text-[9px]" style={{ color: colors.textMuted }}>
              {health.lastCheck.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}