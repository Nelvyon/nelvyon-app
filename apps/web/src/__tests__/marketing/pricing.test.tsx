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

vi.mock("@/core/auth/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
  it("Página /pricing renderiza sin error", () => {
    expect(() => renderWithProviders(<PricingPage />)).not.toThrow();
  });

  it("Home PA renderiza headline NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/El sistema operativo de marketing/i);
  });

  it("Home PA incluye sección de servicios", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/Servicios que ejecuta la IA por ti/i),
    ).toBeInTheDocument();
  });

  it("Home PA tiene CTA principal a registro", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((el) => el.getAttribute("href"));
    expect(hrefs.some((h) => h === "/register" || h === "/contacto" || h === "/packs")).toBe(true);
  });

  it("Home PA enlaza a packs o registro", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs.some((h) => h === "/packs" || h === "/register" || h === "/login")).toBe(true);
  });

  it("Home PA muestra FAQ NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Preguntas frecuentes/i)).toBeInTheDocument();
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
