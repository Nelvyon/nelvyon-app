import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import DataStateWrapper from "@/components/DataStateWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail, Send, Search, BarChart3, Users, TrendingUp,
  Loader2, Sparkles, Clock, CheckCircle2,
  Target, RefreshCw, Brain
} from "lucide-react";
import { api, type NelvyonProject, type NelvyonOutput } from "@/lib/api";
import { callAI } from "@/lib/ai-helper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";

export default function SaasMarketing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { ts } = useI18n();

  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [outputs, setOutputs] = useState<NelvyonOutput[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [aiCopy, setAiCopy] = useState<{ subject_lines: string[]; body_preview: string; tips: string[] } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [p, o] = await Promise.all([
        api.getProjects(),
        api.getOutputs(0, 100),
      ]);
      setProjects(p.items || []);
      setOutputs((o.items || []).filter((x) => x.output_type === "email_marketing"));
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("errorOccurred"));
    } finally {
      setLoadingData(false);
    }
  }, [ts]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    if (!selectedProject) {
      toast.error(ts("selectProject"));
      return;
    }
    setGenerating(true);
    try {
      await api.generateEmailMarketing(selectedProject);
      toast.success(ts("campaignGenerated"));
      loadData();
    } catch (err) {
      toast.error(ts("errorOccurred"));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateCopy = async () => {
    setGeneratingAI(true);
    try {
      const result = await callAI({
        prompt: `Generate email marketing copy for a digital agency SaaS platform. Include 3 subject lines, a body preview, and 3 optimization tips. Respond in JSON: {"subject_lines":["..."],"body_preview":"...","tips":["..."]}`,
        system: "You are an expert email marketing copywriter. Always respond in valid JSON.",
      });
      if (result.ok) {
        try {
          setAiCopy(JSON.parse(result.text));
        } catch (err) {
          setAiCopy({ subject_lines: [result.text], body_preview: "", tips: [] });
        }
        toast.success(ts("generated"));
      } else {
        toast.error(result.error || ts("errorOccurred"));
      }
    } catch (err) {
      toast.error(ts("errorOccurred"));
    } finally {
      setGeneratingAI(false);
    }
  };

  const emailOutputs = outputs.filter((o) =>
    !search || (o.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalCampaigns: emailOutputs.length,
    approved: emailOutputs.filter((o) => o.qa_status === "passed").length,
    pending: emailOutputs.filter((o) => o.qa_status === "pending").length,
    avgScore: emailOutputs.length > 0
      ? Math.round(emailOutputs.reduce((acc, o) => acc + (o.qa_score || 0), 0) / emailOutputs.length)
      : 0,
  };

  return (
    <SaasLayout title={ts("emailMarketing")} subtitle={ts("marketingDashboard")}>
      <div className="space-y-5">
        <InlineServiceDemo serviceKey="email_marketing" serviceName={ts("emailMarketing")} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: ts("campaigns"), value: stats.totalCampaigns, icon: Mail, color: "text-blue-400" },
            { label: ts("active"), value: stats.approved, icon: CheckCircle2, color: "text-emerald-400" },
            { label: ts("status"), value: stats.pending, icon: Clock, color: "text-amber-400" },
            { label: ts("qualityScore"), value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—", icon: Target, color: "text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <s.icon className={cn("w-4 h-4", s.color)} />
                <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* AI Copy Panel */}
        {aiCopy && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-white">{ts("generateCopy")} — {ts("aiPowered")}</span>
            </div>
            {aiCopy.subject_lines?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-violet-400 font-semibold mb-1">Subject Lines</p>
                {aiCopy.subject_lines.map((s, i) => (
                  <p key={i} className="text-[11px] text-zinc-300 mb-0.5">📧 {s}</p>
                ))}
              </div>
            )}
            {aiCopy.body_preview && (
              <div className="mb-3">
                <p className="text-[10px] text-blue-400 font-semibold mb-1">Body Preview</p>
                <p className="text-[11px] text-zinc-300">{aiCopy.body_preview}</p>
              </div>
            )}
            {aiCopy.tips?.length > 0 && (
              <div>
                <p className="text-[10px] text-emerald-400 font-semibold mb-1">{ts("recommendations")}</p>
                {aiCopy.tips.map((t, i) => (
                  <p key={i} className="text-[10px] text-zinc-400">• {t}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate Section */}
        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                {ts("generateCampaign")}
              </h3>
              <p className="text-[11px] text-white/40 mt-1">
                Automated sequences, A/B testing, advanced segmentation
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white flex-1 sm:flex-none sm:w-48"
                value={selectedProject ?? ""}
                onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{ts("selectProject")}...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Button onClick={handleGenerate} disabled={generating || !selectedProject}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm whitespace-nowrap">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                {ts("create")}
              </Button>
              <Button onClick={handleGenerateCopy} disabled={generatingAI} variant="outline"
                className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 text-sm whitespace-nowrap">
                {generatingAI ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Brain className="w-4 h-4 mr-1" />}
                {ts("generateCopy")}
              </Button>
            </div>
          </div>
        </div>

        {/* Search & List */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input placeholder={ts("search") + "..."} value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-white/40">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <DataStateWrapper loading={loadingData} error={error} empty={emailOutputs.length === 0}
          emptyMessage={ts("noData")} onRetry={loadData}
          emptyIcon={<Mail className="w-8 h-8 text-zinc-500" />}>
          <div className="space-y-3">
            {emailOutputs.map((o) => {
              let parsed: Record<string, unknown> | null = null;
              try { parsed = JSON.parse(o.content || "{}"); } catch (err) { /* ignore */ }
              const strategy = parsed?.strategy as Record<string, unknown> | undefined;
              const sequences = (parsed?.sequences as unknown[]) || [];
              const campaigns = (parsed?.campaigns as unknown[]) || [];

              return (
                <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{o.title || `Campaign #${o.id}`}</h4>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {o.created_at && new Date(o.created_at).toLocaleDateString()}
                          {strategy?.objective && ` · ${String(strategy.objective).slice(0, 60)}...`}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-blue-500/10 text-blue-400 text-[9px]">{sequences.length} sequences</Badge>
                          <Badge className="bg-violet-500/10 text-violet-400 text-[9px]">{campaigns.length} {ts("campaigns")}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.qa_score !== undefined && o.qa_score > 0 && (
                        <Badge className={cn("text-[10px]",
                          o.qa_score >= 90 ? "bg-emerald-500/10 text-emerald-400" :
                          o.qa_score >= 70 ? "bg-amber-500/10 text-amber-400" :
                          "bg-red-500/10 text-red-400"
                        )}>{o.qa_score}/100</Badge>
                      )}
                      <Badge className={cn("text-[10px]",
                        o.qa_status === "passed" ? "bg-emerald-500/10 text-emerald-400" :
                        o.qa_status === "failed" ? "bg-red-500/10 text-red-400" :
                        "bg-amber-500/10 text-amber-400"
                      )}>{o.qa_status || "pending"}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataStateWrapper>

        {/* Features */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">{ts("features")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              "Welcome Sequences", "Nurture Sequences", "Reactivation",
              "A/B Testing Subjects", "Advanced Segmentation", "Automations",
              "Responsive Templates", "Dark Mode Emails", "Dynamic Personalization",
              "Open Rate > 35%", "CTR > 5%", "GDPR Compliant",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SaasLayout>
  );
}