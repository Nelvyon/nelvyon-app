import type { Metadata } from "next";
import Link from "next/link";

import { StandardPage, pageContent, pricingPlans } from "@/features/public-web";

const content = pageContent["saas-acceso"];

export const metadata: Metadata = {
  title: { absolute: content.seoTitle },
  description: content.seoDescription,
  alternates: { canonical: "/saas" },
};

export default function SaasMarketingPage() {
  return (
    <StandardPage
      content={content}
      imageSrc="/brand/public/platform-ui.webp"
      imageAlt="Acceso a la plataforma SaaS NELVYON"
      primaryCta={{ label: "Iniciar sesión", href: "/login" }}
      secondaryCta={{ label: "Crear cuenta", href: "/register" }}
    >
      <div className="nv-public-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold text-white">Planes disponibles</h2>
        <ul className="space-y-3">
          {pricingPlans.map((plan) => (
            <li key={plan.id} className="border-b border-[var(--nv-border)] pb-3 last:border-0 last:pb-0">
              <p className="font-medium text-white">
                {plan.name} · {plan.priceLabel}
                {plan.period}
              </p>
              <p className="mt-1 text-sm text-[var(--nv-muted)]">{plan.description}</p>
            </li>
          ))}
        </ul>
        <Link href="/precios" className="nv-public-btn nv-public-btn-secondary w-full !text-sm">
          Comparar precios
        </Link>
        <Link href="/login" className="nv-public-btn nv-public-btn-primary w-full !text-sm">
          Acceder al panel
        </Link>
      </div>
    </StandardPage>
  );
}
