import { useTheme } from "@/contexts/ThemeContext";
import { hexToRgba } from "@/lib/theme-engine";
import { Clock, Rocket, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ComingSoonOverlayProps {
  moduleName: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Wraps a module page with a "Próximamente" overlay.
 * The underlying UI is still visible but blurred and non-interactive.
 * A clear banner tells the user this feature is in development.
 */
export default function ComingSoonOverlay({ moduleName, description, children }: ComingSoonOverlayProps) {
  const { colors } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none filter blur-[2px] opacity-40">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-30 flex items-start justify-center pt-24">
        <div
          className="max-w-md w-full mx-4 rounded-2xl p-8 text-center shadow-2xl border backdrop-blur-xl"
          style={{
            backgroundColor: hexToRgba(colors.card, 0.95),
            borderColor: hexToRgba(colors.warning, 0.3),
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(colors.warning, 0.2)}, ${hexToRgba(colors.info, 0.2)})` }}
          >
            <Rocket className="w-8 h-8" style={{ color: colors.warning }} />
          </div>

          <h2 className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            {moduleName}
          </h2>

          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
            style={{ backgroundColor: hexToRgba(colors.warning, 0.15), color: colors.warning }}
          >
            <Clock className="w-3 h-3" />
            PRÓXIMAMENTE
          </div>

          <p className="text-sm leading-relaxed mb-4" style={{ color: colors.textMuted }}>
            {description || `Este módulo está actualmente en desarrollo activo. Estará disponible en una próxima actualización con funcionalidad completa.`}
          </p>

          <div
            className="text-[10px] px-4 py-2 rounded-lg mb-5"
            style={{ backgroundColor: hexToRgba(colors.info, 0.05), color: colors.info, border: `1px solid ${hexToRgba(colors.info, 0.15)}` }}
          >
            Los módulos marcados como &quot;Próximamente&quot; están en fase de desarrollo interno y no están disponibles para uso en producción.
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/saas/dashboard")}
            className="gap-2"
            style={{ borderColor: hexToRgba(colors.textMuted, 0.2), color: colors.textMuted }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}