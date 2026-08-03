import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

/** Targeted a11y pass (CRM list/detail, OS overview, Billing overview). */
const a11yCriticalScreens = [
  "src/app/crm/**/*.{tsx,ts}",
  "src/features/crm/components/**/*.{tsx,ts}",
  "src/app/os/page.tsx",
  "src/app/billing/page.tsx",
];

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".source/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "playwright-report-saas/**",
      "blob-report/**",
      "next-env.d.ts",
      /** Marketing landing skeletons — not Nelvyon product surface. */
      "src/components/agenforce/**",
      /** Legacy embed script (vanilla JS). */
      "public/embed/**",
      /** Vendor CSS/JS/fonts for public AIOR skin (not app source). */
      "public/brand/public/nv/**",
      "public/brand/public/zubaz/**",
      /** Pack estático AIOR servido en /www: jQuery, GSAP, Swiper… minificados. */
      "public/www/**",
      /** Plantilla W3CRM: CSS compilado de terceros, no fuente de la app. */
      "public/w3crm/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: a11yCriticalScreens,
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      "jsx-a11y/label-has-associated-control": "error",
    },
  },
  /**
   * Plantilla oficial W3CRM portada a TS (ADR pendiente · Fase 0).
   * Es código de terceros: se conserva su estructura original y su estado de
   * tema es heterogéneo por diseño (mezcla `string` y `{value,label}`), por lo
   * que `any` es deliberado y acotado a este árbol. El resto del código sigue
   * con la regla activa.
   */
  {
    files: ["src/features/saas-w3crm/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
