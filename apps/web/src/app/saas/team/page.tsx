"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Role = "owner" | "admin" | "manager" | "user" | "viewer";
type MemberStatus = "active" | "invited" | "suspended";

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  avatar: string;
  lastActive: string | null;
  permissions: Permission[];
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; description: string }> = {
  owner: { label: "Propietario", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", description: "Acceso total. No se puede modificar." },
  admin: { label: "Administrador", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", description: "Acceso completo excepto billing y configuración de cuenta." },
  manager: { label: "Manager", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", description: "Gestiona CRM, campañas y puede ver reportes." },
  user: { label: "Usuario", color: "text-green-400 bg-green-500/10 border-green-500/20", description: "Acceso a módulos asignados sin configuración." },
  viewer: { label: "Solo lectura", color: "text-muted-foreground bg-muted/30 border-border", description: "Puede ver pero no modificar datos." },
};

const STATUS_CONFIG: Record<MemberStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "Activo", tone: "success" },
  invited: { label: "Invitado", tone: "warning" },
  suspended: { label: "Suspendido", tone: "danger" },
};

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "m1", name: "Daniel Castedo", email: "daniel@nelvyon.com", role: "owner", status: "active",
    avatar: "D", lastActive: new Date(Date.now() - 1800000).toISOString(),
    permissions: [],
  },
  {
    id: "m2", name: "Ana García", email: "ana@empresa.com", role: "admin", status: "active",
    avatar: "A", lastActive: new Date(Date.now() - 3600000).toISOString(),
    permissions: [],
  },
  {
    id: "m3", name: "Carlos López", email: "carlos@empresa.com", role: "manager", status: "active",
    avatar: "C", lastActive: new Date(Date.now() - 86400000).toISOString(),
    permissions: [],
  },
  {
    id: "m4", name: "María Torres", email: "maria@empresa.com", role: "user", status: "active",
    avatar: "M", lastActive: new Date(Date.now() - 2 * 86400000).toISOString(),
    permissions: [],
  },
  {
    id: "m5", name: "Pedro Ruiz", email: "pedro@freelance.com", role: "viewer", status: "invited",
    avatar: "P", lastActive: null,
    permissions: [],
  },
];

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ["Todo"],
  admin: ["CRM", "Campañas", "Workflows", "Funnels", "Reportes", "Integraciones", "Equipo"],
  manager: ["CRM", "Campañas", "Workflows", "Citas", "Reportes (solo vista)"],
  user: ["CRM (asignados)", "Citas", "Chat"],
  viewer: ["Dashboard (solo vista)", "Reportes (solo vista)"],
};

function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [sending, setSending] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 700));
    setSending(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Invitar miembro</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={invite} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellidos"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Rol</label>
            <div className="space-y-2">
              {(["admin", "manager", "user", "viewer"] as Role[]).map(r => {
                const rc = ROLE_CONFIG[r];
                return (
                  <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${role === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/10"}`}>
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{rc.label}</p>
                      <p className="text-xs text-muted-foreground">{rc.description}</p>
                      <p className="mt-1 text-xs text-primary">Acceso: {ROLE_PERMISSIONS[r].join(", ")}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={sending || !email} className="flex-1">{sending ? "Enviando invitación…" : "↗ Enviar invitación"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)}min`;
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)} días`;
}

export default function SaasTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  function suspendMember(id: string) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: m.status === "suspended" ? "active" : "suspended" } : m));
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="team" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Gestión de Equipo" subtitle="Invita colaboradores y controla sus permisos por módulo y rol" />
              <NelvyonDsButton onClick={() => setShowInvite(true)}>+ Invitar miembro</NelvyonDsButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total miembros", value: members.length },
                { label: "Activos", value: members.filter(m => m.status === "active").length },
                { label: "Invitaciones pendientes", value: members.filter(m => m.status === "invited").length },
                { label: "Roles distintos", value: new Set(members.map(m => m.role)).size },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Roles overview */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, rc]) => {
                const count = members.filter(m => m.role === role).length;
                return (
                  <NelvyonDsCard key={role} className={`border p-3 ${rc.color}`}>
                    <p className="text-xs font-medium">{rc.label}</p>
                    <p className="mt-1 text-2xl font-bold">{count}</p>
                    <p className="mt-1 text-[10px] opacity-70">{rc.description.substring(0, 40)}…</p>
                  </NelvyonDsCard>
                );
              })}
            </div>

            {/* Members table */}
            <NelvyonDsCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Miembro", "Rol", "Estado", "Acceso a", "Última actividad", "Acciones"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map(member => {
                      const rc = ROLE_CONFIG[member.role];
                      const sc = STATUS_CONFIG[member.status];
                      return (
                        <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{member.avatar}</div>
                              <div>
                                <p className="font-medium text-foreground">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${rc.color}`}>{rc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground max-w-48 truncate">{ROLE_PERMISSIONS[member.role].join(", ")}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {member.lastActive ? timeAgo(member.lastActive) : "Nunca (pendiente)"}
                          </td>
                          <td className="px-4 py-3">
                            {member.role !== "owner" && (
                              <div className="flex gap-1.5">
                                <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => setSelectedMember(member)}>✎ Editar</NelvyonDsButton>
                                <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => suspendMember(member.id)}>
                                  {member.status === "suspended" ? "Activar" : "Suspender"}
                                </NelvyonDsButton>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </NelvyonDsCard>

            {/* Permissions info */}
            <NelvyonDsCard className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Matriz de permisos por rol</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-muted-foreground">Módulo</th>
                      {(["owner", "admin", "manager", "user", "viewer"] as Role[]).map(r => (
                        <th key={r} className={`pb-2 text-center text-[11px] font-medium ${ROLE_CONFIG[r].color.split(" ")[0]}`}>{ROLE_CONFIG[r].label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {["CRM", "Campañas", "Workflows", "Pipeline", "Facturación", "Reportes", "Configuración", "Equipo"].map(mod => (
                      <tr key={mod}>
                        <td className="py-2 text-muted-foreground">{mod}</td>
                        {(["owner", "admin", "manager", "user", "viewer"] as Role[]).map(r => {
                          const has = ROLE_PERMISSIONS[r].some(p => p.toLowerCase().includes(mod.toLowerCase()) || p === "Todo");
                          const partial = ROLE_PERMISSIONS[r].some(p => p.includes(mod) && p.includes("vista"));
                          return (
                            <td key={r} className="py-2 text-center">
                              {has && !partial ? <span className="text-green-400">✓</span> : partial ? <span className="text-yellow-400">◑</span> : <span className="text-muted-foreground/40">–</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NelvyonDsCard>
      {showInvite && <InviteMemberModal onClose={() => setShowInvite(false)} />}
    </SaasShellLayout>
  );
}
