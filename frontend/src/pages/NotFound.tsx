import { useNavigate } from 'react-router-dom';

/**
 * Premium 404 page — catches all unknown routes.
 * Provides clear recovery paths to prevent user frustration.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600/20 to-blue-600/20 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">🔍</span>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          La ruta que buscas no existe o ha sido movida. Vuelve al dashboard para continuar.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/saas/home')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Ir al Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Volver atrás
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 mt-8 font-medium tracking-wider">
          NELVYON OS v3.0
        </p>
      </div>
    </div>
  );
}