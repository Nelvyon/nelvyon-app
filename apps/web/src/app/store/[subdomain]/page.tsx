"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import { publicFetch } from "@/features/builders/publicFetch";
import type { PublicSitePage, StoreProduct } from "@/features/builders/types";
import { addToCart, formatPrice } from "@/features/store-public/cart";
import { CartDrawer } from "@/features/store-public/CartDrawer";
import { Button } from "@/core/ui/button";

export default function StoreHomePage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params?.subdomain ?? "";
  const [page, setPage] = useState<PublicSitePage | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const currency = page?.currency ?? "EUR";

  useEffect(() => {
    if (!subdomain) return;
    publicFetch<PublicSitePage>(`/store/${subdomain}`).then(setPage).catch(() => setPage(null));
    publicFetch<{ products: StoreProduct[] }>(`/store/${subdomain}/productos`)
      .then((d) => setProducts((d.products ?? []).slice(0, 6)))
      .catch(() => setProducts([]));
  }, [subdomain]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link className="text-xl font-bold" href={`/store/${subdomain}`}>
            {page?.store_name ?? subdomain}
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/store/${subdomain}/productos`}>Catálogo</Link>
            </Button>
            <Button onClick={() => setCartOpen(true)} variant="default">
              <ShoppingBag className="mr-2 h-4 w-4" /> Carrito
            </Button>
          </div>
        </div>
      </header>

      {page?.blocks?.length ? <BlockRenderer blocks={page.blocks} /> : null}

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold">Destacados</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <motion.article
              className="overflow-hidden rounded-2xl border bg-card shadow-card transition hover:shadow-lg"
              key={p.id}
              whileHover={{ y: -4 }}
            >
              <Link href={`/store/${subdomain}/producto/${p.slug}`}>
                <div className="aspect-square bg-muted" />
                <div className="p-4">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-1 text-lg font-bold">{formatPrice(p.price_cents, currency)}</p>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    addToCart(subdomain, { slug: p.slug, name: p.name, price_cents: p.price_cents });
                    setCartOpen(true);
                  }}
                  size="sm"
                >
                  Añadir al carrito
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <CartDrawer currency={currency} onClose={() => setCartOpen(false)} open={cartOpen} subdomain={subdomain} />
    </div>
  );
}
