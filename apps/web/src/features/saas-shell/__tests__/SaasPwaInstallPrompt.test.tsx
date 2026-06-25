/**
 * S41 — SaasPwaInstallPrompt unit tests
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaasPwaInstallPrompt } from "../components/SaasPwaInstallPrompt";

// matchMedia mock
function mockMatchMedia(standalone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(display-mode: standalone)" ? standalone : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  mockMatchMedia(false);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  // Not iOS by default
  Object.defineProperty(navigator, "userAgent", {
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SaasPwaInstallPrompt", () => {
  it("does not render when in standalone mode", () => {
    mockMatchMedia(true);
    render(<SaasPwaInstallPrompt />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("does not render when dismissed (localStorage key set)", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "1"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    render(<SaasPwaInstallPrompt />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("does not render initially without beforeinstallprompt or iOS", () => {
    render(<SaasPwaInstallPrompt />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("shows banner when beforeinstallprompt fires", () => {
    render(<SaasPwaInstallPrompt />);
    act(() => {
      const event = new Event("beforeinstallprompt");
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });
    expect(screen.getByRole("complementary")).toBeDefined();
    expect(screen.getByRole("button", { name: /Instalar Nelvyon/i })).toBeDefined();
  });

  it("dismiss button sets localStorage and hides banner", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem, removeItem: vi.fn() });

    render(<SaasPwaInstallPrompt />);
    act(() => {
      const event = new Event("beforeinstallprompt");
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    });

    const closeBtn = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(closeBtn);

    expect(setItem).toHaveBeenCalledWith("saas-pwa-dismissed", "1");
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("shows iOS hint text on iOS Safari", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    render(<SaasPwaInstallPrompt />);
    expect(screen.getByText(/Safari.*Compartir/i)).toBeDefined();
  });

  it("does not show install button on iOS (no deferred prompt)", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit",
      configurable: true,
    });
    render(<SaasPwaInstallPrompt />);
    expect(screen.queryByRole("button", { name: /Instalar Nelvyon/i })).toBeNull();
  });

  it("has aria-label on complementary region", () => {
    render(<SaasPwaInstallPrompt />);
    act(() => {
      const event = new Event("beforeinstallprompt");
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });
    expect(screen.getByRole("complementary", { name: "Instalar aplicación" })).toBeDefined();
  });

  it("install button calls deferred.prompt()", async () => {
    const promptFn = vi.fn().mockResolvedValue(undefined);
    render(<SaasPwaInstallPrompt />);
    act(() => {
      const event = new Event("beforeinstallprompt");
      Object.assign(event, {
        prompt: promptFn,
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });
    const installBtn = screen.getByRole("button", { name: /Instalar Nelvyon/i });
    await act(async () => { fireEvent.click(installBtn); });
    expect(promptFn).toHaveBeenCalledOnce();
  });

  it("removes beforeinstallprompt listener on unmount", () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<SaasPwaInstallPrompt />);
    unmount();
    expect(removeListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
  });

  it("renders install button with min-h-[44px] touch target class", () => {
    render(<SaasPwaInstallPrompt />);
    act(() => {
      const event = new Event("beforeinstallprompt");
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });
    const btn = screen.getByRole("button", { name: /Instalar Nelvyon/i });
    expect(btn.className).toContain("min-h-[44px]");
  });
});
