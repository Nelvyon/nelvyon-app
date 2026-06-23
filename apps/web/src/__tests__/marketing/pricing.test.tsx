import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { describe, it, expect, vi } from "vitest";

function createMotionProxy() {
  const ReactMod = React;
  type ReactNode = import("react").ReactNode;

  return new Proxy(
    {},
    {
      get: (_target, tag) => {
        if (tag === "create") {
          return (component: import("react").ElementType) =>
            function MotionWrapped({
              children,
              ...props
            }: {
              children?: ReactNode;
              [key: string]: unknown;
            }) {
              return ReactMod.createElement(component, props, children);
            };
        }
        return ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) =>
          ReactMod.createElement(String(tag), props, children);
      },
    },
  );
}

vi.mock("motion/react", () => ({ motion: createMotionProxy() }));
vi.mock("framer-motion", () => ({
  motion: createMotionProxy(),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/features/billing/useAutoPlanCheckout", () => ({
  useAutoPlanCheckout: vi.fn(),
}));

vi.mock("@/features/billing/PlanCheckoutButton", () => ({
  PlanCheckoutButton: ({ children, planId }: { children?: React.ReactNode; planId: string }) => (
    <button type="button" data-plan={planId}>
      {children ?? "Checkout"}
    </button>
  ),
}));

vi.mock("@/components/pa/icons/logo", () => ({
  GoogleLogo: () => <span data-testid="google-logo" />,
  Adobe: () => null,
  Microsoft: () => null,
  Raycast: () => null,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })),
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
  it("Página /pricing muestra planes", () => {
    renderWithProviders(<PricingPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Precios claros/i })).toBeInTheDocument();
    expect(screen.getByText(/Tres planes para cada etapa/i)).toBeInTheDocument();
  });

  it("Home enterprise renderiza headline principal", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/sistema operativo de marketing/i);
    expect(screen.getByText(/Packs autónomos para el cliente final/i)).toBeInTheDocument();
  });

  it("Home enterprise incluye capas de plataforma", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/SaaS para el cliente\. OS para escalar\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Packs autónomos/i).length).toBeGreaterThan(0);
  });

  it("Home enterprise tiene CTA principal a registro", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole("link", { name: /Empieza gratis/i });
    expect(links.some((el) => el.getAttribute("href") === "/register")).toBe(true);
  });

  it("Home enterprise enlaza a servicios en navbar", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/servicios");
  });

  it("Home enterprise muestra FAQ NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Preguntas frecuentes/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué es NELVYON exactamente\?/i)).toBeInTheDocument();
  });

  it("Home enterprise incluye marca NELVYON en navbar", { timeout: 30000 }, () => {
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
