"use client";

import { useCallback, useEffect, useState } from "react";

/** Agency = multi-account control, packs, SaaS config. Workspace = client daily ops. */
export type ProductLayer = "agency" | "workspace";

const LS_KEY = "nelvyon.productLayer";

export function readProductLayer(): ProductLayer {
  if (typeof window === "undefined") return "workspace";
  try {
    const v = window.localStorage.getItem(LS_KEY);
    return v === "agency" ? "agency" : "workspace";
  } catch {
    return "workspace";
  }
}

export function writeProductLayer(layer: ProductLayer) {
  try {
    window.localStorage.setItem(LS_KEY, layer);
  } catch {
    /* ignore */
  }
}

export function useProductLayer() {
  const [layer, setLayerState] = useState<ProductLayer>("workspace");

  useEffect(() => {
    setLayerState(readProductLayer());
  }, []);

  const setLayer = useCallback((next: ProductLayer) => {
    writeProductLayer(next);
    setLayerState(next);
  }, []);

  return { layer, setLayer };
}

export const PRODUCT_LAYER_LABELS: Record<ProductLayer, string> = {
  agency: "Capa Agencia",
  workspace: "Capa Empresa",
};
