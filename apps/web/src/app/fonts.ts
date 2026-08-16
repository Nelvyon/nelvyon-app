import { DM_Sans, Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Manrope va autoalojada; las demas siguen viniendo de Google.
 *
 * El build de produccion fallo en CI y en local con «Failed to fetch Manrope
 * from Google Fonts»: la hoja de estilo seguia anunciando ficheros del
 * subconjunto latin que devolvian 404. No era un corte generico —las otras
 * quince familias descargaban bien— sino una incoherencia del lado de Google
 * capaz de tumbar cualquier despliegue sin aviso.
 *
 * Se usa la fuente VARIABLE: un solo fichero de 24 kB cubre el rango 200-800,
 * que incluye los cuatro pesos que se pedian antes (400, 500, 600, 700).
 * Ver `src/fonts/README.md` para la licencia y para las quince que faltan.
 */
export const manrope = localFont({
  src: "../fonts/manrope-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-manrope",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
