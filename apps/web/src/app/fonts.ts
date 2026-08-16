import localFont from "next/font/local";

/**
 * Las tres familias van autoalojadas: el build no sale a Internet a por fuentes.
 *
 * El build de produccion fallo en CI y en local con «Failed to fetch Manrope
 * from Google Fonts»: la hoja de estilo seguia anunciando ficheros del
 * subconjunto latin que devolvian 404. No era un corte generico —las otras
 * familias descargaban bien— sino una incoherencia del lado de Google capaz de
 * tumbar cualquier despliegue sin aviso. Que aquel dia solo fallara Manrope fue
 * suerte, no diseño: las dieciseis familias estaban expuestas a lo mismo.
 *
 * Se usa siempre la fuente VARIABLE: un solo fichero por familia cubre todo el
 * eje de peso, asi que el rango declarado aqui incluye los pesos que se pedian
 * antes. Ver `src/fonts/README.md` para ficheros, autores y licencias.
 */

/** Rango 100-900: cubre los pesos 400-900 que declaraba la version de Google. */
export const inter = localFont({
  src: "../fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

export const manrope = localFont({
  src: "../fonts/manrope-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-manrope",
  display: "swap",
});

export const dmSans = localFont({
  src: "../fonts/dm-sans-latin-variable.woff2",
  weight: "100 1000",
  style: "normal",
  variable: "--font-dm-sans",
  display: "swap",
});
