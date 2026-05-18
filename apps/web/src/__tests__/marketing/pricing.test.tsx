import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "vitest";

import HomePage from "@/app/(marketing)/page";
import PartnersPage from "@/app/(marketing)/partners/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import esMessages from "../../../messages/es.json";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("marketing pricing and landing", () => {
  it("Página /pricing renderiza los 3 planes", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByRole("heading", { name: "Starter", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agency", level: 2 })).toBeInTheDocument();
  });

  it("Plan Pro tiene badge 'Más popular'", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByText("Más popular")).toBeInTheDocument();
  });

  it("Precios correctos: 47€, 197€, 497€ mensuales", () => {
    renderWithIntl(<PricingPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/47€/);
    expect(main.textContent).toMatch(/197€/);
    expect(main.textContent).toMatch(/497€/);
  });

  it("Muestra tabla comparativa de planes", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByRole("heading", { name: "Comparativa de planes" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Funcionalidad" })).toBeInTheDocument();
  });

  it("CTA de planes son botones de checkout (Stripe)", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByRole("button", { name: /Empezar con Starter/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Empezar con Pro/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Empezar con Agency/ })).toBeInTheDocument();
  });

  it("Nav incluye CTA a /register", () => {
    renderWithIntl(<PricingPage />);
    const navCta = screen.getByRole("link", { name: /Empieza gratis/ });
    expect(navCta).toHaveAttribute("href", "/register");
  });

  it("FAQ tiene 4 preguntas (Stripe / planes)", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByText("¿Puedo cancelar en cualquier momento?")).toBeInTheDocument();
    expect(screen.getByText("¿Qué pasa si supero el límite de llamadas?")).toBeInTheDocument();
    expect(screen.getByText("¿Está incluido el IVA?")).toBeInTheDocument();
    expect(screen.getByText("¿Puedo usar mis propias API keys?")).toBeInTheDocument();
  });

  it("Página / (home) renderiza headline correctamente", () => {
    renderWithIntl(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/El equipo de marketing IA/i);
    expect(h1.textContent).toMatch(/que trabaja por ti/i);
  });

  it("Home tiene CTA de registro (Empieza gratis)", () => {
    renderWithIntl(<HomePage />);
    const links = screen.getAllByRole("link", { name: /Empieza gratis/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Página /partners renderiza calculadora", () => {
    renderWithIntl(<PartnersPage />);
    expect(screen.getByText("Calculadora simple")).toBeInTheDocument();
    expect(screen.getByLabelText("Número de clientes")).toBeInTheDocument();
  });

  it("Calculadora muestra comisión correcta (clientes × €97 × 0.30)", () => {
    renderWithIntl(<PartnersPage />);
    const input = screen.getByLabelText("Número de clientes");
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.getByText(/€291\.00/)).toBeInTheDocument();
  });
});
