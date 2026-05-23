"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicFetch } from "@/features/builders/publicFetch";
import type { StoreProduct } from "@/features/builders/types";
import { addToCart, formatPrice } from "@/features/store-public/cart";

export default function StoreProductPage() {
  const params = useParams<{ subdomain: string; slug: string }>();
  const subdomain = params?.subdomain ?? "";
  const slug = params?.slug ?? "";
  const [data, setData] = useState<{ product: StoreProduct; schema_org?: Record<string, unknown>; store_name?: string; currency?: string } | null>(null);

  useEffect(() => {
    if (!subdomain || !slug) return;
    publicFetch<{ product: StoreProduct; schema_org?: Record<string, unknown>; store_name?: string; currency?: string }>(
      `/store/${subdomain}/producto/${slug}`,
    )
      .then(setData)
      .catch(() => setData(null));
  }, [subdomain, slug]);

  useEffect(() => {
    if (!data?.schema_org) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.schema_org);
    script.id = "product-schema";
    document.head.appendChild(script);
    return () => script.remove();
  }, [data]);

  if (!data?.product) return <div className="p-12 text-center">Producto no encontrado</div>;
  const { product, currency = "EUR" } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
        <motion.div animate={{ opacity: 1 }} className="aspect-square rounded-2xl bg-muted" initial={{ opacity: 0 }} />
        <motion.div animate={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: 20 }}>
          <Link className="text-sm text-muted-foreground" href={`/store/${subdomain}/productos`}>
            ← Catálogo
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-4 text-3xl font-semibold text-primary">{formatPrice(product.price_cents, currency)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {product.stock && product.stock > 0 ? `${product.stock} en stock` : "Agotado"}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">
            {product.ai_description || product.description}
          </p>
          <Button
            className="mt-8 h-12 px-8 text-base"
            disabled={!product.stock}
            onClick={() => addToCart(subdomain, { slug: product.slug, name: product.name, price_cents: product.price_cents })}
          >
            Comprar ahora
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
