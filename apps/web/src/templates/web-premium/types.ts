export interface WebPremiumSeoConfig {
  title: string;
  description: string;
  /** Path only; combined with optional site base URL in metadata helper */
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  /** Open Graph locale, e.g. en_US */
  locale?: string;
}

export interface WebPremiumThemeTokens {
  /** CSS hex accent for CTAs/links on light marketing surfaces */
  accentHex: string;
}

export interface WebPremiumHeroSection {
  eyebrow?: string;
  heading: string;
  subheading: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  heroImageSrc: string;
  heroImageAlt: string;
}

export interface WebPremiumAboutSection {
  id?: string;
  heading: string;
  body: string[];
}

export interface WebPremiumServiceItem {
  title: string;
  description: string;
  /** Short label for DS badge (optional). */
  badge?: string;
}

export interface WebPremiumServicesSection {
  id?: string;
  heading: string;
  intro?: string;
  items: WebPremiumServiceItem[];
}

export interface WebPremiumCtaSection {
  id?: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
}

export interface WebPremiumFooterSection {
  orgName: string;
  finePrint: string;
  links: Array<{ label: string; href: string }>;
}

export interface WebPremiumSiteConfig {
  seo: WebPremiumSeoConfig;
  theme: WebPremiumThemeTokens;
  hero: WebPremiumHeroSection;
  about: WebPremiumAboutSection;
  services: WebPremiumServicesSection;
  cta: WebPremiumCtaSection;
  footer: WebPremiumFooterSection;
}
