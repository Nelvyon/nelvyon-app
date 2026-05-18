import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, Loader2, Plus, Clock, Users, Video,
  Phone, Star, CheckCircle2, ChevronLeft, ChevronRight,
  RefreshCw, Bot, Globe, Bell, Trash2, Edit, X, Save
} from "lucide-react";
import { client, type CalendarEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  meeting: { label: "Reunión", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Users },
  call: { label: "Llamada", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Phone },
  demo: { label: "Demo", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: Video },
  followup: { label: "Follow-up", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Bell },
};

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500", pending: "bg-amber-500", completed: "bg-blue-500", cancelled: "bg-red-500",
};

export default function SaasCalendar() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", client_name: "", event_type: "meeting", channel: "Zoom", notes: "", duration_minutes: 30 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities.calendar_events.query({ sort: "-start_time", limit: 200 });
      setEvents((res.data?.items as CalendarEvent[]) || []);
    } catch (err) {
      toast.error("Error cargando calendario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const end = new Date(now);
      end.setMinutes(end.getMinutes() + 30);
      await client.entities.calendar_events.create({
        data: {
          title: "Nueva Cita",
          client_name: "Pendiente de asignar",
          event_type: "meeting",
          start_time: now.toISOString(),
          end_time: end.toISOString(),
          duration_minutes: 30,
          status: "pending",
          channel: "Zoom",
          notes: "Edita esta cita con los datos reales del cliente",
        }
      });
      toast.success("Cita creada — haz clic para editarla");
      await fetchData();
    } catch (err) {
      toast.error("Error creando cita");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.entities.calendar_events.delete({ id: String(id) });
      toast.success("Cita eliminada");
      setSelectedEvent(null);
      setEditing(false);
      await fetchData();
    } catch (err) {
      toast.error("Error eliminando cita");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await client.entities.calendar_events.update({ id: String(id), data: { status } });
      toast.success("Estado actualizado");
      await fetchData();
    } catch (err) {
      toast.error("Error actualizando estado");
    }
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditData({
      title: evt.title || "",
      client_name: evt.client_name || "",
      event_type: evt.event_type || "meeting",
      channel: evt.channel || "Zoom",
      notes: evt.notes || "",
      duration_minutes: evt.duration_minutes || 30,
    });
    setSelectedEvent(evt);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent || !editData.title.trim()) return;
    setSaving(true);
    try {
      await client.entities.calendar_events.update({
        id: String(selectedEvent.id),
        data: {
          title: editData.title,
          client_name: editData.client_name,
          event_type: editData.event_type,
          channel: editData.channel,
          notes: editData.notes,
          duration_minutes: editData.duration_minutes,
        }
      });
      toast.success("Cita actualizada");
      setEditing(false);
      await fetchData();
    } catch (err) {
      toast.error("Error actualizando cita");
    } finally {
      setSaving(false);
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const days = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("es", { month: "long", year: "numeric" });

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      if (!e.start_time) return false;
      const d = new Date(e.start_time);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const selectedDayEvents = events.filter(e => {
    if (!e.start_time) return false;
    return new Date(e.start_time).toDateString() === selectedDate.toDateString();
  }).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const todayCount = events.filter(e => e.start_time && new Date(e.start_time).toDateString() === new Date().toDateString()).length;
  const confirmed = events.filter(e => e.status === "confirmed").length;

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <SaasLayout title="Calendario" subtitle="Gestión de citas — Backend Real PostgreSQL">
      <InlineServiceDemo serviceKey="calendar" serviceName="Calendario" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Citas", value: events.length, icon: Calendar, color: "text-blue-400", bg: "from-blue-500/10 to-indigo-500/10" },
          { label: "Confirmadas", value: confirmed, icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
          { label: "Hoy", value: todayCount, icon: Clock, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
          { label: "Show Rate", value: events.length > 0 ? `${Math.round(confirmed / events.length * 100)}%` : "—", icon: Star, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm font-semibold text-white capitalize w-40 text-center">{monthName}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleCreate} disabled={creating} className="text-[10px] h-7 bg-blue-600 text-white">
                  {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />} Nueva Cita
                </Button>
                <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-7"><RefreshCw className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map(d => (
                <div key={d} className="text-center text-[9px] font-semibold text-zinc-600 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: days }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
                return (
                  <button key={day} onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    className={cn("p-1.5 rounded-lg text-center transition-all min-h-[60px] flex flex-col items-center",
                      isSelected ? "bg-blue-500/10 border border-blue-500/20" :
                      isToday ? "bg-white/[0.03] border border-white/[0.06]" :
                      "hover:bg-white/[0.02] border border-transparent"
                    )}>
                    <span className={cn("text-xs font-medium", isToday ? "text-blue-400 font-bold" : isSelected ? "text-white" : "text-zinc-400")}>{day}</span>
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map(evt => (
                        <div key={evt.id} className={cn("w-1.5 h-1.5 rounded-full", statusColors[evt.status || "pending"])} />
                      ))}
                    </div>
                    {dayEvents.length > 0 && <span className="text-[7px] text-zinc-600 mt-0.5">{dayEvents.length}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Edit Panel */}
            {editing && selectedEvent ? (
              <div className="rounded-xl bg-[#0A0E13] border border-blue-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">Editar Cita</span>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 w-6 p-0 text-zinc-400"><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Título</label>
                    <Input value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Cliente</label>
                    <Input value={editData.client_name} onChange={e => setEditData(d => ({ ...d, client_name: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Tipo</label>
                      <select value={editData.event_type} onChange={e => setEditData(d => ({ ...d, event_type: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white">
                        <option value="meeting">Reunión</option>
                        <option value="call">Llamada</option>
                        <option value="demo">Demo</option>
                        <option value="followup">Follow-up</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Canal</label>
                      <select value={editData.channel} onChange={e => setEditData(d => ({ ...d, channel: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white">
                        <option value="Zoom">Zoom</option>
                        <option value="Google Meet">Google Meet</option>
                        <option value="Teams">Teams</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Teléfono">Teléfono</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Duración (min)</label>
                    <Input type="number" value={editData.duration_minutes} onChange={e => setEditData(d => ({ ...d, duration_minutes: Number(e.target.value) }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Notas</label>
                    <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                      rows={2} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white resize-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-7">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-zinc-400 text-xs h-7">Cancelar</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
                <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {selectedDate.toDateString() === new Date().toDateString() ? "Hoy" : selectedDate.toLocaleDateString("es", { day: "numeric", month: "short" })}
                  <span className="text-[9px] text-zinc-600">({selectedDayEvents.length} citas)</span>
                </h4>
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-[10px] text-zinc-600">Sin citas este día</p>
                    </div>
                  ) : selectedDayEvents.map(evt => {
                    const tc = typeConfig[evt.event_type || "meeting"] || typeConfig.meeting;
                    const time = evt.start_time ? new Date(evt.start_time).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "";
                    return (
                      <button key={evt.id} onClick={() => setSelectedEvent(selectedEvent?.id === evt.id ? null : evt)}
                        className={cn("w-full text-left p-3 rounded-lg border transition-all",
                          selectedEvent?.id === evt.id ? "bg-blue-500/[0.06] border-blue-500/20" : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]"
                        )}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-2 h-2 rounded-full", statusColors[evt.status || "pending"])} />
                          <span className="text-xs font-semibold text-white">{time}</span>
                          <span className={cn("px-1 py-0 rounded text-[8px] font-bold border", tc.bg)}>{tc.label}</span>
                        </div>
                        <p className="text-[10px] text-zinc-300">{evt.title}</p>
                        <p className="text-[9px] text-zinc-600">{evt.client_name} · {evt.channel} · {evt.duration_minutes || 30}min</p>
                        {selectedEvent?.id === evt.id && (
                          <div className="mt-2 pt-2 border-t border-white/[0.04]">
                            <p className="text-[10px] text-zinc-500">{evt.notes}</p>
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); openEdit(evt); }} className="h-6 text-[9px] bg-blue-600 text-white">
                                <Edit className="w-2.5 h-2.5 mr-0.5" /> Editar
                              </Button>
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(evt.id, "completed"); }} className="h-6 text-[9px] bg-emerald-600 text-white">Completar</Button>
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(evt.id, "cancelled"); }} variant="outline" className="h-6 text-[9px] border-white/10 text-zinc-400">Cancelar</Button>
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(evt.id); }} variant="outline" className="h-6 text-[9px] border-red-500/20 text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
              <h4 className="text-xs font-semibold text-white mb-3">Acciones Rápidas</h4>
              <div className="space-y-2">
                {[
                  { label: "Booking Link", icon: Globe, desc: "Compartir link de reserva inteligente" },
                  { label: "Smart Scheduling", icon: Bot, desc: "Sugerencias de mejores horarios" },
                  { label: "Recordatorios", icon: Bell, desc: "SMS + Email + WhatsApp" },
                ].map(a => (
                  <button key={a.label} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all text-left">
                    <a.icon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-white">{a.label}</p>
                      <p className="text-[8px] text-zinc-600">{a.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </SaasLayout>
  );
}