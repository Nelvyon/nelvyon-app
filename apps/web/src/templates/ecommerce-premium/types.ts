export interface EcommercePremiumSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface EcommercePremiumThemeTokens {
  accentHex: string;
}

export interface EcommercePremiumProduct {
  slug: string;
  name: string;
  /** Short label for PLP badge (e.g. category). */
  categoryBadge?: string;
  shortDescription: string;
  /** Longer marketing copy for PDP */
  description: string[];
  priceLabel: string;
  /** Public path for product imagery (Next/Image). */
  imageSrc: string;
  imageAlt: string;
  seo: EcommercePremiumSeoConfig;
}

export interface EcommercePremiumStoreConfig {
  seo: EcommercePremiumSeoConfig;
  theme: EcommercePremiumThemeTokens;
  storeName: string;
  tagline: string;
  trustNote: string;
  products: EcommercePremiumProduct[];
  checkout: {
    heading: string;
    summaryIntro: string;
    demoOrderNote: string;
    seo: EcommercePremiumSeoConfig;
  };
  footer: {
    orgLabel: string;
    finePrint: string;
    links: Array<{ label: string; href: string }>;
  };
}
