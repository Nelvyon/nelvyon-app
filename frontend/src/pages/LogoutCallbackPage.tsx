import { useEffect, useState } from 'react';
import { useI18n } from "@/lib/i18n";
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle2 } from 'lucide-react';

export default function LogoutCallbackPage() {
  const { ts } = useI18n();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Clear any remaining auth state
    localStorage.removeItem('nelvyon_demo_mode');

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-emerald-600/[0.05] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20 mb-6">
          <Shield className="w-6 h-6 text-white" />
        </div>

        {/* Success icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Sesión Cerrada</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Has cerrado sesión correctamente.
        </p>
        <p className="text-xs text-zinc-600">
          Redirigiendo al inicio en{' '}
          <span className="text-violet-400 font-semibold">{countdown}</span>{' '}
          segundos...
        </p>
      </div>
    </div>
  );
}