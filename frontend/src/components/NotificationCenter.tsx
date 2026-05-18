/**
 * NotificationCenter — Real-time notification bell with dropdown for SaasLayout top bar.
 * Polls backend for notifications and shows unread count badge.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck, X, AlertTriangle, Info, MessageSquare, CreditCard, FileText, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  ticket: { icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/10" },
  payment: { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  contract: { icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
  crm: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  alert: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  info: { icon: Info, color: "text-white/60", bg: "bg-white/5" },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data.items || []);
    } catch {
      // Graceful — notifications are optional
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await api.markNotificationRead(id);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await api.markAllNotificationsRead();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Ahora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-lg transition-all",
          open ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
        )}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Marcar todo
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-white/30">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors flex items-start gap-3",
                      !n.read && "bg-white/[0.02]"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[11px] font-medium truncate", n.read ? "text-white/50" : "text-white")}>
                          {n.title}
                        </p>
                        <span className="text-[9px] text-white/30 shrink-0">{formatTime(n.timestamp)}</span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/[0.06] text-center">
              <button className="text-[10px] text-sky-400 hover:text-sky-300">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}