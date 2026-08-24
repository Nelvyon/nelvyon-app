import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: [
      "src/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      // UN comodin, no una lista blanca.
      //
      // Antes esto era una enumeracion de carpetas de `backend`, y fallaba de
      // la peor manera posible: cuando alguien anadia un modulo con pruebas, la
      // suite NO las ejecutaba y seguia diciendo "passed". Nada rojo, ninguna
      // senal — solo cobertura que no existia.
      //
      // Ya habia pasado con `backend/auth` (el comentario que estaba aqui lo
      // contaba) y volvio a pasar con `backend/config`, `backend/http` y
      // `backend/private-ai`, que es la empresa IA autonoma entera.
      //
      // El comodin lo cierra por construccion, y
      // `laSuiteNoDejaCarpetasFuera.test.ts` vigila que no vuelva a estrecharse.
      "../../backend/**/__tests__/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      // Varias rutas del App Router alcanzan `backend/` como `@/../../backend/...`.
      // Next lo resuelve, pero Vite hace sustitucion textual sobre el alias `@` y
      // el resultado mezcla separadores en Windows, asi que no encontraba el
      // fichero y el test ni siquiera podia importar la ruta. Va antes que `@`
      // porque el alias mas especifico tiene que ganar.
      "@/../../backend": path.resolve(__dirname, "../../backend"),
      "@": path.resolve(__dirname, "./src"),
      "@nelvyon/os-agents/constants": path.resolve(__dirname, "../../backend/os-agents/constants.ts"),
      "@nelvyon/os-agents": path.resolve(__dirname, "../../backend/os-agents/index.ts"),
      "@nelvyon/auth/AuthService": path.resolve(__dirname, "../../backend/auth/AuthService.ts"),
      "@nelvyon/auth": path.resolve(__dirname, "../../backend/auth/index.ts"),
      "@nelvyon/billing": path.resolve(__dirname, "../../backend/billing/index.ts"),
      "@nelvyon/saas": path.resolve(__dirname, "../../backend/saas/index.ts"),
      "@nelvyon/saas-reports": path.resolve(__dirname, "../../backend/saas-reports/index.ts"),
      "@nelvyon/admin": path.resolve(__dirname, "../../backend/admin/index.ts"),
      "@nelvyon/email": path.resolve(__dirname, "../../backend/email/index.ts"),
      "@nelvyon/monitoring": path.resolve(__dirname, "../../backend/monitoring/index.ts"),
      "@nelvyon/onboarding": path.resolve(__dirname, "../../backend/onboarding/index.ts"),
      "@nelvyon/usage": path.resolve(__dirname, "../../backend/usage/index.ts"),
      "@nelvyon/errors": path.resolve(__dirname, "../../backend/errors/index.ts"),
      "@nelvyon/logger": path.resolve(__dirname, "../../backend/logger/index.ts"),
      "@nelvyon/gdpr": path.resolve(__dirname, "../../backend/gdpr/index.ts"),
      "@nelvyon/apikeys": path.resolve(__dirname, "../../backend/apikeys/index.ts"),
      // Backend os-agents imports `ws`; Vite resolves from the importing file dir unless aliased.
      ws: path.resolve(__dirname, "node_modules/ws"),
      resend: path.resolve(__dirname, "node_modules/resend"),
      "node-cron": path.resolve(__dirname, "node_modules/node-cron"),
      "@upstash/redis": path.resolve(__dirname, "node_modules/@upstash/redis"),
      "@sentry/nextjs": path.resolve(__dirname, "node_modules/@sentry/nextjs"),
      stripe: path.resolve(__dirname, "node_modules/stripe"),
      pg: path.resolve(__dirname, "../../backend/db/node_modules/pg"),
    },
  },
});
