"use client";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonPrivacidadPage() {
  return (
    <LegalDocLayout title="Política de Privacidad">
      <p className="lead text-zinc-400">Última actualización: mayo 2026. Responsable: NELVYON.</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        NELVYON (en adelante, «NELVYON» o «nosotros») es responsable del tratamiento de los datos personales recogidos a
        través de nelvyon.com y la plataforma SaaS asociada, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica
        3/2018 (LOPDGDD).
      </p>
      <p>Contacto: legal@nelvyon.com</p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Datos identificativos: nombre, email, empresa.</li>
        <li>Datos de cuenta: credenciales cifradas, preferencias, historial de uso.</li>
        <li>Datos de facturación cuando contrates un plan de pago.</li>
        <li>Datos técnicos: IP, cookies, logs, dispositivo y navegador.</li>
        <li>Contenido que introduzcas en la plataforma (CRM, campañas, etc.).</li>
      </ul>

      <h2>3. Finalidades y base legal</h2>
      <ul>
        <li>Prestación del servicio SaaS — ejecución contractual (art. 6.1.b RGPD).</li>
        <li>Atención al cliente y soporte — interés legítimo / contractual.</li>
        <li>Facturación y obligaciones legales — obligación legal (art. 6.1.c).</li>
        <li>Analytics y mejora del producto — consentimiento o interés legítimo según cookie.</li>
        <li>Comunicaciones comerciales — consentimiento (art. 6.1.a).</li>
      </ul>

      <h2>4. Conservación</h2>
      <p>
        Conservamos los datos mientras mantengas una cuenta activa y, posteriormente, durante los plazos legales aplicables
        (fiscal, contable, reclamaciones). Los logs técnicos se rotan periódicamente.
      </p>

      <h2>5. Destinatarios y transferencias</h2>
      <p>
        Podemos compartir datos con proveedores que actúan como encargados (hosting, email, analytics, pagos), bajo contrato
        de tratamiento. Algunos proveedores pueden estar fuera del EEE; en ese caso aplicamos cláusulas contractuales tipo u
        otras garantías adecuadas.
      </p>

      <h2>6. Derechos</h2>
      <p>
        Puedes ejercer acceso, rectificación, supresión, limitación, oposición, portabilidad y retirar el consentimiento en
        legal@nelvyon.com. Tienes derecho a reclamar ante la AEPD (www.aepd.es).
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas: cifrado en tránsito (TLS), control de acceso, auditoría y segregación por
        workspace/tenant.
      </p>

      <h2>8. Menores</h2>
      <p>El servicio no está dirigido a menores de 16 años.</p>
    </LegalDocLayout>
  );
}
