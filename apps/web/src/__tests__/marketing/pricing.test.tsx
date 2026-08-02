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

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt = "", ...rest } = props;
    return <img alt={String(alt)} {...rest} />;
  },
}));

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

import PartnersPage from "@/app/(marketing)/partners/page";
import PreciosPage from "@/app/(marketing)/precios/page";
import { PublicHomePage } from "@/features/public-web";
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
  it("Página /precios redirige al pack AIOR pricing.html", () => {
    expect(() => renderWithProviders(<PreciosPage />)).toThrow(/NEXT_REDIRECT:\/www\/pricing\.html/);
  });

  it("Home pública renderiza headline NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<PublicHomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/Marketing digital ejecutado por IA/i);
  });

  it("Home pública incluye pilares de producto", { timeout: 30000 }, () => {
    renderWithProviders(<PublicHomePage />);
    expect(screen.getByText(/Agencia operada por IA/i)).toBeInTheDocument();
  });

  it("Home pública tiene CTA a contacto o producto", { timeout: 30000 }, () => {
    renderWithProviders(<PublicHomePage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((el) => el.getAttribute("href"));
    expect(hrefs.some((h) => h === "/contacto" || h === "/producto" || h === "/login")).toBe(true);
  });

  it("Home pública muestra FAQ", { timeout: 30000 }, () => {
    renderWithProviders(<PublicHomePage />);
    expect(screen.getByText(/¿NELVYON es una agencia o un software\?/i)).toBeInTheDocument();
  });

  it("Home pública incluye marca NELVYON", { timeout: 30000 }, () => {
    renderWithProviders(<PublicHomePage />);
    expect(screen.getByText(/NELVYON une agencia autónoma y software enterprise/i)).toBeInTheDocument();
  });

  it("Página /partners renderiza calculadora", () => {
    renderWithProviders(<PartnersPage />);
    expect(screen.getByText(/Calculadora ilustrativa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de clientes referidos/i)).toBeInTheDocument();
  });

  it("Calculadora muestra comisión correcta (clientes × €97 × 0.30)", () => {
    renderWithProviders(<PartnersPage />);
    const input = screen.getByLabelText(/Número de clientes referidos/i);
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.getByText(/€291\.00/)).toBeInTheDocument();
  });
});
