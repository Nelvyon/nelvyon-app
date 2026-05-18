import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap, ChevronDown, ChevronUp, Check, Lock, Crown, Star, Sparkles,
} from "lucide-react";
import type { ClientAgent, PlanTier } from "@/lib/client-agents-data";
import { PLAN_LABELS } from "@/lib/client-agents-data";

interface Props {
  agent: ClientAgent;
  userPlan: PlanTier;
  isActive: boolean;
  onToggle: (id: string) => void;
}

export function AgentMarketplaceCard({ agent, userPlan, isActive, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);

  const planHierarchy: PlanTier[] = ["starter", "pro", "enterprise"];
  const userPlanIndex = planHierarchy.indexOf(userPlan);
  const agentPlanIndex = planHierarchy.indexOf(agent.plan);
  const isLocked = agentPlanIndex > userPlanIndex;

  const planBadgeColor: Record<PlanTier, string> = {
    starter: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    pro: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    enterprise: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isLocked
          ? "bg-[#0A0F1C]/60 border-slate-800/40 opacity-70"
          : isActive
          ? `bg-[#0F1419] ${agent.borderColor} border-opacity-40 shadow-lg`
          : "bg-[#0F1419] border-blue-500/[0.06] hover:border-blue-500/20"
      }`}
    >
      {/* Glow effect when active */}
      {isActive && !isLocked && (
        <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-[0.03] pointer-events-none`} />
      )}

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
            <agent.icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide">{agent.name}</h3>
              {agent.popular && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">
                  <Star className="w-2.5 h-2.5 mr-0.5" /> Popular
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{agent.subtitle}</p>
          </div>
          <Badge className={`${planBadgeColor[agent.plan]} text-[9px] px-2 py-0.5 shrink-0`}>
            {agent.plan === "enterprise" && <Crown className="w-2.5 h-2.5 mr-0.5" />}
            {agent.plan === "pro" && <Sparkles className="w-2.5 h-2.5 mr-0.5" />}
            {PLAN_LABELS[agent.plan]}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{agent.description}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {agent.metrics.map((m) => (
            <div key={m.label} className="bg-[#0A0F1C] rounded-lg px-2.5 py-1.5 border border-blue-500/[0.04]">
              <p className="text-[10px] text-slate-600">{m.label}</p>
              <p className={`text-sm font-bold ${agent.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Expandable capabilities */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors mb-3"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Ocultar" : "Ver"} {agent.capabilities.length} capacidades
        </button>

        {expanded && (
          <div className="space-y-1 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {agent.capabilities.map((cap) => (
              <div key={cap} className="flex items-start gap-1.5">
                <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-[10px] text-slate-400">{cap}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        {isLocked ? (
          <Button
            disabled
            className="w-full bg-slate-800/50 text-slate-500 border border-slate-700/30 cursor-not-allowed"
            size="sm"
          >
            <Lock className="w-3 h-3 mr-1.5" />
            Requiere Plan {PLAN_LABELS[agent.plan]}
          </Button>
        ) : (
          <Button
            onClick={() => onToggle(agent.id)}
            className={`w-full transition-all duration-200 ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25"
            }`}
            size="sm"
          >
            {isActive ? (
              <>
                <Zap className="w-3 h-3 mr-1.5" /> Activo
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1.5" /> Activar Agente
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}