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
    ignores: [".next/**", "node_modules/**", "out/**", "dist/**", "coverage/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: a11yCriticalScreens,
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      "jsx-a11y/label-has-associated-control": "error",
    },
  },
];

export default eslintConfig;
