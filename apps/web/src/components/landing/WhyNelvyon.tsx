"use client"
const pillars = [
  {title:"TODO EN UNO",desc:"25 servicios de marketing en una sola suscripción. Sin coordinar agencias.",icon:(
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#60a5fa"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#60a5fa"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#60a5fa"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#60a5fa"/></svg>
  )},
  {title:"IA EN EL CENTRO",desc:"Automatización que ejecuta, no solo sugiere. Resultados reales sin intervención manual.",icon:(
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#60a5fa"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.636 5.636l2.828 2.828M15.536 15.536l2.828 2.828M5.636 18.364l2.828-2.828M15.536 8.464l2.828-2.828" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/></svg>
  )},
  {title:"SIN EQUIPO",desc:"Opera como una gran empresa sin contratar agencia ni gestores. Solo resultados.",icon:(
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 4.418 3.373 8.555 8 9.8C16.627 20.555 20 16.418 20 12V7l-8-4z" fill="#60a5fa" opacity="0.25"/><path d="M12 3L4 7v5c0 4.418 3.373 8.555 8 9.8C16.627 20.555 20 16.418 20 12V7l-8-4z" stroke="#60a5fa" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
]
export function WhyNelvyon() {
  return (
    <section style={{ background:"transparent", padding:"0 24px 60px", boxSizing:"border-box" }}>
      <style>{`@media(max-width:700px){.why-grid{grid-template-columns:1fr !important;}}`}</style>
      <div style={{ background:"#0a1628", borderRadius:"24px", padding:"60px 40px", maxWidth:"1100px", margin:"0 auto", boxSizing:"border-box" }}>
        <h2 style={{ color:"#ffffff", fontSize:"32px", fontWeight:800, textAlign:"center", marginTop:0, marginBottom:"48px", fontFamily:"Inter,sans-serif", lineHeight:1.2 }}>Por qué NELVYON es diferente</h2>
        <div className="why-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"32px" }}>
          {pillars.map(p=>(
            <div key={p.title} style={{ textAlign:"center", padding:"20px" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"12px", background:"rgba(0,102,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>{p.icon}</div>
              <div style={{ color:"#ffffff", fontSize:"14px", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", marginTop:"16px", fontFamily:"Inter,sans-serif" }}>{p.title}</div>
              <p style={{ color:"#94a3b8", fontSize:"15px", lineHeight:1.6, marginTop:"8px", marginBottom:0, fontFamily:"Inter,sans-serif" }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
