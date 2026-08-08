/**
 * Rutas limpias NELVYON → plantillas AIOR íntegras en /www
 * Estructura publicada: Home 08 (Inicio/Agencia) + Home 02 (SaaS) + interiores.
 * Usado por next.config redirects y páginas marketing.
 */
export const AIOR_NELVYON_ROUTES = [
  { source: "/", destination: "/www/index.html" },
  { source: "/saas", destination: "/www/saas.html" },
  { source: "/producto", destination: "/www/saas.html" },
  { source: "/agencia", destination: "/www/about.html" },
  { source: "/servicios", destination: "/www/features.html" },
  { source: "/soluciones", destination: "/www/features.html" },
  { source: "/automatizaciones", destination: "/www/features.html" },
  { source: "/ia", destination: "/www/features.html" },
  { source: "/precios", destination: "/www/pricing.html" },
  { source: "/contacto", destination: "/www/contact.html" },
  { source: "/faq", destination: "/www/faq.html" },
  { source: "/integraciones", destination: "/www/integrations.html" },
  { source: "/casos-de-uso", destination: "/www/case-studies.html" },
  { source: "/casos-de-uso/grid", destination: "/www/case-studies-2.html" },
  { source: "/casos-de-uso/detalle", destination: "/www/case-studies-details.html" },
  { source: "/casos-de-uso/lista", destination: "/www/cases.html" },
  { source: "/blog", destination: "/www/blog.html" },
  { source: "/blog/detalle", destination: "/www/blog-details.html" },
  { source: "/recursos", destination: "/www/blog.html" },
  { source: "/nosotros", destination: "/www/team.html" },
  { source: "/nosotros/detalle", destination: "/www/team-details.html" },
  { source: "/testimonios", destination: "/www/testimonial.html" },
  { source: "/tipografia", destination: "/www/typography.html" },
] as const;
