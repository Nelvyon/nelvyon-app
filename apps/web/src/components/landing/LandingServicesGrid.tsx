'use client'
import Link from 'next/link'
const SERVICES = [
  { icon:'🔍', title:'SEO & Posicionamiento', color:'#0066ff', items:['SEO Técnico On-Page','Link Building','SEO Local','Auditoría SEO'] },
  { icon:'📣', title:'Publicidad Digital', color:'#0abde3', items:['Google Ads / SEM','Meta Ads (FB + IG)','TikTok Ads','LinkedIn Ads'] },
  { icon:'✍️', title:'Contenido & Social', color:'#8854d0', items:['Copywriting','Posts Redes','Vídeo Marketing','Artículos Blog'] },
  { icon:'🌐', title:'Web & Diseño', color:'#20bf6b', items:['Landing Pages','Rediseño Web','UX/UI','Chatbots IA'] },
  { icon:'⚡', title:'Automatización IA', color:'#f7b731', items:['Email Automático','CRM Inteligente','WhatsApp Marketing','Lead Nurturing'] },
  { icon:'📊', title:'Analytics & CRO', color:'#fc5c65', items:['Reporting Mensual','A/B Testing','Optimización CRO','Reputación & PR'] },
]
export function LandingServicesGrid() {
  return (
    <>
      <style>{`
        .nv-svc-card {
          background:#fff; border:1.5px solid #e8eef8;
          border-radius:20px; padding:32px;
          transition:transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .nv-svc-card:hover {
          transform:translateY(-6px);
          box-shadow:0 24px 52px rgba(0,0,0,0.09);
          border-color:transparent;
        }
      `}</style>
      <section style={{ background:'#ffffff', paddingTop:'96px', paddingBottom:'96px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ textAlign:'center', marginBottom:'60px' }}>
            <span style={{
              display:'inline-block', background:'#f0f7ff', color:'#0066ff',
              fontSize:'12px', fontWeight:700, letterSpacing:'0.1em',
              textTransform:'uppercase', padding:'7px 18px', borderRadius:'50px', marginBottom:'18px',
            }}>Nuestros servicios</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, color:'#0d1b3e', margin:'0 0 14px 0', letterSpacing:'-0.02em' }}>
              Todo lo que necesita tu marca,<br />en un solo lugar
            </h2>
            <p style={{ fontSize:'18px', color:'#5a6b85', maxWidth:'540px', margin:'0 auto', lineHeight:1.6 }}>
              25 servicios ejecutados con IA. Sin coordinar agencias. Sin contratar equipos.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'24px' }}>
            {SERVICES.map(svc => (
              <div key={svc.title} className="nv-svc-card">
                <div style={{
                  width:'50px', height:'50px', borderRadius:'14px',
                  background:`${svc.color}18`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'22px', marginBottom:'18px',
                }}>{svc.icon}</div>
                <h3 style={{ fontSize:'17px', fontWeight:800, color:'#0d1b3e', margin:'0 0 14px 0' }}>{svc.title}</h3>
                <ul style={{ margin:0, padding:0, listStyle:'none' }}>
                  {svc.items.map(item => (
                    <li key={item} style={{
                      display:'flex', alignItems:'center', gap:'10px',
                      padding:'6px 0', fontSize:'13px', color:'#5a6b85',
                      borderBottom:'1px solid #f0f4f8',
                    }}>
                      <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:svc.color, flexShrink:0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop:'18px', height:'3px', borderRadius:'2px', background:`linear-gradient(90deg, ${svc.color} 0%, transparent 100%)` }} />
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:'44px' }}>
            <Link href="/servicios" style={{
              display:'inline-flex', alignItems:'center', gap:'8px',
              background:'#0d1b3e', color:'#ffffff', fontWeight:700, fontSize:'15px',
              padding:'0 36px', height:'50px', borderRadius:'50px', textDecoration:'none',
            }}>Ver todos los servicios →</Link>
          </div>
        </div>
      </section>
    </>
  )
}
