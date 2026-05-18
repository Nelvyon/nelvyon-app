import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { hexToRgba } from "@/lib/theme-engine";
import {
  History, RotateCcw, Eye, ChevronDown, ChevronUp,
  Clock, User, FileText, CheckCircle2, AlertCircle,
  GitBranch, Diff, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AssetVersion {
  id: number;
  version: number;
  title: string;
  content_preview: string;
  created_at: string;
  created_by: string;
  change_summary: string;
  quality_score?: number;
  status: "current" | "previous" | "archived";
  size_bytes?: number;
}

interface AssetVersionHistoryProps {
  assetId: number;
  assetTitle: string;
  onClose: () => void;
  onRollback?: (versionId: number) => void;
}

export default function AssetVersionHistory({ assetId, assetTitle, onClose, onRollback }: AssetVersionHistoryProps) {
  const { colors } = useTheme();
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<AssetVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[number | null, number | null]>([null, null]);
  const [rolling, setRolling] = useState(false);

  // Generate mock version history based on asset
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const now = new Date();
      const mockVersions: AssetVersion[] = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(now.getTime() - i * 86400000 * (1 + Math.random() * 3));
        return {
          id: assetId * 100 + i,
          version: 5 - i,
          title: `${assetTitle} v${5 - i}.0`,
          content_preview: i === 0
            ? "Versión actual con todas las mejoras aplicadas."
            : `Versión ${5 - i} — ${["Corrección de formato", "Actualización de contenido", "Revisión de estilo", "Versión inicial"][Math.min(i - 1, 3)]}`,
          created_at: d.toISOString(),
          created_by: ["admin@nelvyon.com", "editor@nelvyon.com", "manager@nelvyon.com"][i % 3],
          change_summary: [
            "Mejoras de calidad y formato final",
            "Actualización de secciones principales",
            "Correcciones menores de estilo",
            "Revisión completa del contenido",
            "Versión inicial del asset",
          ][i],
          quality_score: Math.max(60, 95 - i * 8 + Math.floor(Math.random() * 5)),
          status: i === 0 ? "current" : i < 3 ? "previous" : "archived",
          size_bytes: 1024 * (50 + Math.floor(Math.random() * 200)),
        };
      });
      setVersions(mockVersions);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [assetId, assetTitle]);

  const handleRollback = useCallback(async (versionId: number) => {
    setRolling(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success("Rollback completado — versión restaurada");
    onRollback?.(versionId);
    setRolling(false);
  }, [onRollback]);

  const toggleCompare = useCallback((versionId: number) => {
    setCompareVersions(prev => {
      if (prev[0] === versionId) return [null, prev[1]];
      if (prev[1] === versionId) return [prev[0], null];
      if (!prev[0]) return [versionId, prev[1]];
      return [prev[0], versionId];
    });
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: hexToRgba(colors.info, 0.1) }}>
            <History className="w-5 h-5" style={{ color: colors.info }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: colors.textPrimary }}>Historial de Versiones</h3>
            <p className="text-[11px]" style={{ color: colors.textMuted }}>{assetTitle} — {versions.length} versiones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            className={cn("text-xs h-7", compareMode && "ring-1")}
            style={compareMode ? { borderColor: colors.info, color: colors.info } : {}}
          >
            <Diff className="w-3.5 h-3.5 mr-1" />
            Comparar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-7">
            Cerrar
          </Button>
        </div>
      </div>

      {/* Compare Bar */}
      {compareMode && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: hexToRgba(colors.info, 0.05), borderBottom: `1px solid ${colors.border}` }}>
          <GitBranch className="w-3.5 h-3.5" style={{ color: colors.info }} />
          <span className="text-[11px]" style={{ color: colors.info }}>
            Selecciona 2 versiones para comparar
            {compareVersions[0] && compareVersions[1] && " — Comparación lista"}
          </span>
        </div>
      )}

      {/* Version List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.04) }} />
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {versions.map((v, idx) => {
              const isSelected = selectedVersion?.id === v.id;
              const isCompareSelected = compareVersions.includes(v.id);
              return (
                <div
                  key={v.id}
                  className={cn(
                    "rounded-xl p-3 transition-all duration-200 cursor-pointer",
                    isSelected && "ring-1",
                    isCompareSelected && "ring-1",
                  )}
                  style={{
                    backgroundColor: isSelected
                      ? hexToRgba(colors.secondary, 0.06)
                      : isCompareSelected
                        ? hexToRgba(colors.info, 0.06)
                        : hexToRgba(colors.textPrimary, 0.02),
                    borderColor: isSelected ? colors.secondary : isCompareSelected ? colors.info : "transparent",
                    border: `1px solid ${isSelected ? hexToRgba(colors.secondary, 0.2) : isCompareSelected ? hexToRgba(colors.info, 0.2) : colors.border}`,
                  }}
                  onClick={() => {
                    if (compareMode) {
                      toggleCompare(v.id);
                    } else {
                      setSelectedVersion(isSelected ? null : v);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                        style={{
                          backgroundColor: v.status === "current"
                            ? hexToRgba(colors.success, 0.15)
                            : hexToRgba(colors.textPrimary, 0.06),
                          color: v.status === "current" ? colors.success : colors.textMuted,
                        }}
                      >
                        v{v.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold" style={{ color: colors.textPrimary }}>{v.change_summary}</span>
                          {v.status === "current" && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1" style={{ borderColor: hexToRgba(colors.success, 0.3), color: colors.success }}>
                              ACTUAL
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] flex items-center gap-0.5" style={{ color: colors.textMuted }}>
                            <User className="w-2.5 h-2.5" /> {v.created_by.split("@")[0]}
                          </span>
                          <span className="text-[10px] flex items-center gap-0.5" style={{ color: colors.textMuted }}>
                            <Clock className="w-2.5 h-2.5" /> {formatDate(v.created_at)}
                          </span>
                          <span className="text-[10px]" style={{ color: colors.textMuted }}>
                            {formatSize(v.size_bytes)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.quality_score !== undefined && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: hexToRgba(v.quality_score >= 80 ? colors.success : v.quality_score >= 60 ? colors.warning : colors.error, 0.1),
                            color: v.quality_score >= 80 ? colors.success : v.quality_score >= 60 ? colors.warning : colors.error,
                          }}
                        >
                          QA {v.quality_score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isSelected && !compareMode && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${colors.border}` }}>
                      <p className="text-[11px]" style={{ color: colors.textSecondary }}>{v.content_preview}</p>
                      <div className="flex items-center gap-2">
                        {v.status !== "current" && (
                          <Button
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            disabled={rolling}
                            onClick={(e) => { e.stopPropagation(); handleRollback(v.id); }}
                            style={{ backgroundColor: colors.warning, color: "#000" }}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {rolling ? "Restaurando..." : "Rollback"}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
                          <Eye className="w-3 h-3 mr-1" /> Ver completo
                        </Button>
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
                          <Download className="w-3 h-3 mr-1" /> Exportar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compare Result */}
      {compareMode && compareVersions[0] && compareVersions[1] && (
        <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="grid grid-cols-2 gap-3">
            {compareVersions.map((vId, ci) => {
              const v = versions.find(x => x.id === vId);
              if (!v) return null;
              return (
                <div key={ci} className="rounded-lg p-3" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.03), border: `1px solid ${colors.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: hexToRgba(colors.info, 0.1), color: colors.info }}>v{v.version}</span>
                    <span className="text-[11px] font-medium" style={{ color: colors.textPrimary }}>{v.change_summary}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: colors.textMuted }}>{v.content_preview}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[9px]" style={{ color: colors.textMuted }}>QA: {v.quality_score}</span>
                    <span className="text-[9px]" style={{ color: colors.textMuted }}>{formatSize(v.size_bytes)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px]" style={{ color: colors.textMuted }}>
              Diferencia de calidad: {(() => {
                const v1 = versions.find(x => x.id === compareVersions[0]);
                const v2 = versions.find(x => x.id === compareVersions[1]);
                const diff = (v1?.quality_score || 0) - (v2?.quality_score || 0);
                return diff > 0 ? `+${diff} puntos` : `${diff} puntos`;
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}