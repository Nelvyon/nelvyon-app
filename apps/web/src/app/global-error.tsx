"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[nelvyon] global-error", error.message, error.digest, error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#080808", color: "#e4e4e7" }}>
        <main
          style={{
            margin: "0 auto",
            display: "flex",
            minHeight: "100vh",
            maxWidth: "42rem",
            alignItems: "center",
            padding: "2.5rem 1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: "12px",
              border: "1px solid #3f3f46",
              padding: "1.5rem",
              background: "#18181b",
            }}
          >
            <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.25rem" }}>Error crítico</h1>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
              Se produjo un error global inesperado.
              {error.digest ? (
                <span style={{ display: "block", marginTop: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  Ref: {error.digest}
                </span>
              ) : null}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#6366f1",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Reintentar
              </button>
              <Link
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #52525b",
                  color: "#e4e4e7",
                  textDecoration: "none",
                }}
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
