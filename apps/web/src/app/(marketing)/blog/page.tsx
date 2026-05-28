import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blog | NELVYON — Marketing Digital y Automatización",
  description: "Artículos, guías y casos de éxito sobre marketing digital automatizado, Meta Ads, Google Ads, TikTok Ads y crecimiento empresarial.",
};
const posts = [
  { tag: "Meta Ads", title: "Cómo triplicar el ROAS en Meta Ads con agentes expertos", excerpt: "La estrategia que usamos para que nuestros clientes multipliquen por 3 su retorno en Meta Ads en menos de 30 días.", date: "15 Mayo 2026", readTime: "5 min" },
  { tag: "Google Ads", title: "Smart Bidding vs agentes NELVYON: quién gana", excerpt: "Comparamos el Smart Bidding de Google con los agentes de optimización de NELVYON. Los resultados son sorprendentes.", date: "8 Mayo 2026", readTime: "7 min" },
  { tag: "WhatsApp", title: "WhatsApp Marketing: la guía definitiva para 2026", excerpt: "Todo lo que necesitas para implementar secuencias de WhatsApp que convierten leads en clientes automáticamente.", date: "1 Mayo 2026", readTime: "10 min" },
  { tag: "TikTok Ads", title: "TikTok Ads para negocios B2C: estrategia completa", excerpt: "Cómo usar TikTok Ads para generar leads cualificados en 2026. Formatos, presupuestos y optimización con agentes.", date: "22 Abril 2026", readTime: "8 min" },
  { tag: "Automatización", title: "Email Marketing automatizado: de 0 a 10.000 suscriptores", excerpt: "La arquitectura de automatización de email que usan nuestros clientes para crecer sin tocar nada manualmente.", date: "15 Abril 2026", readTime: "6 min" },
  { tag: "Casos de éxito", title: "Cómo una clínica dental duplicó reservas en 45 días", excerpt: "Caso real: de 40 a 80 reservas mensuales con Google Ads + WhatsApp automatizado gestionado por NELVYON.", date: "8 Abril 2026", readTime: "4 min" },
];
export default function BlogPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      <section style={{ background: "linear-gradient(175deg, #07122a 0%, #0b1e44 40%, #1a7fc4 80%, #ffffff 100%)", padding: "80px 0 64px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4db8e8", marginBottom: "16px" }}>Blog NELVYON</p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>Ideas que hacen crecer tu negocio</h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: 0, lineHeight: 1.6 }}>Estrategias, casos de éxito y guías de marketing automatizado.</p>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
            {posts.map((post, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <span style={{ display: "inline-block", backgroundColor: "#e8f0fb", color: "#1a7fc4", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "20px", padding: "4px 12px", width: "fit-content" }}>{post.tag}</span>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#07122a", margin: 0, lineHeight: 1.3 }}>{post.title}</h2>
                <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e8eef8" }}>
                  <span style={{ fontSize: "12px", color: "#9aabbf" }}>{post.date}</span>
                  <span style={{ fontSize: "12px", color: "#9aabbf" }}>📖 {post.readTime} lectura</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
