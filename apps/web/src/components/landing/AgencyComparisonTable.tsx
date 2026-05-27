"use client"
const rows:[string,string,string,string,string][] = [
  ["SEO & Posicionamiento","✅","⚠️","❌","✅"],
  ["Google Ads / SEM","✅","⚠️","⚠️","✅"],
  ["Meta Ads","✅","✅","⚠️","✅"],
  ["TikTok Ads","✅","⚠️","❌","✅"],
  ["Email Marketing","✅","⚠️","⚠️","✅"],
  ["Content Marketing","✅","⚠️","✅","✅"],
  ["Social Media","✅","✅","⚠️","✅"],
  ["Web & Landings","✅","⚠️","⚠️","✅"],
  ["Video Marketing","✅","❌","❌","✅"],
  ["Automatización IA","❌","❌","❌","✅"],
  ["WhatsApp Marketing","⚠️","❌","❌","✅"],
  ["CRO & Optimización","✅","⚠️","❌","✅"],
  ["Reputación & PR","✅","⚠️","❌","✅"],
  ["Analytics & Reporting","✅","⚠️","⚠️","✅"],
]
export function AgencyComparisonTable() {
  return (
    <section style={{ background:"#071020", padding:"80px 24px", boxSizing:"border-box" }}>
      <style>{`@media(max-width:700px){.cmp-table{font-size:12px !important;}.cmp-table th,.cmp-table td{padding:10px 8px !important;}.price-nv{font-size:32px !important;}}`}</style>
      <div style={{ maxWidth:"960px", margin:"0 auto", textAlign:"center" }}>
        <span style={{ display:"inline-block", background:"rgba(0,102,255,0.2)", color:"#60a5fa", border:"1px solid rgba(0,102,255,0.4)", borderRadius:"50px", padding:"6px 16px", fontSize:"12px", fontWeight:600, letterSpacing:"1px", fontFamily:"Inter,sans-serif", textTransform:"uppercase", marginBottom:"16px" }}>COMPARATIVA</span>
        <h2 style={{ color:"#ffffff", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, margin:"16px 0 12px", fontFamily:"Inter,sans-serif", lineHeight:1.15 }}>¿Por qué NELVYON supera a cualquier agencia?</h2>
        <p style={{ color:"#94a3b8", fontSize:"18px", margin:"12px 0 48px", fontFamily:"Inter,sans-serif", lineHeight:1.6 }}>Calidad de agencia global. Velocidad de startup. Precio de freelancer.</p>
        <div style={{ overflowX:"auto" }}>
          <table className="cmp-table" style={{ width:"100%", borderCollapse:"collapse", fontFamily:"Inter,sans-serif" }}>
            <thead>
              <tr>
                {["SERVICIO","Agencia grande","Agencia mediana","Freelance","NELVYON"].map((h,i)=>(
                  <th key={h} style={{ padding:"16px", fontSize:"12px", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:i===4?"#ffffff":"#94a3b8", textAlign:i===0?"left":"center", background:i===4?"#0066ff":"transparent", borderRadius:i===4?"12px 12px 0 0":undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([svc,c1,c2,c3,c4],ri)=>(
                <tr key={svc} style={{ background:ri%2!==0?"rgba(255,255,255,0.03)":"transparent" }}>
                  <td style={{ padding:"14px 16px", fontSize:"14px", borderBottom:"1px solid rgba(255,255,255,0.05)", textAlign:"left", color:"#e2e8f0", fontWeight:500 }}>{svc}</td>
                  {[c1,c2,c3].map((v,ci)=><td key={ci} style={{ padding:"14px 16px", fontSize:"16px", borderBottom:"1px solid rgba(255,255,255,0.05)", textAlign:"center", color:"#e2e8f0" }}>{v}</td>)}
                  <td style={{ padding:"14px 16px", fontSize:"16px", borderBottom:"1px solid rgba(255,255,255,0.05)", textAlign:"center", color:"#e2e8f0", background:"rgba(0,102,255,0.08)" }}>{c4}</td>
                </tr>
              ))}
              <tr style={{ background:"rgba(255,255,255,0.05)", borderTop:"2px solid rgba(255,255,255,0.1)" }}>
                <td style={{ padding:"14px 16px", fontSize:"14px", color:"#ffffff", fontWeight:700, textTransform:"uppercase", textAlign:"left" }}>PRECIO TOTAL ESTIMADO</td>
                {["€2.000–15.000/mes","€800–4.000/mes","€300–2.000/mes"].map(p=><td key={p} style={{ padding:"14px 16px", fontSize:"14px", color:"#f87171", textAlign:"center", fontWeight:600 }}>{p}</td>)}
                <td style={{ padding:"14px 16px", textAlign:"center", background:"rgba(0,102,255,0.08)" }}>
                  <span className="price-nv" style={{ fontSize:"48px", fontWeight:900, color:"#ffffff", lineHeight:1, fontFamily:"Inter,sans-serif", display:"block" }}>€97/mes</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ color:"#64748b", fontSize:"14px", textAlign:"center", marginTop:"24px", fontFamily:"Inter,sans-serif" }}>Sin permanencia · Cancela cuando quieras · Respuesta en 48h</p>
      </div>
    </section>
  )
}
