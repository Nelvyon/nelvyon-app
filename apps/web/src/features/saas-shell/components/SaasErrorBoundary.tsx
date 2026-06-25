"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Error boundary for SaaS sections. Catches render errors and displays
 * a recovery UI instead of crashing the whole app.
 */
export class SaasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[SaasErrorBoundary]", this.props.section ?? "unknown", error, info);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center"
        >
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm font-semibold text-red-400">
            {this.props.section ? `Error en ${this.props.section}` : "Ha ocurrido un error"}
          </p>
          <p className="mt-1 text-xs text-red-400/70 font-mono max-w-xs mx-auto truncate">
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-4 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
