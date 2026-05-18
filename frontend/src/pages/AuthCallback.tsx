import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearLegacyAuthStorage } from "@/lib/auth";
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

/**
 * After OIDC, the backend sets an HttpOnly session cookie and redirects here without ?token=.
 * We only hydrate React state via /auth/me (cookie sent automatically with credentials).
 */
export default function AuthCallback() {
  const { refetch } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errMsg = params.get('msg') || params.get('error');
        if (errMsg) {
          setError(decodeURIComponent(errMsg));
          setTimeout(() => navigate('/', { replace: true }), 4000);
          return;
        }

        clearLegacyAuthStorage();
        window.history.replaceState({}, document.title, '/auth/callback');

        await refetch();
        // Shell SaaS: misma entrada que login manual (/saas → redirect según workspace)
        navigate('/saas', { replace: true });
      } catch (err) {
        setError('Error al completar la autenticación. Redirigiendo...');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    void completeAuth();
  }, [refetch, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-red-300 mb-2">{error}</p>
          <p className="text-xs text-zinc-600">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20 mb-4">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Completando autenticación...</p>
        <p className="text-xs text-zinc-600 mt-1">NELVYON OS</p>
      </div>
    </div>
  );
}
