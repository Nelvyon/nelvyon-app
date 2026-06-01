import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { describe, it, expect } from "vitest";

import HomePage from "@/app/(marketing)/page";
import PartnersPage from "@/app/(marketing)/partners/page";
import PricingPage from "@/app/pricing/page";
import esMessages from "../../../messages/es.json";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {ui}
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

describe("marketing pricing and landing", () => {
  it("Página /pricing renderiza los 3 planes", { timeout: 15000 }, () => {
    renderWithProviders(<PricingPage />);
    expect(screen.getByText("Empezar con Starter")).toBeInTheDocument();
    expect(screen.getByText("Empezar con Growth")).toBeInTheDocument();
    expect(screen.getByText("Contactar ventas")).toBeInTheDocument();
  });

  it("Plan 2 muestra precio Growth 297€", () => {
    renderWithProviders(<PricingPage />);
    expect(screen.getByText(/€297/)).toBeInTheDocument();
  });

  it("Precios en euros en vista mensual", () => {
    const { container } = renderWithProviders(<PricingPage />);
    expect(container.textContent).toMatch(/€97/);
    expect(container.textContent).toMatch(/€797/);
  });

  it("CTA de planes enlazan a registro o contacto", { timeout: 15000 }, () => {
    renderWithProviders(<PricingPage />);
    const starter = screen.getByRole("link", { name: /Empezar con Starter/i });
    expect(starter).toHaveAttribute("href", "/registro");
    const sales = screen.getByRole("link", { name: /Contactar ventas/i });
    expect(sales).toHaveAttribute("href", "/contacto");
  });

  it("Nav incluye CTA a contacto", () => {
    renderWithProviders(<PricingPage />);
    const navCta = screen.getAllByRole("link", { name: /Solicitar información/i })[0];
    expect(navCta).toHaveAttribute("href", "/contacto");
  });

  it("Página / (home) renderiza headline correctamente", { timeout: 15000 }, () => {
    renderWithProviders(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/operación digital/i);
    expect(h1.textContent).toMatch(/ejecutar con orden/i);
    expect(screen.getByText(/Donde nace tu imperio/i)).toBeInTheDocument();
    expect(screen.getByText(/Servicios profesionales y plataforma SaaS para operar/i)).toBeInTheDocument();
  });

  it("Home muestra pricing dual SaaS y servicios", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Desde €47\/mes/i)).toBeInTheDocument();
    expect(screen.getByText(/A medida/i)).toBeInTheDocument();
  });

  it("Home tiene CTA principal a contacto", () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole("link", { name: /Solicitar información/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((el) => el.getAttribute("href") === "/contacto")).toBe(true);
  });

  it("Home enlaza a SaaS", () => {
    renderWithProviders(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/saas");
  });

  it("Home muestra marquee de integraciones", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { name: /Conecta tus herramientas en un solo sistema/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Google Calendar/i).length).toBeGreaterThan(0);
  });

  it("Página /partners renderiza calculadora", () => {
    renderWithProviders(<PartnersPage />);
    expect(screen.getByText("Calculadora simple")).toBeInTheDocument();
    expect(screen.getByLabelText("Número de clientes")).toBeInTheDocument();
  });

  it("Calculadora muestra comisión correcta (clientes × €97 × 0.30)", () => {
    renderWithProviders(<PartnersPage />);
    const input = screen.getByLabelText("Número de clientes");
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.getByText(/€291\.00/)).toBeInTheDocument();
  });
});
