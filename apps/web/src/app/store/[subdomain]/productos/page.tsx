"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicFetch } from "@/features/builders/publicFetch";
import type { StoreProduct } from "@/features/builders/types";
import { addToCart, formatPrice } from "@/features/store-public/cart";

export default function StoreCatalogPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params?.subdomain ?? "";
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!subdomain) return;
    publicFetch<{ products: StoreProduct[] }>(`/store/${subdomain}/productos`)
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [subdomain]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[],
    [products],
  );

  const filtered = products.filter((p) => {
    const q = query.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q);
    const matchC = !category || p.category === category;
    return matchQ && matchC;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/store/${subdomain}`}>
          ← Volver a la tienda
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Catálogo</h1>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap gap-3">
          <input
            className="flex-1 rounded-lg border px-4 py-2 min-w-[200px]"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            type="search"
            value={query}
          />
          <select className="rounded-lg border px-3 py-2" onChange={(e) => setCategory(e.target.value)} value={category}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <motion.div className="rounded-xl border p-4" key={p.id} layout>
              <Link href={`/store/${subdomain}/producto/${p.slug}`}>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-lg font-bold">{formatPrice(p.price_cents, p.currency)}</p>
              </Link>
              <Button
                className="mt-3 w-full"
                onClick={() => addToCart(subdomain, { slug: p.slug, name: p.name, price_cents: p.price_cents })}
                size="sm"
              >
                Añadir
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
