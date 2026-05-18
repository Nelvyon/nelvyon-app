import { useState } from 'react';
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/theme-engine';
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Users,
  Settings,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WorkspaceSelector() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace, loading } = useWorkspace();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await createWorkspace(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  const roleColors: Record<string, string> = {
    owner: colors.warning || '#f59e0b',
    admin: colors.info || '#3b82f6',
    member: colors.success || '#22c55e',
    viewer: colors.textMuted || '#71717a',
  };

  const roleLabels: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Admin',
    member: 'Miembro',
    viewer: 'Visor',
  };

  if (loading || !activeWorkspace) {
    return (
      <div
        className="mx-3 mt-2 px-3 py-2.5 rounded-lg animate-pulse"
        style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.03) }}
      >
        <div className="h-4 rounded" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.08), width: '60%' }} />
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 border group"
        style={{
          backgroundColor: hexToRgba(colors.secondary, 0.05),
          borderColor: open ? hexToRgba(colors.secondary, 0.3) : hexToRgba(colors.secondary, 0.1),
        }}
      >
        {/* Workspace avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
          style={{
            background: activeWorkspace.primary_color
              ? activeWorkspace.primary_color
              : `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
          }}
        >
          {activeWorkspace.logo_url ? (
            <img
              src={activeWorkspace.logo_url}
              alt=""
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            activeWorkspace.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p
            className="text-[12px] font-semibold truncate leading-tight"
            style={{ color: colors.textPrimary }}
          >
            {activeWorkspace.name}
          </p>
          <p className="text-[9px] flex items-center gap-1" style={{ color: colors.textMuted }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: roleColors[activeWorkspace.role] || colors.textMuted }}
            />
            {roleLabels[activeWorkspace.role] || activeWorkspace.role}
            <span className="mx-0.5">·</span>
            <Users className="w-2.5 h-2.5 inline" />
            {activeWorkspace.members_count}
          </p>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
          style={{ color: colors.textMuted }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.borderHover}`,
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                Workspaces
              </span>
              <span className="text-[9px]" style={{ color: colors.info }}>
                {workspaces.length}/10
              </span>
            </div>

            {/* Workspace list */}
            <div className="max-h-48 overflow-y-auto py-1">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspace.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? hexToRgba(colors.secondary, 0.08)
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = hexToRgba(colors.textPrimary, 0.03);
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white font-bold text-[10px]"
                      style={{
                        background: ws.primary_color
                          ? ws.primary_color
                          : `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
                      }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className="text-[11px] font-medium truncate"
                        style={{ color: isActive ? colors.secondary : colors.textPrimary }}
                      >
                        {ws.name}
                      </p>
                      <p className="text-[9px] flex items-center gap-1" style={{ color: colors.textMuted }}>
                        {ws.role === 'owner' && <Crown className="w-2 h-2" />}
                        {roleLabels[ws.role] || ws.role}
                        <span>·</span>
                        {ws.members_count} miembros
                      </p>
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: colors.secondary }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create new */}
            <div
              className="px-3 py-2"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Nuevo workspace..."
                  className="flex-1 text-[11px] bg-transparent border-none outline-none placeholder:text-zinc-600"
                  style={{ color: colors.textPrimary }}
                  maxLength={50}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="p-1 rounded-md transition-colors disabled:opacity-30"
                  style={{
                    backgroundColor: hexToRgba(colors.secondary, 0.15),
                    color: colors.secondary,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}