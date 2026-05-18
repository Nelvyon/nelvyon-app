/**
 * Vitest setup file — provides browser-like globals for tests.
 */
import { vi } from "vitest";

// Mock window.location if not available
if (typeof window !== "undefined" && !window.location) {
  Object.defineProperty(window, "location", {
    value: { href: "http://localhost:3000", origin: "http://localhost:3000", pathname: "/" },
    writable: true,
  });
}

// Mock matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Mock IntersectionObserver
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
}