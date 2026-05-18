import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { hexToRgba } from "@/lib/theme-engine";
import {
  LayoutDashboard, Users, Share2, HeadphonesIcon,
  BarChart3, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuToggle: () => void;
}

const NAV_ITEMS = [
  { path: "/saas/home", icon: LayoutDashboard, label: "Inicio" },
  { path: "/saas/crm", icon: Users, label: "CRM" },
  { path: "/saas/social", icon: Share2, label: "Social" },
  { path: "/saas/helpdesk", icon: HeadphonesIcon, label: "Soporte" },
  { path: "/saas/analytics", icon: BarChart3, label: "Analytics" },
];

export default function MobileBottomNav({ onMenuToggle }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex items-center justify-around px-1 py-1 backdrop-blur-xl safe-area-bottom"
      style={{
        backgroundColor: hexToRgba(colors.sidebarBg, 0.95),
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px]",
              isActive && "scale-105"
            )}
            style={{
              color: isActive ? colors.secondary : colors.textMuted,
              backgroundColor: isActive ? hexToRgba(colors.secondary, 0.1) : "transparent",
            }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
            {isActive && (
              <div
                className="w-4 h-0.5 rounded-full mt-0.5"
                style={{ backgroundColor: colors.secondary }}
              />
            )}
          </button>
        );
      })}
      <button
        onClick={onMenuToggle}
        className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px]"
        style={{ color: colors.textMuted }}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[9px] font-medium leading-none">Más</span>
      </button>
    </nav>
  );
}