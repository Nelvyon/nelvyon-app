"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface ScoringRule {
  id: string;
  name: string;
  category: "demographic" | "behavioral" | "engagement" | "firmographic";
  condition: string;
  points: number;
  active: boolean;
}

interface ScoredLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  score: number;
  grade: "A" | "B" | "C" | "D";
  topReasons: string[];
  lastActivity: string;
}

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-400 bg-green-500/10 border-green-500/20",
  B: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  C: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  D: "text-red-400 bg-red-500/10 border-red-500/20",
};

const CAT_LABEL: Record<string, string> = {
  demographic: "Demográfico",
  behavioral: "Comportamiento",
  engagement: "Engagement",
  firmographic: "Firmográfico",
};

const DEFAULT_RULES: ScoringRule[] = [
  { id: "r1", name: "Abrió email", category: "engagement", condition: "email.opened = true", points: 5, active: true },
  { id: "r2", name: "Hizo clic en email", category: "engagement", condition: "email.clicked = true", points: 10, active: true },
  { id: "r3", name: "Visitó página de precios", category: "behavioral", condition: "page.visited = /precios", points: 20, active: true },
  { id: "r4", name: "Rellenó formulario", category: "behavioral", condition: "form.submitted = true", points: 30, active: true },
  { id: "r5", name: "Empresa > 50 empleados", category: "firmographic", condition: "company.size >= 50", points: 15, active: true },
  { id: "r6", name: "Cargo directivo", category: "demographic", condition: "contact.position IN [CEO, CMO, Director]", points: 25, active: true },
  { id: "r7", name: "País objetivo", category: "demographic", condition: "contact.country IN [ES, MX, AR, CO]", points: 10, active: true },
  { id: "r8", name: "Reservó demo", category: "behavioral", condition: "appointment.booked = true", points: 50, active: true },
  { id: "r9", name: "Inactivo 30 días", category: "behavioral", condition: "last_activity > 30d", points: -15, active: true },
  { id: "r10", name: "Email rebotó", category: "engagement", condition: "email.bounced = true", points: -20, active: false },
];


function RuleRow({ rule, onToggle }: { rule: ScoringRule; onToggle: (id: string) => void }) {
  return (
    <tr className="border-b border-border hover:bg-muted/10 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">{rule.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{rule.condition}</p>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{CAT_LABEL[rule.category]}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-sm font-bold ${rule.points > 0 ? "text-green-400" : "text-red-400"}`}>
          {rule.points > 0 ? "+" : ""}{rule.points} pts
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggle(rule.id)}
          className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors ${rule.active ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${rule.active ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </td>
    </tr>
  );
}

export default function SaasLeadScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>(DEFAULT_RULES);
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"leads" | "rules">("leads");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/lead-scoring/leads");
      if (res.ok) {
        const d = (await res.json()) as { leads?: ScoredLead[]; contacts?: ScoredLead[] };
        setLeads(d.leads ?? d.contacts ?? []);
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }

  const totalPossible = rules.filter(r => r.active && r.points > 0).reduce((s, r) => s + r.points, 0);
  const gradeCount = { A: 0, B: 0, C: 0, D: 0 };
  leads.forEach(l => gradeCount[l.grade]++);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="lead-scoring" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader
                title="Lead Scoring"
                subtitle="Puntúa automáticamente tus leads para priorizar los más calientes"
              />
              <NelvyonDsButton>+ Nueva regla</NelvyonDsButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <NelvyonDsCard className="p-4">
                <p className="text-xs text-muted-foreground">Puntuación máx.</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{totalPossible}</p>
              </NelvyonDsCard>
              {(["A", "B", "C", "D"] as const).map(g => (
                <NelvyonDsCard key={g} className={`p-4 border ${GRADE_COLOR[g].split(" ").slice(1).join(" ")}`}>
                  <p className="text-xs text-muted-foreground">Grado {g}</p>
                  <p className={`mt-1 text-2xl font-bold ${GRADE_COLOR[g].split(" ")[0]}`}>{gradeCount[g]}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(["leads", "rules"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {t === "leads" ? `Leads puntuados (${leads.length})` : `Reglas (${rules.filter(r => r.active).length}/${rules.length})`}
                </button>
              ))}
            </div>

            {tab === "leads" ? (
              loading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
              ) : (
                <div className="space-y-3">
                  {leads.sort((a, b) => b.score - a.score).map(lead => (
                    <NelvyonDsCard key={lead.id} className="p-4">
                      <div className="flex flex-wrap items-start gap-4">
                        {/* Grade circle */}
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold ${GRADE_COLOR[lead.grade]}`}>
                          {lead.grade}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{lead.name}</p>
                            {lead.company && <span className="text-xs text-muted-foreground">· {lead.company}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lead.topReasons.map(r => (
                              <span key={r} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{r}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{lead.score}</p>
                          <p className="text-xs text-muted-foreground">puntos</p>
                          <div className="mt-1 h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (lead.score / totalPossible) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </NelvyonDsCard>
                  ))}
                </div>
              )
            ) : (
              <NelvyonDsCard className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Regla</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Puntos</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Activa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(r => <RuleRow key={r.id} rule={r} onToggle={toggleRule} />)}
                    </tbody>
                  </table>
                </div>
              </NelvyonDsCard>
            )}
    </SaasShellLayout>
  );
}
