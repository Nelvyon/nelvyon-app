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
      "next-env.d.ts",
      /** Legacy GHL dashboard — superseded by /saas/* (redirects in next.config). */
      "src/app/dashboard/**",
      /** Legacy sector hub dashboards (not SaaS product). */
      "src/components/dashboard/**",
      /** Marketing landing skeletons — not Nelvyon product surface. */
      "src/components/agenforce/**",
      /** Legacy embed script (vanilla JS). */
      "public/embed/**",
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
];

export default eslintConfig;
