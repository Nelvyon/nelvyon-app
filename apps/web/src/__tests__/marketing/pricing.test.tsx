import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { describe, it, expect, vi } from "vitest";

vi.mock("motion/react", async () => {
  const ReactMod = await import("react");
  type ReactNode = import("react").ReactNode;
  type ElementType = import("react").ElementType;

  function createMotionComponent(component: ElementType) {
    function MotionWrapped({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) {
      return ReactMod.createElement(component, props, children);
    }
    MotionWrapped.displayName = "MotionWrapped";
    return MotionWrapped;
  }

  const motion = new Proxy(
    {},
    {
      get: (_target, tag) => {
        if (tag === "create") {
          return createMotionComponent;
        }
        return ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) =>
          ReactMod.createElement(String(tag), props, children);
      },
    },
  );

  return { motion };
});

vi.mock("@/components/pa/icons/logo", () => ({
  GoogleLogo: () => <span data-testid="google-logo" />,
  Adobe: () => null,
  Microsoft: () => null,
  Raycast: () => null,
}));

import HomePage from "@/app/(marketing)/page";
import PartnersPage from "@/app/(marketing)/partners/page";
import PricingPage from "@/app/(marketing)/pricing/page";
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

  it("Home PA renderiza headline NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/Donde nace tu imperio/i);
    expect(
      screen.getByText(
        /NELVYON combina estrategia, marketing, automatización y tecnología/i,
      ),
    ).toBeInTheDocument();
  });

  it("Home PA incluye sección de servicios", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/Servicios para construir y operar con metodo/i),
    ).toBeInTheDocument();
  });

  it("Home PA tiene CTA principal a contacto", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole("link", {
      name: /Solicitar informacion|Solicitar información/i,
    });
    expect(links.some((el) => el.getAttribute("href") === "/contacto")).toBe(true);
  });

  it("Home PA enlaza a servicios", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/servicios");
  });

  it("Home PA muestra planes SaaS NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Elite")).toBeInTheDocument();
  });

  it("Home PA muestra FAQ NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Preguntas frecuentes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Que diferencia a NELVYON de una agencia tradicional/i),
    ).toBeInTheDocument();
  });

  it("Home PA incluye marca NELVYON en hero", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByText("NELVYON").length).toBeGreaterThan(0);
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
