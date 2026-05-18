import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary that catches chunk/module loading failures
 * and shows a user-friendly reload prompt instead of a white screen.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    // Only catch chunk loading errors
    if (
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk') ||
      error.message?.includes('Importing a module script failed')
    ) {
      return { hasError: true };
    }
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChunkErrorBoundary] Module load failure:', error.message, errorInfo);
  }

  handleReload = () => {
    // Clear any stale caches and reload
    sessionStorage.removeItem('nelvyon-chunk-reload');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-2xl tracking-tighter">N</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                Actualización disponible
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Se ha detectado una nueva versión de Nelvyon. Recarga la página para obtener la última versión.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium text-sm hover:from-violet-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Recargar página
            </button>

            <p className="text-[11px] text-zinc-600">
              Si el problema persiste, limpia la caché del navegador (Ctrl+Shift+R)
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}