"use client"
const logos = [
  {name:"Zapier",symbol:"⚡",color:"#FF4A00"},
  {name:"WhatsApp",symbol:"💬",color:"#25D366"},
  {name:"Facebook",symbol:"f",color:"#1877F2"},
  {name:"Stripe",symbol:"S",color:"#635BFF"},
  {name:"Shopify",symbol:"🛍",color:"#96BF48"},
  {name:"TikTok",symbol:"♪",color:"#111827"},
  {name:"LinkedIn",symbol:"in",color:"#0A66C2"},
  {name:"Google",symbol:"G",color:"#4285F4"},
  {name:"Slack",symbol:"#",color:"#E01E5A"},
  {name:"HubSpot",symbol:"H",color:"#FF7A59"},
  {name:"Mailchimp",symbol:"M",color:"#D4A017"},
  {name:"Klaviyo",symbol:"K",color:"#1D1D1D"},
]
const allLogos = [...logos,...logos]
export function LandingLogosMarquee() {
  return (
    <section style={{ background:"#ffffff", padding:"40px 0", width:"100%", overflow:"hidden", boxSizing:"border-box" }}>
      <style>{`
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .marquee-track { display:flex; gap:48px; width:max-content; animation:marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state:paused; }
      `}</style>
      <p style={{ textAlign:"center", color:"#6b7280", fontSize:"12px", fontWeight:600, letterSpacing:"2px", textTransform:"uppercase", marginBottom:"24px", marginTop:0, fontFamily:"Inter,sans-serif" }}>CONECTADO CON LAS HERRAMIENTAS QUE YA USAS</p>
      <div style={{ overflow:"hidden", maskImage:"linear-gradient(to right,transparent 0%,black 8%,black 92%,transparent 100%)", WebkitMaskImage:"linear-gradient(to right,transparent 0%,black 8%,black 92%,transparent 100%)", padding:"4px 0" }}>
        <div className="marquee-track">
          {allLogos.map((logo,i)=>(
            <div key={`${logo.name}-${i}`} style={{ display:"flex", alignItems:"center", gap:"8px", whiteSpace:"nowrap", flexShrink:0 }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:logo.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#ffffff", fontSize:"14px", fontWeight:700, fontFamily:"Inter,sans-serif", flexShrink:0, lineHeight:1 }}>{logo.symbol}</div>
              <span style={{ color:"#374151", fontSize:"14px", fontWeight:500, fontFamily:"Inter,sans-serif" }}>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
