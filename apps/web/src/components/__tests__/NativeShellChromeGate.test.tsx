/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import { NativeShellChromeGate } from "@/components/NativeShellChromeGate";

describe("NativeShellChromeGate", () => {
  afterEach(() => {
    cleanup();
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
  });

  it("renders children on web by default", () => {
    const { getByText } = render(
      <NativeShellChromeGate>
        <span>chrome</span>
      </NativeShellChromeGate>,
    );
    expect(getByText("chrome")).toBeTruthy();
  });

  it("hides children when Capacitor reports native platform", async () => {
    (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true,
    };
    const { queryByText } = render(
      <NativeShellChromeGate>
        <span>chrome</span>
      </NativeShellChromeGate>,
    );
    await waitFor(() => {
      expect(queryByText("chrome")).toBeNull();
    });
  });
});
