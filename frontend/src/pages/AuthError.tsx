import { useEffect, useState } from 'react';
import { useI18n } from "@/lib/i18n";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
  const { ts } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const errorMessage =
    searchParams.get('msg') ||
    'La información de autenticación es inválida o ha expirado';

  useEffect(() => {
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
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 text-center">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-red-600/[0.05] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6 max-w-md">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20 mb-2">
          <Shield className="w-6 h-6 text-white" />
        </div>

        {/* Error icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
            <AlertCircle className="relative h-12 w-12 text-red-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Error title */}
        <h1 className="text-2xl font-bold text-white">Error de Autenticación</h1>

        {/* Error description */}
        <p className="text-sm text-zinc-400">{errorMessage}</p>

        {/* Countdown */}
        <div className="pt-2">
          <p className="text-xs text-zinc-600">
            {countdown > 0 ? (
              <>
                Redirigiendo al inicio en{' '}
                <span className="text-violet-400 font-semibold">{countdown}</span>{' '}
                segundos
              </>
            ) : (
              'Redirigiendo...'
            )}
          </p>
        </div>

        {/* Return button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => navigate('/', { replace: true })}
            className="bg-violet-600 hover:bg-violet-500 text-white px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
}