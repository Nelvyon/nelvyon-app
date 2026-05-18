/**
 * E2ERelationshipPanel — Shows the full entity chain for a client.
 * Fetches from /e2e/full-chain/{client_id} and displays a collapsible tree.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FolderKanban, FileText, Share2, LifeBuoy, Image,
  Handshake, Megaphone, Package, ChevronDown, ChevronRight,
  Loader2, X, ExternalLink, AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { buildE2EUrl } from "@/lib/e2e-flow";
import { cn } from "@/lib/utils";

interface E2ERelationshipPanelProps {
  clientId: number;
  clientName?: string;
  onClose?: () => void;
  className?: string;
}

interface FullChainData {
  client: Record<string, unknown> | null;
  projects: Array<Record<string, unknown>>;
  outputs: Array<Record<string, unknown>>;
  assets: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  social_posts: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  total_entities: number;
}

type SectionKey = "projects" | "outputs" | "assets" | "contracts" | "social_posts" | "tickets" | "deals" | "campaigns";

const SECTIONS: Array<{
  key: SectionKey;
  label: string;
  icon: React.ElementType;
  color: string;
  path: string;
  nameField: string;
}> = [
  { key: "projects", label: "Proyectos", icon: FolderKanban, color: "text-blue-400", path: "/projects", nameField: "name" },
  { key: "outputs", label: "Outputs", icon: Package, color: "text-purple-400", path: "/generator", nameField: "title" },
  { key: "assets", label: "Assets", icon: Image, color: "text-teal-400", path: "/assets", nameField: "file_name" },
  { key: "contracts", label: "Contratos", icon: FileText, color: "text-amber-400", path: "/saas/contracts", nameField: "title" },
  { key: "social_posts", label: "Social Posts", icon: Share2, color: "text-pink-400", path: "/saas/social", nameField: "platform" },
  { key: "tickets", label: "Tickets", icon: LifeBuoy, color: "text-cyan-400", path: "/saas/helpdesk", nameField: "subject" },
  { key: "deals", label: "Deals", icon: Handshake, color: "text-orange-400", path: "/crm/deals", nameField: "title" },
  { key: "campaigns", label: "Campañas", icon: Megaphone, color: "text-rose-400", path: "/crm/campaigns", nameField: "name" },
];

export default function E2ERelationshipPanel({
  clientId,
  clientName,
  onClose,
  className,
}: E2ERelationshipPanelProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<FullChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["projects"]));

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getFullChain(clientId)
      .then(setData)
      .catch(() => setError("Error al cargar cadena E2E"))
      .finally(() => setLoading(false));
  }, [clientId]);

  const toggleSection = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getStatusBadge = (status?: unknown) => {
    if (!status || typeof status !== "string") return null;
    const colors: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400",
      completed: "bg-blue-500/20 text-blue-400",
      draft: "bg-zinc-500/20 text-zinc-400",
      open: "bg-yellow-500/20 text-yellow-400",
      closed: "bg-red-500/20 text-red-400",
      cancelled: "bg-red-500/20 text-red-400",
      signed: "bg-emerald-500/20 text-emerald-400",
      published: "bg-emerald-500/20 text-emerald-400",
      scheduled: "bg-blue-500/20 text-blue-400",
      in_progress: "bg-yellow-500/20 text-yellow-400",
      won: "bg-emerald-500/20 text-emerald-400",
      lost: "bg-red-500/20 text-red-400",
    };
    return (
      <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full font-medium", colors[status] || "bg-zinc-500/20 text-zinc-400")}>
        {status}
      </span>
    );
  };

  return (
    <div className={cn(
      "bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden",
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">
            {clientName || `Cliente #${clientId}`}
          </span>
          {data && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">
              {data.total_entities} entidades
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-zinc-700/50 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2 max-h-[60vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span className="ml-2 text-xs text-zinc-500">Cargando cadena E2E...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {data && !loading && SECTIONS.map(({ key, label, icon: Icon, color, path, nameField }) => {
          const items = data[key] || [];
          if (items.length === 0) return null;
          const isExpanded = expanded.has(key);

          return (
            <div key={key} className="mb-1">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="w-3 h-3 text-zinc-500" />
                  : <ChevronRight className="w-3 h-3 text-zinc-500" />
                }
                <Icon className={cn("w-3.5 h-3.5", color)} />
                <span className="text-[11px] font-medium text-zinc-300">{label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 font-medium ml-auto">
                  {items.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-6 space-y-0.5 mb-1">
                  {items.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        const params: Record<string, string | number | undefined> = {
                          client_id: clientId,
                        };
                        if (item.project_id) params.project_id = item.project_id as number;
                        if (item.id && key === "projects") params.project_id = item.id as number;
                        navigate(buildE2EUrl(path, params));
                      }}
                    >
                      <span className="text-[10px] text-zinc-500 w-5">#{String(item.id)}</span>
                      <span className="text-[10px] text-zinc-300 truncate flex-1">
                        {String(item[nameField] || item.title || item.name || `#${item.id}`)}
                      </span>
                      {getStatusBadge(item.status || item.qa_status || item.stage)}
                      <ExternalLink className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                  {items.length > 10 && (
                    <span className="text-[9px] text-zinc-600 px-2">
                      +{items.length - 10} más...
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {data && !loading && data.total_entities === 0 && (
          <div className="text-center py-6 text-xs text-zinc-600">
            Sin entidades vinculadas a este cliente
          </div>
        )}
      </div>
    </div>
  );
}