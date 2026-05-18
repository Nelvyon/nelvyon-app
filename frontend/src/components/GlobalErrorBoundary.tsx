import { Component, ErrorInfo, ReactNode } from 'react';
import { Sentry } from '@/lib/monitoring';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 1;

/**
 * Premium Global Error Boundary — catches ALL React errors.
 * - Integrates with Sentry for real error reporting
 * - Auto-retries once for transient errors
 * - Shows branded error UI with recovery options
 * - Logs errors to sessionStorage for Platform Health dashboard
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[GlobalErrorBoundary]', error, errorInfo);

    // Report to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('boundary', 'global');
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });

    // Log to sessionStorage for observability
    try {
      const stored = JSON.parse(sessionStorage.getItem('nelvyon_error_log') || '[]');
      stored.push({
        type: 'react_error',
        message: error.message,
        stack: error.stack?.slice(0, 500),
        component: errorInfo.componentStack?.slice(0, 300),
        timestamp: new Date().toISOString(),
      });
      sessionStorage.setItem('nelvyon_error_log', JSON.stringify(stored.slice(-30)));
    } catch { /* storage full — silent */ }

    // Auto-retry once for transient errors (not chunk errors, those are handled by lazyWithRetry)
    const isChunkError = error.message?.includes('dynamically imported') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk');

    if (!isChunkError && this.state.retryCount < MAX_AUTO_RETRIES) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 500);
    }
  }

  handleReload = () => window.location.reload();
  handleGoHome = () => { window.location.href = '/saas'; };
  handleRetry = () => this.setState({ hasError: false, error: null, errorInfo: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError = this.state.error?.message?.includes('dynamically imported') ||
      this.state.error?.message?.includes('Loading chunk') ||
      this.state.error?.message?.includes('Loading CSS chunk');

    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 opacity-20 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center">
                <span className="text-red-400 text-2xl">⚠</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-xl font-bold text-white">
              {isChunkError ? 'Actualización Disponible' : 'Algo salió mal'}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {isChunkError
                ? 'Hay una nueva versión de NELVYON disponible. Recarga la página para actualizar.'
                : 'Se ha producido un error inesperado. Puedes intentar recuperarte o volver al inicio.'}
            </p>
            {!isChunkError && import.meta.env.DEV && this.state.error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
                <p className="text-[11px] font-mono text-red-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {isChunkError ? (
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Recargar Página
              </button>
            ) : (
              <>
                <button
                  onClick={this.handleRetry}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Intentar de Nuevo
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Recargar
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Ir al Inicio
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Branding */}
          <p className="text-center text-[10px] text-zinc-600 mt-8 font-medium tracking-wider">
            NELVYON OS v3.0
          </p>
        </div>
      </div>
    );
  }
}