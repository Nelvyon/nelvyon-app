export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_cents: number;
  currency?: string;
  stock?: number;
  is_active?: boolean;
};

export type StoreProject = {
  id: string;
  name: string;
  subdomain?: string;
  status: string;
  currency?: string;
  store_url?: string;
  products?: StoreProduct[];
};

export type StoreAnalytics = {
  total_revenue_cents: number;
  orders_by_status: Record<string, { count: number; revenue_cents: number }>;
  pending_orders: number;
  top_products: Array<{ name?: string; qty?: number; pid?: string }>;
  visits: number;
  conversion_rate: number;
  cart_abandonment_rate?: number;
  checkout_completed?: number;
};

export type UnifiedEcommerceReporting = {
  stores: { items: StoreProject[] };
  ads: { total_spend: number; blended_roas: number };
  email: { campaigns_total: number; active_campaigns: number };
  unified: {
    total_stores: number;
    published_stores: number;
    total_revenue_cents: number;
    total_visits: number;
    avg_conversion_rate: number;
    pending_checkouts: number;
    paid_orders: number;
    cart_abandonment_rate: number;
    ads_spend: number;
    ads_roas: number;
    email_campaigns: number;
  };
};
