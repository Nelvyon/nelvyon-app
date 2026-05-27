"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
export function LandingHero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(timer)
  }, [])
  return (
    <section
      style={{
        background: "linear-gradient(180deg, #07122a 0%, #1a4a7a 50%, #87CEEB 90%, #ffffff 100%)",
        paddingTop: "120px",
        paddingBottom: "80px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .hero-fade { opacity:0; transform:translateY(28px); transition:opacity 0.7s ease,transform 0.7s ease; }
        .hero-fade.visible { opacity:1; transform:translateY(0); }
        .hero-fade-right { opacity:0; transform:translateX(32px); transition:opacity 0.8s ease 0.2s,transform 0.8s ease 0.2s; }
        .hero-fade-right.visible { opacity:1; transform:translateX(0); }
        .hero-btn-primary:hover { background:#e8f0fe !important; }
        .hero-btn-secondary:hover { background:rgba(255,255,255,0.12) !important; }
        @media(max-width:900px){.hero-grid{flex-direction:column !important;gap:48px !important;}.hero-right{width:100% !important;max-width:480px !important;margin:0 auto;}}
      `}</style>
      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"0 24px", boxSizing:"border-box" }}>
        <div className="hero-grid" style={{ display:"flex", alignItems:"center", gap:"64px" }}>
          <div style={{ flex:"1 1 0", minWidth:0 }}>
            <div className={`hero-fade${visible?" visible":""}`} style={{ transitionDelay:"0s" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(255,184,0,0.15)", border:"1px solid rgba(255,184,0,0.4)", borderRadius:"50px", padding:"6px 16px", fontSize:"12px", fontWeight:600, color:"#FFB800", letterSpacing:"0.5px", marginBottom:"24px" }}>
                <span>⚡</span><span>Agencia de marketing digital</span>
              </span>
            </div>
            <div className={`hero-fade${visible?" visible":""}`} style={{ transitionDelay:"0.1s" }}>
              <h1 style={{ fontSize:"clamp(52px,7vw,80px)", fontWeight:900, lineHeight:1.05, letterSpacing:"-0.03em", color:"#ffffff", margin:"0 0 24px 0", fontFamily:"Inter,sans-serif" }}>
                Donde nace tu imperio,{" "}
                <span style={{ color:"#b8e4ff" }}>crece tu marca</span>{" "}
                y se impone tu legado
              </h1>
            </div>
            <div className={`hero-fade${visible?" visible":""}`} style={{ transitionDelay:"0.2s" }}>
              <p style={{ fontSize:"18px", lineHeight:1.65, color:"rgba(255,255,255,0.75)", margin:"0 0 36px 0", maxWidth:"520px", fontFamily:"Inter,sans-serif" }}>
                SEO, publicidad, email y automatización ejecutados por IA — resultados en semanas, sin contratar cinco agencias distintas.
              </p>
            </div>
            <div className={`hero-fade${visible?" visible":""}`} style={{ transitionDelay:"0.3s", display:"flex", gap:"16px", flexWrap:"wrap", marginBottom:"32px" }}>
              <Link href="/contacto" className="hero-btn-primary" style={{ display:"inline-block", background:"#ffffff", color:"#0a1628", fontWeight:700, fontSize:"16px", padding:"14px 32px", borderRadius:"50px", textDecoration:"none", fontFamily:"Inter,sans-serif", transition:"background 0.2s", whiteSpace:"nowrap" }}>Solicitar propuesta →</Link>
              <Link href="/servicios" className="hero-btn-secondary" style={{ display:"inline-block", background:"transparent", color:"#ffffff", fontWeight:600, fontSize:"16px", padding:"14px 32px", borderRadius:"50px", border:"1.5px solid rgba(255,255,255,0.6)", textDecoration:"none", fontFamily:"Inter,sans-serif", transition:"background 0.2s", whiteSpace:"nowrap" }}>Ver servicios</Link>
            </div>
            <div className={`hero-fade${visible?" visible":""}`} style={{ transitionDelay:"0.4s" }}>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.55)", margin:0, fontFamily:"Inter,sans-serif" }}>✓ Sin permanencia rígida · ✓ Respuesta en 48h · ✓ 193 sectores atendidos</p>
            </div>
          </div>
          <div className={`hero-fade-right hero-right${visible?" visible":""}`} style={{ flex:"0 0 420px", width:"420px" }}>
            <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"16px", padding:"24px", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
                <div style={{ display:"flex", gap:"6px" }}>
                  {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:"12px", height:"12px", borderRadius:"50%", background:c }}/>)}
                </div>
                <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.7)", fontFamily:"Inter,sans-serif", fontWeight:500 }}>NELVYON Dashboard</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
                {[{label:"Leads Hoy",value:"127",delta:"+18%"},{label:"ROAS",value:"4.2x",delta:"+12%"},{label:"Conversión",value:"8.4%",delta:"+3%"},{label:"Ingresos",value:"€24.8k",delta:"+22%"}].map(kpi=>(
                  <div key={kpi.label} style={{ background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"14px" }}>
                    <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Inter,sans-serif", fontWeight:600, marginBottom:"6px" }}>{kpi.label}</div>
                    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:"8px" }}>
                      <span style={{ fontSize:"22px", fontWeight:700, color:"#ffffff", fontFamily:"Inter,sans-serif" }}>{kpi.value}</span>
                      <span style={{ fontSize:"12px", fontWeight:600, color:"#4ade80", fontFamily:"Inter,sans-serif" }}>{kpi.delta}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:"10px", padding:"16px" }}>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", fontFamily:"Inter,sans-serif", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"12px" }}>Rendimiento semanal</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", height:"60px" }}>
                  {[40,65,45,80,55,90,70].map((h,i)=><div key={i} style={{ flex:1, height:`${h}%`, background:"linear-gradient(to top,#0066ff,#00cfff)", borderRadius:"4px 4px 0 0" }}/>)}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:"6px" }}>
                  {["L","M","X","J","V","S","D"].map(d=><span key={d} style={{ flex:1, textAlign:"center", fontSize:"10px", color:"rgba(255,255,255,0.3)", fontFamily:"Inter,sans-serif" }}>{d}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
