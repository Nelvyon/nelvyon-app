import { useEffect, useState, type ReactNode } from "react";
import SaasLayout from "@/components/SaasLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Mail, Phone, Building2, Star,
  Target, Activity as ActivityIcon, MessageSquare,
  FileText, Clock, Loader2,
} from "lucide-react";
import { api, getApiErrorMessage, type Contact } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  prospect: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  inactive: "bg-white/5 text-white/40 border-white/10",
  vip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const eventTypeConfig: Record<string, { icon: typeof Target; color: string; label: string }> = {
  deal: { icon: Target, color: "text-emerald-400", label: "Deal" },
  activity: { icon: ActivityIcon, color: "text-blue-400", label: "Activity" },
  conversation: { icon: MessageSquare, color: "text-purple-400", label: "Conversation" },
  note: { icon: FileText, color: "text-amber-400", label: "Note" },
};

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
        {sub && <p className="text-xs text-emerald-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CRMContactDetail({ contactId, onBack }: { contactId: number; onBack: () => void }) {
  const { activeWorkspace, loading: wsLoading, needsWorkspaceSelection } = useWorkspace();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [timeline, setTimeline] = useState<{
    events: { id: number; event_type: string; title: string; description?: string; status?: string; value?: number; created_at?: string; extra?: Record<string, unknown> }[];
    deals_count: number; deals_total_value: number; activities_count: number; conversations_count: number;
  } | null>(null);
  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    if (wsLoading) return;

    if (needsWorkspaceSelection) {
      setContact(null);
      setTimeline(null);
      setLoadingContact(false);
      setLoadingTimeline(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingContact(true);
      setLoadingTimeline(true);
      setContact(null);
      setTimeline(null);
      try {
        const c = await api.getContact(contactId);
        if (!cancelled) setContact(c);
      } catch (e) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(e, "Error cargando contacto"));
          setContact(null);
        }
      } finally {
        if (!cancelled) setLoadingContact(false);
      }
      try {
        const tl = await api.crmTimeline(contactId);
        if (!cancelled) setTimeline(tl);
      } catch (e) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(e, "Error cargando timeline"));
          setTimeline({
            events: [],
            deals_count: 0,
            deals_total_value: 0,
            activities_count: 0,
            conversations_count: 0,
          });
        }
      } finally {
        if (!cancelled) setLoadingTimeline(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [contactId, activeWorkspace?.id, wsLoading, needsWorkspaceSelection]);

  if (loadingContact) {
    return (
      <SaasLayout>
        <div className="space-y-6 py-4 p-4 md:p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06]" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-white/[0.08] rounded w-48" />
              <div className="h-3 bg-white/[0.04] rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
                <div className="h-3 bg-white/[0.06] rounded w-20 mb-3" />
                <div className="h-5 bg-white/[0.08] rounded w-28 mb-2" />
                <div className="h-2.5 bg-white/[0.04] rounded w-16" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-xl p-5 bg-[#0F1419] border border-white/[0.06]">
            <div className="h-4 bg-white/[0.06] rounded w-32 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-white/[0.03]">
                <div className="w-8 h-8 rounded-full bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/[0.06] rounded w-3/5" />
                  <div className="h-2 bg-white/[0.04] rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SaasLayout>
    );
  }

  if (!contact) {
    return (
      <SaasLayout>
        <div className="p-6">
          <Button variant="ghost" className="text-white/60 mb-4" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <p className="text-white/40 text-center py-20">Contacto no encontrado</p>
        </div>
      </SaasLayout>
    );
  }

  const tags = contact.tags ? contact.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <SaasLayout>
      <div className="p-4 md:p-6 space-y-6" data-testid="crm-contact-detail">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="text-white/60 shrink-0 mt-1" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                {(contact.first_name?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="crm-contact-detail-name">
                  {contact.first_name} {contact.last_name || ""}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-white/50 flex-wrap">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {contact.email}</span>
                  {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {contact.phone}</span>}
                  {contact.company_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {contact.company_name}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={cn("text-xs border", statusColors[contact.status || "active"] || statusColors.active)}>
                    {contact.status || "active"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-white/20 text-white/70"
                    onClick={() => navigate(`/saas/conversations?contact_id=${contact.id}`)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Abrir en Inbox
                  </Button>
                  {tags.map(tag => (
                    <Badge key={tag} className="text-xs bg-white/5 text-white/60 border border-white/10">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section aria-labelledby="crm-contact-stats" className="space-y-2">
          <h2 id="crm-contact-stats" className="text-xs font-medium uppercase tracking-wider text-white/40">
            Resumen rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Star className="w-5 h-5 text-amber-400" />} label="Score" value={String(contact.score ?? 0)} />
            <StatCard icon={<Target className="w-5 h-5 text-emerald-400" />} label="Deals" value={String(timeline?.deals_count ?? 0)} sub={timeline?.deals_total_value ? `$${timeline.deals_total_value.toLocaleString()}` : undefined} />
            <StatCard icon={<ActivityIcon className="w-5 h-5 text-blue-400" />} label="Actividades" value={String(timeline?.activities_count ?? 0)} />
            <StatCard icon={<MessageSquare className="w-5 h-5 text-purple-400" />} label="Conversaciones" value={String(timeline?.conversations_count ?? 0)} />
          </div>
        </section>

        <section aria-labelledby="crm-contact-data" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <h2 id="crm-contact-data" className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
            Datos de contacto
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-white/35 text-xs">Email</dt><dd className="text-white/90">{contact.email}</dd></div>
            <div><dt className="text-white/35 text-xs">Teléfono</dt><dd className="text-white/90">{contact.phone || "—"}</dd></div>
            <div><dt className="text-white/35 text-xs">Empresa</dt><dd className="text-white/90">{contact.company_name || "—"}</dd></div>
            <div><dt className="text-white/35 text-xs">Fuente</dt><dd className="text-white/90">{contact.source || "manual"}</dd></div>
          </dl>
        </section>

        {contact.notes && (
          <section className="bg-white/5 rounded-xl border border-white/10 p-4" aria-labelledby="crm-contact-notes">
            <h3 id="crm-contact-notes" className="text-sm font-medium text-white/60 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Notas
            </h3>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
          </section>
        )}

        <details className="group rounded-xl border border-white/[0.08] bg-[#0A0A0D] open:border-white/15">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-sm font-medium text-white/80 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              Actividad reciente
            </span>
            <span className="text-[10px] text-zinc-500 group-open:hidden">Expandir</span>
            <span className="text-[10px] text-zinc-500 hidden group-open:inline">Ocultar</span>
          </summary>
          <div className="px-4 pb-4 pt-0 border-t border-white/[0.06]">
            {loadingTimeline ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : !timeline || timeline.events.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">
                <p>Sin actividad registrada aún</p>
              </div>
            ) : (
              <div className="relative pt-4">
                <div className="absolute left-5 top-4 bottom-4 w-px bg-white/10" />
                <div className="space-y-4">
                  {timeline.events.map((event, idx) => {
                    const config = eventTypeConfig[event.event_type] || eventTypeConfig.note;
                    const Icon = config.icon;
                    return (
                      <div key={`${event.event_type}-${event.id}-${idx}`} className="relative flex gap-4 pl-2">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-[#0A0A0D]", "bg-white/10")}>
                          <Icon className={cn("w-3.5 h-3.5", config.color)} />
                        </div>
                        <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={cn("text-xs border border-white/10", config.color, "bg-white/5")}>{config.label}</Badge>
                                <span className="font-medium text-white text-sm truncate">{event.title}</span>
                              </div>
                              {event.description && (
                                <p className="text-xs text-white/50 mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                            {event.value != null && event.value > 0 && (
                              <span className="text-sm font-semibold text-emerald-400 shrink-0">${event.value.toLocaleString()}</span>
                            )}
                          </div>
                          {event.created_at && (
                            <p className="text-xs text-white/30 mt-2">
                              {new Date(event.created_at).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </SaasLayout>
  );
}