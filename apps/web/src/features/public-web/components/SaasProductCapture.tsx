"use client";

import type { ProductMockVariant } from "../content/catalog";
import type { SaasShotId } from "../content/saasShots";
import { DeviceMockup, type DeviceKind } from "./DeviceMockup";

/**
 * Real SaaS UI capture in a device/browser frame.
 * Screens always come from saas-shots (never third-party UI kits).
 */
export function SaasProductCapture({
  shotId,
  mockVariant = "dashboard",
  alt,
  priority = false,
  className = "",
  card = false,
  device = "macbook",
}: {
  shotId?: SaasShotId | null;
  mockVariant?: ProductMockVariant;
  alt?: string;
  priority?: boolean;
  className?: string;
  card?: boolean;
  device?: DeviceKind;
}) {
  return (
    <DeviceMockup
      device={device}
      shotId={shotId}
      mockVariant={mockVariant}
      alt={alt}
      priority={priority}
      className={className}
      card={card}
    />
  );
}
