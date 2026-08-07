import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

/**
 * 404 de `/saas/*` sobre W3CRM.
 *
 * Era la última pantalla del SaaS que seguía montando `SaasSidebar` +
 * `DashboardLayout` con el design-system antiguo: al caer en una ruta
 * inexistente, el usuario salía del shell nuevo y aterrizaba en la interfaz
 * vieja. No se ve en el inventario de páginas porque el fichero es
 * `not-found.tsx`, no `page.tsx`.
 *
 * Mismos destinos y mismos textos: dashboard y asistente IA.
 */
export default function SaasNotFound() {
  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Página no encontrada" parentTitle="SaaS" pageTitle="404" />
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-8">
            <W3crmContentBox titulo="Error 404" icono="fa-solid fa-circle-question">
              <div className="text-center py-4">
                <p className="display-4 fw-bold text-primary mb-2">404</p>
                <h5 className="mb-1">Página no encontrada</h5>
                <p className="text-muted fs-14">Este módulo no existe o no tienes acceso.</p>
                <div className="d-flex flex-column gap-2 mt-4 mx-auto" style={{ maxWidth: 280 }}>
                  <Link href="/saas/dashboard" className="btn btn-primary">Ir al Dashboard</Link>
                  <Link href="/saas/chat" className="btn btn-primary light">
                    💬 Preguntar al Asistente IA
                  </Link>
                </div>
              </div>
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
