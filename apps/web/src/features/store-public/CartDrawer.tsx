"use client";

import { motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { CartItem, cartTotal, formatPrice, loadCart, updateQty } from "@/features/store-public/cart";

interface CartDrawerProps {
  subdomain: string;
  currency?: string;
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ subdomain, currency = "EUR", open, onClose }: CartDrawerProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (open) setItems(loadCart(subdomain));
  }, [open, subdomain]);

  const total = cartTotal(items);

  return (
    <>
      <div
        aria-hidden={!open}
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <motion.div animate={{ opacity: 1 }} className="flex h-full flex-col" initial={{ opacity: 0 }}>
          <motion.div className="flex items-center justify-between border-b p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-5 w-5" /> Carrito
            </h2>
            <button aria-label="Cerrar" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li className="flex gap-3 rounded-lg border p-3" key={item.slug}>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.price_cents, currency)}</p>
                      <motion.div className="mt-2 flex items-center gap-2">
                        <Button
                          onClick={() => setItems(updateQty(subdomain, item.slug, item.quantity - 1))}
                          size="sm"
                          variant="outline"
                        >
                          −
                        </Button>
                        <span className="text-sm">{item.quantity}</span>
                        <Button
                          onClick={() => setItems(updateQty(subdomain, item.slug, item.quantity + 1))}
                          size="sm"
                          variant="outline"
                        >
                          +
                        </Button>
                      </motion.div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t p-4">
            <p className="mb-4 text-lg font-semibold">Total: {formatPrice(total, currency)}</p>
            <Button asChild className="w-full" disabled={items.length === 0}>
              <Link href={`/store/${subdomain}/checkout`}>Ir al checkout</Link>
            </Button>
          </div>
        </motion.div>
      </aside>
    </>
  );
}
