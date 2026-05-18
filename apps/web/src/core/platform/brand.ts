export type BrandMode = "internal" | "client";

export function getBrandMode(): BrandMode {
  return process.env.NEXT_PUBLIC_BRAND_MODE === "client" ? "client" : "internal";
}

export function getBrandAppName(mode: BrandMode = getBrandMode()) {
  if (mode === "client") {
    return process.env.NEXT_PUBLIC_CLIENT_BRAND_NAME?.trim() || "Client Portal";
  }
  return "NELVYON";
}

