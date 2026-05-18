import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import SaasLayout from "@/components/SaasLayout";
import { client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings, CheckCircle2, Shield, Users, Palette,
  Bell, Mail, Smartphone, Zap, Key, Save, User, Building,
  Sparkles, RotateCcw, Download, Upload, Check, Crown, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  THEME_PRESETS,
  COLOR_CATEGORIES,
  COLOR_LABELS,
  hexToRgba,
  type NelvyonTheme,
} from "@/lib/theme-engine";

type TabKey = "general" | "security" | "team" | "branding" | "notifications";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "General", icon: Settings },
  { key: "security", label: "Seguridad", icon: Shield },
  { key: "team", label: "Equipo", icon: Users },
  { key: "branding", label: "Personalización", icon: Palette },
  { key: "notifications", label: "Notificaciones", icon: Bell },
];

export default function SaasSettingsPage() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { currentTheme, setTheme, setThemeById, updateColor, resetTheme, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // General settings state
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const res = await client.entities.user_settings.query({ sort: "-created_at", limit: 1 });
      const items = (res.data?.items as Array<Record<string, unknown>>) || [];
      if (items.length > 0) {
        if (items[0].theme_id) setThemeById(String(items[0].theme_id));
        try {
          const data = JSON.parse(String(items[0].settings_data || "{}"));
          if (data.companyName) setCompanyName(data.companyName);
          if (data.companyDomain) setCompanyDomain(data.companyDomain);
          if (data.companyEmail) setCompanyEmail(data.companyEmail);
          if (data.companyPhone) setCompanyPhone(data.companyPhone);
        } catch (err) { if (import.meta.env.DEV) console.warn("[SaasSettingsPage] Error:", err); /* ignore */ }
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasSettingsPage] Error:", err); /* fallback */ }
  }, [setThemeById]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user, loadSettings]);

  const handleSave = () => {
    const settingsData = JSON.stringify({
      companyName, companyDomain, companyEmail, companyPhone,
      ...currentTheme,
    });
    client.entities.user_settings.create({
      data: { theme_id: currentTheme.id, settings_data: settingsData },
    }).catch(() => {});
    toast.success("Configuración guardada");
  };

  const handleExportTheme = () => {
    const blob = new Blob([JSON.stringify(currentTheme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nelvyon-theme-${currentTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tema exportado");
  };

  const handleImportTheme = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const theme = JSON.parse(ev.target?.result as string) as NelvyonTheme;
          if (theme.colors && theme.name) {
            setTheme(theme);
            toast.success(`Tema "${theme.name}" importado`);
          } else {
            toast.error("Archivo inválido");
          }
        } catch (err) {
          toast.error("Error al leer el archivo");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <SaasLayout title="Configuración" subtitle="Personalización y configuración de la plataforma">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-2 space-y-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  activeTab === tab.key ? "bg-white/[0.05] text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                )}>
                <tab.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4" /> Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Nombre de la Empresa</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Mi Empresa" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Dominio</label>
                  <Input value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="app.miempresa.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Email de Contacto</label>
                  <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="admin@miempresa.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Teléfono</label>
                  <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+34 600 000 000" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                </div>
              </div>
              <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-3.5 h-3.5 mr-1" /> Guardar Cambios
              </Button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4" /> Seguridad
              </h3>
              <p className="text-xs text-zinc-500">Configuración de seguridad de tu cuenta y plataforma.</p>
              <div className="space-y-3">
                {[
                  { title: "Autenticación", desc: "Login seguro vía email/contraseña con sesiones protegidas", status: true, icon: Key },
                  { title: "Encriptación HTTPS", desc: "Todas las comunicaciones están encriptadas en tránsito", status: true, icon: Shield },
                  { title: "Gestión de Sesiones", desc: "Control de sesiones activas del usuario", status: true, icon: User },
                  { title: "2FA (Próximamente)", desc: "Autenticación de doble factor — en desarrollo", status: false, icon: Smartphone },
                  { title: "SSO / SAML (Próximamente)", desc: "Single Sign-On enterprise — en desarrollo", status: false, icon: Globe },
                  { title: "IP Whitelist (Próximamente)", desc: "Restringir acceso por IP — en desarrollo", status: false, icon: Globe },
                ].map(item => (
                  <div key={item.title} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs font-semibold text-white">{item.title}</p>
                        <p className="text-[10px] text-zinc-600">{item.desc}</p>
                      </div>
                    </div>
                    <div className={cn("px-2 py-1 rounded text-[9px] font-bold border",
                      item.status ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                    )}>
                      {item.status ? "Activo" : "Próximamente"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4" /> Gestión de Equipo
              </h3>
              <p className="text-xs text-zinc-500">
                La gestión avanzada de equipo con roles y permisos está en desarrollo.
                Actualmente el acceso es individual por cuenta.
              </p>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{user?.email || "Usuario actual"}</p>
                    <p className="text-[10px] text-zinc-500">Administrador</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/10">
                <p className="text-xs text-amber-400 font-semibold mb-1">Próximamente</p>
                <p className="text-[10px] text-zinc-500">
                  Invitación de miembros, roles personalizados (Admin, Marketing, Ventas, Soporte)
                  y permisos granulares por módulo.
                </p>
              </div>
            </div>
          )}

          {/* ─── BRANDING / PERSONALIZACIÓN TOTAL ─── */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: colors.primary }} />
                  Personalización Visual
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleImportTheme} className="border-white/10 text-zinc-400 h-7 text-[10px]">
                    <Upload className="w-3 h-3 mr-1" /> Importar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportTheme} className="border-white/10 text-zinc-400 h-7 text-[10px]">
                    <Download className="w-3 h-3 mr-1" /> Exportar
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetTheme} className="border-white/10 text-zinc-400 h-7 text-[10px]">
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>

              {/* Current theme info */}
              <div className="rounded-xl p-4" style={{ backgroundColor: hexToRgba(colors.primary, 0.05), border: `1px solid ${hexToRgba(colors.primary, 0.15)}` }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[colors.primary, colors.secondary, colors.accent, colors.background].map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>Tema: {currentTheme.name}</p>
                    <p className="text-[10px]" style={{ color: colors.textMuted }}>{currentTheme.description}</p>
                  </div>
                </div>
              </div>

              {/* Theme Presets */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-3">TEMAS PREDEFINIDOS</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {THEME_PRESETS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => { setThemeById(theme.id); toast.success(`Tema "${theme.name}" aplicado`); }}
                      className="rounded-xl p-3 border transition-all text-left"
                      style={{
                        backgroundColor: theme.colors.card,
                        borderColor: currentTheme.id === theme.id ? theme.colors.primary : hexToRgba(theme.colors.textPrimary, 0.06),
                      }}
                    >
                      <div className="flex gap-1 mb-2">
                        {theme.preview.map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        {currentTheme.id === theme.id && <Check className="w-3 h-3" style={{ color: theme.colors.primary }} />}
                        <p className="text-[10px] font-semibold" style={{ color: theme.colors.textPrimary }}>{theme.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Color Pickers */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  COLORES AVANZADOS — Cambios en tiempo real
                </h4>
                <div className="space-y-4">
                  {COLOR_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <h5 className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">{cat.label}</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cat.keys.map((key) => {
                          const value = colors[key];
                          const isHex = typeof value === "string" && value.startsWith("#");
                          return (
                            <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="relative">
                                <div className="w-7 h-7 rounded-lg border border-white/10 cursor-pointer" style={{ backgroundColor: value }} />
                                {isHex && (
                                  <input
                                    type="color"
                                    value={value}
                                    onChange={(e) => updateColor(key, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-medium text-white truncate">{COLOR_LABELS[key] || key}</p>
                                <p className="text-[7px] text-zinc-600 font-mono truncate">{value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* White-label fields */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-3">WHITE-LABEL</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">Nombre de Marca</label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Tu Marca" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">Dominio Personalizado</label>
                    <Input value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)}
                      placeholder="app.tumarca.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" />
                  </div>
                </div>
                <Button size="sm" onClick={handleSave} className="mt-4 text-white" style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Guardar Personalización
                </Button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notificaciones
              </h3>
              <p className="text-xs text-zinc-500">Configura cómo quieres recibir notificaciones de la plataforma.</p>
              <div className="space-y-3">
                {[
                  { channel: "Email", desc: "Notificaciones por correo electrónico", enabled: true, icon: Mail, configurable: true },
                  { channel: "Push del Navegador", desc: "Notificaciones push en el navegador", enabled: false, icon: Bell, configurable: true },
                  { channel: "SMS (Próximamente)", desc: "Alertas por mensaje de texto — requiere integración", enabled: false, icon: Smartphone, configurable: false },
                  { channel: "WhatsApp (Próximamente)", desc: "Alertas por WhatsApp Business — requiere integración", enabled: false, icon: Zap, configurable: false },
                ].map(item => (
                  <div key={item.channel} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs font-semibold text-white">{item.channel}</p>
                        <p className="text-[10px] text-zinc-600">{item.desc}</p>
                      </div>
                    </div>
                    <div className={cn("px-2 py-1 rounded text-[9px] font-bold border",
                      item.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      item.configurable ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                      "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                    )}>
                      {item.enabled ? "Activo" : item.configurable ? "Desactivado" : "Próximamente"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SaasLayout>
  );
}