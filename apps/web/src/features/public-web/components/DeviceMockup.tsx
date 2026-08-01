"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductMockVariant } from "../content/catalog";
import { saasShotSrc, shotForMock, type SaasShotId } from "../content/saasShots";
import { NelvyonProductMock } from "./NelvyonProductMock";

export type DeviceKind = "macbook" | "monitor" | "iphone" | "browser";

/**
 * Premium device frame with REAL NELVYON saas-shots on screen.
 * premium stock PSD packs (M-01/M-04/M-07/M-09) are archived for optional Photoshop
 * composition; web uses CSS frames so product UI is never a third-party kit.
 */
export function DeviceMockup({
  device = "macbook",
  shotId,
  mockVariant = "dashboard",
  alt,
  priority = false,
  className = "",
  card = false,
}: {
  device?: DeviceKind;
  shotId?: SaasShotId | null;
  mockVariant?: ProductMockVariant;
  alt?: string;
  priority?: boolean;
  className?: string;
  card?: boolean;
}) {
  const resolved = shotId ?? shotForMock(mockVariant);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return <NelvyonProductMock variant={mockVariant} className={className} />;
  }

  const src = saasShotSrc(resolved, card ? "card" : "hero");
  const label = alt || `SaaS NELVYON · ${resolved}`;

  if (device === "browser") {
    return (
      <div className={`nv-public-product-frame ${className}`.trim()}>
        <div className="nv-public-product-chrome" aria-hidden>
          <span />
          <span />
          <span />
          <div className="ml-3 flex h-5 flex-1 items-center rounded-md bg-white/5 px-3 text-[10px] text-slate-500">
            app.nelvyon.com · captura real
          </div>
        </div>
        <div className="relative aspect-[16/10] w-full bg-[#020817]">
          <Image
            src={src}
            alt={label}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 90vw"
            priority={priority}
            onError={() => setFailed(true)}
          />
        </div>
      </div>
    );
  }

  if (device === "iphone") {
    return (
      <div className={`nv-device nv-device--iphone ${className}`.trim()}>
        <div className="nv-device__bezel">
          <div className="nv-device__notch" aria-hidden />
          <div className="nv-device__screen">
            <Image
              src={src}
              alt={label}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 60vw, 280px"
              priority={priority}
              onError={() => setFailed(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (device === "monitor") {
    return (
      <div className={`nv-device nv-device--monitor ${className}`.trim()}>
        <div className="nv-device__bezel">
          <div className="nv-device__screen">
            <Image
              src={src}
              alt={label}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 90vw"
              priority={priority}
              onError={() => setFailed(true)}
            />
          </div>
        </div>
        <div className="nv-device__stand" aria-hidden>
          <div className="nv-device__neck" />
          <div className="nv-device__base" />
        </div>
      </div>
    );
  }

  // macbook (default) — M-01 / M-04 composition
  return (
    <div className={`nv-device nv-device--macbook ${className}`.trim()}>
      <div className="nv-device__lid">
        <div className="nv-device__camera" aria-hidden />
        <div className="nv-device__screen">
          <Image
            src={src}
            alt={label}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 90vw"
            priority={priority}
            onError={() => setFailed(true)}
          />
        </div>
      </div>
      <div className="nv-device__chin" aria-hidden>
        <div className="nv-device__notch-bar" />
      </div>
    </div>
  );
}
