import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "vitest";

import HomePage from "@/app/page";
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
    expect(screen.getByRole("heading", { name: "Plan 1", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plan 2", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plan 3", level: 2 })).toBeInTheDocument();
  });

  it("Plan 2 tiene badge 'Recomendado'", () => {
    renderWithIntl(<PricingPage />);
    expect(screen.getByText("Recomendado")).toBeInTheDocument();
  });

  it("Precios en blanco (placeholder) en vista mensual", () => {
    renderWithIntl(<PricingPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/—/);
  });

  it("CTA de planes enlazan a /register", () => {
    renderWithIntl(<PricingPage />);
    const ctas = screen.getAllByRole("link", { name: /Solicitar acceso/i });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    expect(ctas.every((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Nav incluye CTA a /register", () => {
    renderWithIntl(<PricingPage />);
    const navCta = screen.getByRole("link", { name: /^Empezar$/i });
    expect(navCta).toHaveAttribute("href", "/register");
  });

  it("Página / (home) renderiza headline correctamente", () => {
    renderWithIntl(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/Donde nace tu imperio/i);
    expect(h1.textContent).toMatch(/se impone tu legado/i);
  });

  it("Home tiene CTA de registro", () => {
    renderWithIntl(<HomePage />);
    const links = screen.getAllByRole("link", { name: /Crear mi imperio|Empezar gratis/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Home enlaza a páginas de servicio", () => {
    renderWithIntl(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/servicios/seo-ia");
    expect(hrefs).toContain("/servicios/publicidad-ia");
    expect(hrefs).toContain("/servicios/contenido-ia");
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
