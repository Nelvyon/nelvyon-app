"use client";

export interface CartItem {
  slug: string;
  name: string;
  price_cents: number;
  quantity: number;
  image?: string;
}

const key = (subdomain: string) => `nelvyon_cart_${subdomain}`;

export function loadCart(subdomain: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(subdomain));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(subdomain: string, items: CartItem[]) {
  localStorage.setItem(key(subdomain), JSON.stringify(items));
}

export function addToCart(subdomain: string, item: Omit<CartItem, "quantity">, qty = 1): CartItem[] {
  const cart = loadCart(subdomain);
  const idx = cart.findIndex((x) => x.slug === item.slug);
  if (idx >= 0) cart[idx].quantity += qty;
  else cart.push({ ...item, quantity: qty });
  saveCart(subdomain, cart);
  return cart;
}

export function updateQty(subdomain: string, slug: string, quantity: number): CartItem[] {
  const cart = loadCart(subdomain).map((x) => (x.slug === slug ? { ...x, quantity } : x)).filter((x) => x.quantity > 0);
  saveCart(subdomain, cart);
  return cart;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
}

export function formatPrice(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
}
