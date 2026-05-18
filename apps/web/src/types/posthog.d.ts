import type posthog from "posthog-js";

export {};

declare global {
  interface Window {
    __posthog?: typeof posthog;
  }
}
