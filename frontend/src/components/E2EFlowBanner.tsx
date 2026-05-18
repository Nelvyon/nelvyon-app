import { useLocation, useNavigate } from "react-router-dom";
import {
  Users, FolderKanban, Hammer, ShieldCheck, Image, FileText, Share2, LifeBuoy,
  ChevronRight, ArrowLeft, ArrowRight,
} from "lucide-react";
import { E2E_STEPS, getCurrentStepIndex } from "@/lib/e2e-flow";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<string, React.ElementType> = {
  Users, FolderKanban, Hammer, ShieldCheck, Image, FileText, Share2, LifeBuoy,
};

interface E2EFlowBannerProps {
  clientName?: string;
  projectName?: string;
  extra?: string;
}

export default function E2EFlowBanner({ clientName, projectName, extra }: E2EFlowBannerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentIdx = getCurrentStepIndex(location.pathname);

  if (currentIdx < 0) return null;

  const prevStep = currentIdx > 0 ? E2E_STEPS[currentIdx - 1] : null;
  const nextStep = currentIdx < E2E_STEPS.length - 1 ? E2E_STEPS[currentIdx + 1] : null;

  return (
    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/[0.04] to-blue-500/[0.04] border border-violet-500/10">
      {/* Flow Steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
        {E2E_STEPS.map((step, i) => {
          const Icon = STEP_ICONS[step.icon] || Users;
          const isActive = i === currentIdx;
          const isPast = i < currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={step.id} className="flex items-center shrink-0">
              <button
                onClick={() => navigate(step.path)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                  isActive && "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/10",
                  isPast && "bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/15 cursor-pointer",
                  isFuture && "bg-white/[0.02] text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-500 cursor-pointer"
                )}
              >
                <Icon className={cn("w-3 h-3", isActive && "text-violet-400", isPast && "text-emerald-500")} />
                {step.label}
              </button>
              {i < E2E_STEPS.length - 1 && (
                <ChevronRight className={cn(
                  "w-3 h-3 mx-0.5 shrink-0",
                  i < currentIdx ? "text-emerald-500/40" : "text-zinc-700"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Context References + Navigation */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-2 flex-wrap">
          {clientName && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              👤 {clientName}
            </span>
          )}
          {projectName && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              📁 {projectName}
            </span>
          )}
          {extra && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {extra}
            </span>
          )}
          {!clientName && !projectName && (
            <span className="text-[9px] text-zinc-600">Flujo E2E · Selecciona un cliente para comenzar</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {prevStep && (
            <button
              onClick={() => navigate(prevStep.path)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-2.5 h-2.5" /> {prevStep.label}
            </button>
          )}
          {nextStep && (
            <button
              onClick={() => navigate(nextStep.path)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-[9px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              {nextStep.label} <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}