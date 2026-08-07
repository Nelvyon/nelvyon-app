"use client";

/**
 * Marco del wizard de onboarding, con el marcado de W3CRM.
 *
 * NO monta `SaasW3crmShell` a propósito: el shell trae sidebar y navegación
 * completa, y el onboarding es una pantalla standalone en la que el tenant aún
 * no está configurado. Meterle el menú dejaría salir del wizard a mitad y eso
 * es cambiar la navegación, que está expresamente fuera de alcance. Lo que sí
 * hace falta es el scope: se cargan las mismas hojas que el shell y se envuelve
 * en `.w3crm-scope` para que Bootstrap de la plantilla aplique aquí igual que
 * en el resto del SaaS.
 *
 * CONTRATO — `e2e/onboarding.spec.ts`:
 *   - `getByText("Paso N de 4")` ÚNICO: el indicador se pinta UNA sola vez.
 *     El diseño anterior lo emitía dos veces (el `label` del status dot y el
 *     texto suelto), que era una ambigüedad esperando a romperse.
 *   - `getByRole("progressbar", { name: "Progreso de onboarding" })` con
 *     `aria-valuenow` = 25/50/75/100. Se conservan `role`, `aria-label` y los
 *     tres `aria-value*` sobre el marcado `progress`/`progress-bar` de W3CRM.
 */
import type { ReactNode } from "react";

// Convivencia Tailwind v4 / Bootstrap 5 dentro del scope (mismo fichero que usa el shell).
import "@/features/saas-w3crm/w3crmScope.css";

export type OnboardingLayoutProps = {
  step: number;
  children: ReactNode;
};

export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  // `onboardingStep` puede llegar como NaN: `Math.max(1, NaN)` es NaN y el
  // wizard se quedaba sin paso que pintar.
  const n = Number(step);
  const safeStep = Number.isFinite(n) ? Math.min(4, Math.max(1, Math.trunc(n))) : 1;
  const pct = Math.round((safeStep / 4) * 100);

  return (
    <>
      {/* Mismas hojas que `SaasW3crmShell`; traen Bootstrap 5 dentro. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/style.css" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/comman.css" />
      <div className="w3crm-scope">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8">
              <p className="fs-12 text-uppercase text-primary fw-bold mb-1">SaaS onboarding</p>
              <h3 className="mb-1">Configura tu espacio NELVYON</h3>
              <p className="fs-14 text-muted">
                Cuatro pasos rápidos para activar tu cuenta y alinear el producto a tu negocio.
              </p>

              <div className="d-flex align-items-center justify-content-between fs-14 text-muted mb-1">
                {/* Una sola vez: ver contrato. */}
                <span>Paso {safeStep} de 4</span>
                <span>{pct}%</span>
              </div>
              <div className="progress mb-4" style={{ height: 8 }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de onboarding"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
