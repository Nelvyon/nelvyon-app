import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isSuperAdmin, canAccessRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500/50 animate-spin mx-auto mb-3" />
          <p className="text-[10px] text-zinc-700 font-mono">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Plan-based route gating: check if user's plan allows this route
  if (!isSuperAdmin && !canAccessRoute(location.pathname)) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Módulo no disponible</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Tu plan actual no incluye acceso a este módulo. Actualiza tu plan para desbloquear todas las funcionalidades.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              className="border-white/10 text-zinc-400"
              onClick={() => window.history.back()}
            >
              Volver
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white border-0"
              onClick={() => window.location.href = "/saas/pricing"}
            >
              Ver Planes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}