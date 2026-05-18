/**
 * E2E Context Banner v3
 * Shows persistent E2E relationships and enables cross-module navigation with real context.
 * Full chain: client → project → output → contract → social → helpdesk
 * CRM bridge: contact ↔ client, deal ↔ project, campaign ↔ project
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users, FolderKanban, FileText, Share2, LifeBuoy, ChevronRight,
  ArrowRight, Link2, AlertTriangle, Zap, Loader2, Image, Handshake,
  Megaphone, Package,
} from "lucide-react";
import {
  parseE2EParams, buildE2EUrl, isProjectBlocked,
  type E2ERelationship, type E2ERelationshipCounts,
} from "@/lib/e2e-flow";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface E2EContextBannerProps {
  /** Override context from parent component */
  context?: Partial<E2ERelationship>;
  /** Show the "launch to next module" actions */
  showActions?: boolean;
  /** Current module identifier */
  currentModule?: "contracts" | "social" | "helpdesk" | "projects" | "assets" | "deals";
  /** Compact mode — less padding, smaller text */
  compact?: boolean;
}

export default function E2EContextBanner({
  context,
  showActions = true,
  currentModule,
  compact = false,
}: E2EContextBannerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = parseE2EParams(location.search);
  const [projectBlocked, setProjectBlocked] = useState(false);
  const [relationships, setRelationships] = useState<E2ERelationshipCounts | null>(null);
  const [loadingRels, setLoadingRels] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Merge URL params with context override
  const merged: E2ERelationship = {
    client_id: context?.client_id ?? urlParams.client_id,
    client_name: context?.client_name,
    project_id: context?.project_id ?? urlParams.project_id,
    project_name: context?.project_name,
    project_status: context?.project_status,
    contract_id: context?.contract_id ?? urlParams.contract_id,
    contract_title: context?.contract_title,
    campaign_name: context?.campaign_name ?? urlParams.campaign_name,
    social_post_id: context?.social_post_id ?? urlParams.social_post_id,
    ticket_id: context?.ticket_id,
    deal_id: context?.deal_id ?? urlParams.deal_id,
    contact_id: context?.contact_id ?? urlParams.contact_id,
  };

  const hasContext = !!(
    merged.client_id || merged.project_id || merged.contract_id ||
    merged.social_post_id || merged.deal_id || merged.contact_id
  );

  // Load project relationships if we have a project_id
  useEffect(() => {
    if (!merged.project_id) return;
    setLoadingRels(true);
    api.getProjectRelationships(merged.project_id)
      .then((data) => {
        setRelationships({
          outputs_count: data.outputs_count,
          assets_count: data.assets_count ?? 0,
          contracts_count: data.contracts_count,
          social_posts_count: data.social_posts_count,
          tickets_count: data.tickets_count,
          deals_count: data.deals_count ?? 0,
          campaigns_count: data.campaigns_count ?? 0,
        });
        if (data.client_name && !merged.client_name) {
          merged.client_name = data.client_name;
        }
        if (data.project_name && !merged.project_name) {
          merged.project_name = data.project_name;
        }
        if (data.project_status) {
          setProjectBlocked(isProjectBlocked(data.project_status));
        }
      })
      .catch(() => { /* non-critical */ })
      .finally(() => setLoadingRels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged.project_id]);

  if (!hasContext) return null;

  // Build context params for navigation
  const contextParams: Record<string, string | number | undefined> = {
    client_id: merged.client_id,
    project_id: merged.project_id,
    contract_id: merged.contract_id,
    campaign_name: merged.campaign_name,
    social_post_id: merged.social_post_id,
    deal_id: merged.deal_id,
  };

  // E2E Action handlers
  const handleCreateContract = async () => {
    if (!merged.project_id) return;
    setActionLoading("contract");
    try {
      const result = await api.createContractFromProject(merged.project_id);
      toast.success(result.message);
      navigate(buildE2EUrl("/saas/contracts", {
        ...contextParams,
        contract_id: result.contract_id,
        source: "project",
      }));
    } catch {
      toast.error("Error al crear contrato");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSocial = async () => {
    if (!merged.contract_id) return;
    setActionLoading("social");
    try {
      const result = await api.createSocialFromContract(merged.contract_id);
      toast.success(result.message);
      navigate(buildE2EUrl("/saas/social", {
        ...contextParams,
        social_post_id: result.social_post_id,
        source: "contract",
      }));
    } catch {
      toast.error("Error al crear post social");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTicket = async () => {
    if (!merged.social_post_id) return;
    setActionLoading("ticket");
    try {
      const result = await api.createTicketFromSocial(merged.social_post_id);
      toast.success(result.message);
      navigate(buildE2EUrl("/saas/helpdesk", {
        ...contextParams,
        source: "social_incident",
      }));
    } catch {
      toast.error("Error al crear ticket");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateDeal = async () => {
    if (!merged.project_id) return;
    setActionLoading("deal");
    try {
      const result = await api.createDealFromProject(merged.project_id);
      toast.success(result.message);
      navigate(buildE2EUrl("/crm/deals", {
        ...contextParams,
        deal_id: result.deal_id,
        source: "project",
      }));
    } catch {
      toast.error("Error al crear deal");
    } finally {
      setActionLoading(null);
    }
  };

  const chipClass = compact
    ? "text-[8px] px-1.5 py-0.5"
    : "text-[9px] px-2 py-0.5";
  const chevronSize = compact ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div className={cn(
      "rounded-xl bg-gradient-to-r from-violet-500/[0.06] to-cyan-500/[0.06] border border-violet-500/10",
      compact ? "mb-2 p-2" : "mb-4 p-3",
    )}>
      {/* Relationship Chain */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Link2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider mr-1">E2E v3</span>

        {(merged.client_name || merged.client_id) && (
          <>
            <span className={cn(chipClass, "rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium flex items-center gap-1")}>
              <Users className="w-2.5 h-2.5" /> {merged.client_name || `Cliente #${merged.client_id}`}
            </span>
            <ChevronRight className={cn(chevronSize, "text-zinc-600")} />
          </>
        )}

        {(merged.project_name || merged.project_id) && (
          <>
            <span className={cn(chipClass, "rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1")}>
              <FolderKanban className="w-2.5 h-2.5" /> {merged.project_name || `Proyecto #${merged.project_id}`}
            </span>
            <ChevronRight className={cn(chevronSize, "text-zinc-600")} />
          </>
        )}

        {(merged.contract_title || merged.contract_id) && (
          <>
            <span className={cn(chipClass, "rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1")}>
              <FileText className="w-2.5 h-2.5" /> {merged.contract_title || `Contrato #${merged.contract_id}`}
            </span>
            <ChevronRight className={cn(chevronSize, "text-zinc-600")} />
          </>
        )}

        {merged.campaign_name && (
          <>
            <span className={cn(chipClass, "rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium flex items-center gap-1")}>
              <Megaphone className="w-2.5 h-2.5" /> {merged.campaign_name}
            </span>
            <ChevronRight className={cn(chevronSize, "text-zinc-600")} />
          </>
        )}

        {merged.social_post_id && (
          <>
            <span className={cn(chipClass, "rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1")}>
              <Share2 className="w-2.5 h-2.5" /> Post #{merged.social_post_id}
            </span>
            <ChevronRight className={cn(chevronSize, "text-zinc-600")} />
          </>
        )}

        {merged.ticket_id && (
          <span className={cn(chipClass, "rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium flex items-center gap-1")}>
            <LifeBuoy className="w-2.5 h-2.5" /> Ticket #{merged.ticket_id}
          </span>
        )}

        {merged.deal_id && (
          <span className={cn(chipClass, "rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium flex items-center gap-1")}>
            <Handshake className="w-2.5 h-2.5" /> Deal #{merged.deal_id}
          </span>
        )}
      </div>

      {/* Relationship Counts */}
      {relationships && (
        <div className="flex items-center gap-3 mb-2 text-[8px] text-zinc-500 flex-wrap">
          {loadingRels ? (
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
          ) : (
            <>
              <span className="flex items-center gap-0.5"><Package className="w-2.5 h-2.5" /> {relationships.outputs_count} outputs</span>
              <span className="flex items-center gap-0.5"><Image className="w-2.5 h-2.5" /> {relationships.assets_count} assets</span>
              <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {relationships.contracts_count} contratos</span>
              <span className="flex items-center gap-0.5"><Share2 className="w-2.5 h-2.5" /> {relationships.social_posts_count} posts</span>
              <span className="flex items-center gap-0.5"><LifeBuoy className="w-2.5 h-2.5" /> {relationships.tickets_count} tickets</span>
              <span className="flex items-center gap-0.5"><Handshake className="w-2.5 h-2.5" /> {relationships.deals_count} deals</span>
              <span className="flex items-center gap-0.5"><Megaphone className="w-2.5 h-2.5" /> {relationships.campaigns_count} campañas</span>
              <span className="text-emerald-500 font-bold ml-1">Backend persistido ✓</span>
            </>
          )}
        </div>
      )}

      {/* Blocked Warning */}
      {projectBlocked && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[10px] text-red-400">
            Proyecto cerrado/cancelado — acciones downstream bloqueadas
          </span>
        </div>
      )}

      {/* Cross-module Actions */}
      {showActions && !projectBlocked && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] flex-wrap">
          {/* From Projects: Create Contract or Deal */}
          {currentModule === "projects" && merged.project_id && (
            <>
              <button
                onClick={handleCreateContract}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-400 font-medium transition-colors border border-amber-500/20 disabled:opacity-50"
              >
                {actionLoading === "contract" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                Crear Contrato <ArrowRight className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[10px] text-orange-400 font-medium transition-colors border border-orange-500/20 disabled:opacity-50"
              >
                {actionLoading === "deal" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Handshake className="w-3 h-3" />}
                Crear Deal <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </>
          )}

          {/* From Contracts: Launch to Social */}
          {currentModule === "contracts" && merged.contract_id && (
            <button
              onClick={handleCreateSocial}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[10px] text-pink-400 font-medium transition-colors border border-pink-500/20 disabled:opacity-50"
            >
              {actionLoading === "social" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
              Lanzar a Social <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
          {currentModule === "contracts" && !merged.contract_id && (
            <button
              onClick={() => navigate(buildE2EUrl("/saas/social", { ...contextParams, source: "contract" }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[10px] text-pink-400 font-medium transition-colors border border-pink-500/20"
            >
              <Share2 className="w-3 h-3" /> Ir a Social <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {/* From Social: Create Ticket */}
          {currentModule === "social" && merged.social_post_id && (
            <button
              onClick={handleCreateTicket}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] text-cyan-400 font-medium transition-colors border border-cyan-500/20 disabled:opacity-50"
            >
              {actionLoading === "ticket" ? <Loader2 className="w-3 h-3 animate-spin" /> : <LifeBuoy className="w-3 h-3" />}
              Crear Ticket <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
          {currentModule === "social" && !merged.social_post_id && (
            <button
              onClick={() => navigate(buildE2EUrl("/saas/helpdesk", { ...contextParams, source: "social_incident" }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] text-cyan-400 font-medium transition-colors border border-cyan-500/20"
            >
              <LifeBuoy className="w-3 h-3" /> Ir a Helpdesk <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {/* From Helpdesk: View source post */}
          {currentModule === "helpdesk" && merged.social_post_id && (
            <button
              onClick={() => navigate(buildE2EUrl("/saas/social", { ...contextParams }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[10px] text-pink-400 font-medium transition-colors border border-pink-500/20"
            >
              <Share2 className="w-3 h-3" /> Ver Post Origen
            </button>
          )}

          <span className="text-[8px] text-zinc-600 ml-auto flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-violet-400" /> E2E persistido en backend
          </span>
        </div>
      )}
    </div>
  );
}