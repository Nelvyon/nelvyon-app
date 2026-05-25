export type WhitelabelApplyConfig = {
  workspace_id?: number;
  company_name?: string;
  brand_name?: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  font?: string;
  support_email?: string | null;
  hide_nelvyon_branding?: boolean;
  custom_css?: string;
  custom_domain?: string | null;
  verified_domain?: boolean;
  smtp_from_name?: string;
  smtp_from_email?: string | null;
  css_variables?: Record<string, string>;
};

export const WHITELABEL_FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display"] as const;

export type WhitelabelFont = (typeof WHITELABEL_FONTS)[number];
