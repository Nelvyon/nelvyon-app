import {
  Users, FileText, BarChart3, MessageSquare, Bot, FolderKanban,
  Megaphone, Globe, Calendar, CreditCard, Settings, Shield,
  Search, Inbox, Package, Zap, type LucideIcon
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/theme-engine';

type ModuleKey =
  | 'crm' | 'contacts' | 'deals' | 'contracts' | 'social' | 'helpdesk'
  | 'agents' | 'projects' | 'campaigns' | 'websites' | 'calendar'
  | 'payments' | 'settings' | 'security' | 'search' | 'inbox'
  | 'assets' | 'automation' | 'analytics' | 'generic';

const MODULE_CONFIG: Record<ModuleKey, { icon: LucideIcon; title: string; description: string }> = {
  crm: { icon: Users, title: 'Sin contactos aún', description: 'Añade tu primer contacto para empezar a gestionar tu CRM.' },
  contacts: { icon: Users, title: 'Sin contactos', description: 'Importa o crea contactos para comenzar.' },
  deals: { icon: BarChart3, title: 'Sin deals', description: 'Crea tu primer deal para activar el pipeline.' },
  contracts: { icon: FileText, title: 'Sin contratos', description: 'Genera tu primer contrato desde un deal o cliente.' },
  social: { icon: Globe, title: 'Sin publicaciones', description: 'Programa tu primera publicación en redes sociales.' },
  helpdesk: { icon: MessageSquare, title: 'Sin tickets', description: 'Los tickets de soporte aparecerán aquí.' },
  agents: { icon: Bot, title: 'Sin agentes activos', description: 'Configura y activa agentes para automatizar tareas.' },
  projects: { icon: FolderKanban, title: 'Sin proyectos', description: 'Crea un proyecto para organizar tu trabajo.' },
  campaigns: { icon: Megaphone, title: 'Sin campañas', description: 'Lanza tu primera campaña de marketing.' },
  websites: { icon: Globe, title: 'Sin sitios web', description: 'Crea tu primer sitio web con el builder.' },
  calendar: { icon: Calendar, title: 'Sin eventos', description: 'Programa reuniones y eventos aquí.' },
  payments: { icon: CreditCard, title: 'Sin transacciones', description: 'Las transacciones aparecerán cuando se procesen pagos.' },
  settings: { icon: Settings, title: 'Sin configuración', description: 'Configura los ajustes de tu cuenta.' },
  security: { icon: Shield, title: 'Sin alertas', description: 'No hay alertas de seguridad activas.' },
  search: { icon: Search, title: 'Sin resultados', description: 'Intenta con otros términos de búsqueda.' },
  inbox: { icon: Inbox, title: 'Bandeja vacía', description: 'No hay mensajes nuevos.' },
  assets: { icon: Package, title: 'Sin assets', description: 'Sube archivos y recursos para tus proyectos.' },
  automation: { icon: Zap, title: 'Sin automatizaciones', description: 'Crea flujos automáticos para optimizar procesos.' },
  analytics: { icon: BarChart3, title: 'Sin datos', description: 'Los datos de analítica aparecerán cuando haya actividad.' },
  generic: { icon: Inbox, title: 'Sin datos', description: 'No hay elementos para mostrar.' },
};

interface EmptyStateProps {
  module?: ModuleKey;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({
  module = 'generic',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const config = MODULE_CONFIG[module];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDesc = description || config.description;

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: hexToRgba(colors.primary, 0.1) }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.primary }} />
        </div>
        <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>{displayTitle}</p>
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{displayDesc}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: hexToRgba(colors.primary, 0.15), color: colors.primary }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
        style={{ backgroundColor: hexToRgba(colors.primary, 0.08) }}
      >
        <div
          className="absolute inset-0 rounded-2xl opacity-30 blur-xl"
          style={{ backgroundColor: colors.primary }}
        />
        <Icon className="w-8 h-8 relative z-10" style={{ color: colors.primary }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>{displayTitle}</h3>
      <p className="text-sm max-w-sm text-center leading-relaxed" style={{ color: colors.textMuted }}>
        {displayDesc}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}