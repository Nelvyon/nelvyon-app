"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicFetch } from "@/features/builders/publicFetch";
import { CartItem, cartTotal, formatPrice, loadCart } from "@/features/store-public/cart";

declare global {
  interface Window {
    Stripe?: (key: string) => { confirmCardPayment: (secret: string, data: unknown) => Promise<{ error?: { message?: string } }> };
  }
}

export default function StoreCheckoutPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params?.subdomain ?? "";
  const [items, setItems] = useState<CartItem[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(loadCart(subdomain));
  }, [subdomain]);

  const total = cartTotal(items);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await publicFetch<{
        client_secret?: string;
        pending_stripe?: boolean;
        stripe_message?: string;
        order_id?: string;
      }>(`/store/${subdomain}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          customer_email: email,
          customer_name: name,
          items: items.map((i) => ({ slug: i.slug, quantity: i.quantity })),
          metadata: { shipping_address: address },
        }),
      });

      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (result.client_secret && pk && typeof window !== "undefined") {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://js.stripe.com/v3/";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Stripe.js failed to load"));
          document.body.appendChild(s);
        });
        const stripe = window.Stripe?.(pk);
        if (stripe) {
          const { error: stripeErr } = await stripe.confirmCardPayment(result.client_secret, {
            payment_method: { card: { token: "tok_visa" } },
          });
          if (stripeErr) {
            setError(stripeErr.message ?? "Pago fallido");
            return;
          }
        }
      }

      if (result.pending_stripe && result.stripe_message) {
        setError(result.stripe_message);
      }
      setDone(true);
    } catch {
      setError("No se pudo procesar el pedido");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div animate={{ opacity: 1 }} className="mx-auto max-w-lg p-12 text-center" initial={{ opacity: 0 }}>
        <h1 className="text-2xl font-bold text-green-600">¡Pedido confirmado!</h1>
        <p className="mt-4 text-muted-foreground">Recibirás un email de confirmación en {email}.</p>
        <Button asChild className="mt-8">
          <Link href={`/store/${subdomain}`}>Volver a la tienda</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <ul className="mt-6 space-y-2 border-b pb-6">
        {items.map((i) => (
          <li className="flex justify-between text-sm" key={i.slug}>
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{formatPrice(i.price_cents * i.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </li>
      </ul>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input className="w-full rounded-lg border px-4 py-2" onChange={(e) => setName(e.target.value)} placeholder="Nombre" required type="text" value={name} />
        <input className="w-full rounded-lg border px-4 py-2" onChange={(e) => setEmail(e.target.value)} placeholder="Email" required type="email" value={email} />
        <textarea className="w-full rounded-lg border px-4 py-2" onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de envío" required rows={3} value={address} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={loading || items.length === 0} type="submit">
          {loading ? "Procesando…" : "Pagar con Stripe"}
        </Button>
      </form>
    </div>
  );
}
