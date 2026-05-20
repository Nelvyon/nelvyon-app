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

  it("Precios correctos: 95€, 270€, 470€ mensuales", () => {
    renderWithIntl(<PricingPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/95€/);
    expect(main.textContent).toMatch(/270€/);
    expect(main.textContent).toMatch(/470€/);
  });

  it("CTA de planes enlazan a /register", () => {
    renderWithIntl(<PricingPage />);
    const ctas = screen.getAllByRole("link", { name: /Empieza gratis/i });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    expect(ctas.every((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Nav incluye CTA a /register", () => {
    renderWithIntl(<PricingPage />);
    const navCta = screen.getAllByRole("link", { name: /Empieza gratis/i })[0];
    expect(navCta).toHaveAttribute("href", "/register");
  });

  it("Página / (home) renderiza headline correctamente", () => {
    renderWithIntl(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/Tu equipo de marketing/i);
    expect(h1.textContent).toMatch(/Sin contratar a nadie/i);
  });

  it("Home tiene CTA de registro (Empieza gratis)", () => {
    renderWithIntl(<HomePage />);
    const links = screen.getAllByRole("link", { name: /Empieza gratis/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Home enlaza a páginas de servicio", () => {
    renderWithIntl(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/seo");
    expect(hrefs).toContain("/ads");
    expect(hrefs).toContain("/contenido");
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
