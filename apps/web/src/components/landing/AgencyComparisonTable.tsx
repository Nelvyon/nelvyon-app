'use client'
import { useEffect, useRef, useState } from 'react'
const ROWS = [
  { feature: 'SEO & Posicionamiento',   tools: ['Google','Semrush'],    price: '€800–2.500/mes' },
  { feature: 'Google Ads / SEM',        tools: ['Google','Optmyzr'],    price: '€500–2.000/mes' },
  { feature: 'Meta Ads (FB + IG)',      tools: ['Meta','AdEspresso'],   price: '€400–1.500/mes' },
  { feature: 'TikTok Ads',             tools: ['TikTok'],              price: '€300–1.000/mes' },
  { feature: 'Email Marketing',         tools: ['Mailchimp','Klaviyo'], price: '€200–800/mes'  },
  { feature: 'Content Marketing',       tools: ['Writer','Jasper'],    price: '€500–2.000/mes' },
  { feature: 'Social Media',           tools: ['Hootsuite','Buffer'],   price: '€400–1.500/mes' },
  { feature: 'Web & Landing Pages',    tools: ['Webflow','Wix'],        price: '€300–1.200/mes' },
  { feature: 'Vídeo Marketing',         tools: ['Wistia','Vimeo'],      price: '€600–2.500/mes' },
  { feature: 'Automatización IA',      tools: ['Zapier','Make'],        price: '€800–3.000/mes' },
  { feature: 'WhatsApp Marketing',     tools: ['Twilio','ManyChat'],    price: '€200–600/mes'  },
  { feature: 'CRO & Optimización',     tools: ['Optimizely','VWO'],    price: '€400–1.500/mes' },
  { feature: 'Reputación & PR',        tools: ['Birdeye','Yext'],      price: '€300–1.000/mes' },
  { feature: 'Analytics & Reporting',  tools: ['GA4','Looker'],        price: '€200–800/mes'  },
]
function ToolBubble({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase()
  const colors: Record<string, string> = {
    Google:'#4285f4', Semrush:'#ff6b2b', Meta:'#0866ff', Mailchimp:'#ffe01b',
    Klaviyo:'#00b200', HubSpot:'#ff7a59', Hootsuite:'#143059', Buffer:'#168eea',
    Webflow:'#4353ff', Wix:'#000000', TikTok:'#010101', Zapier:'#ff4a00',
    Make:'#6d00cc', Twilio:'#f22f46', ManyChat:'#4169e1', Optimizely:'#1f36c7',
    VWO:'#f7a300', Birdeye:'#00bcd4', Yext:'#0077d3', GA4:'#e37400',
    Looker:'#5f6368', Wistia:'#54bbff', Vimeo:'#1ab7ea', Writer:'#6f42c1',
    AdEspresso:'#1877f2', Optmyzr:'#ff6600',
  }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'28px', height:'28px', borderRadius:'50%',
      background: colors[name] || '#555',
      color: name === 'Mailchimp' ? '#000' : '#fff',
      fontSize:'9px', fontWeight:800,
      marginRight:'4px', border:'2px solid rgba(255,255,255,0.12)',
      flexShrink:0,
    }}>
      {initials}
    </span>
  )
}
export function AgencyComparisonTable() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.05 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <>
      <style>{`
        @keyframes nv-rowIn {
          from { opacity:0; transform:translateX(-16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .nv-cmp-row {
          display:grid;
          grid-template-columns: 1.4fr 180px 200px 140px;
          align-items:center;
          border-bottom:1px solid rgba(255,255,255,0.055);
          transition:background 0.18s;
        }
        .nv-cmp-row:hover { background:rgba(255,255,255,0.035); }
        .nv-cell { padding:15px 20px; }
      `}</style>
      <section style={{ background:'#f0f7ff', paddingTop:'96px', paddingBottom:'96px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <span style={{
              display:'inline-block',
              background:'rgba(0,102,255,0.1)', color:'#0066ff',
              fontSize:'12px', fontWeight:700, letterSpacing:'0.1em',
              textTransform:'uppercase', padding:'7px 18px', borderRadius:'50px', marginBottom:'18px',
            }}>Comparativa</span>
            <h2 style={{
              fontSize:'clamp(28px,4vw,48px)', fontWeight:800,
              color:'#0d1b3e', margin:'0 0 14px 0', letterSpacing:'-0.02em',
            }}>¿Por qué NELVYON supera<br />a cualquier agencia?</h2>
            <p style={{ fontSize:'18px', color:'#5a6b85', maxWidth:'500px', margin:'0 auto', lineHeight:1.6 }}>
              Calidad de agencia global. Velocidad de startup. Precio de freelancer.
            </p>
          </div>
          <div ref={ref} style={{
            background:'#071020', borderRadius:'20px', overflow:'hidden',
            boxShadow:'0 48px 96px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <div style={{
              display:'grid', gridTemplateColumns:'1.4fr 180px 200px 140px',
              background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ padding:'18px 20px', fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.38)', letterSpacing:'0.1em', textTransform:'uppercase' }}>SERVICIO</div>
              <div style={{ padding:'18px 20px', fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.38)', letterSpacing:'0.1em', textTransform:'uppercase' }}>SUSTITUYE A</div>
              <div style={{ padding:'18px 20px', fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.38)', letterSpacing:'0.1em', textTransform:'uppercase' }}>PRECIO SEPARADO</div>
              <div style={{ padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{
                  background:'#0066ff', color:'#ffffff',
                  fontSize:'13px', fontWeight:800, letterSpacing:'0.06em',
                  padding:'6px 16px', borderRadius:'50px', textTransform:'uppercase',
                }}>NELVYON</span>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={row.feature} className="nv-cmp-row" style={{
                opacity: visible ? 1 : 0,
                animation: visible ? `nv-rowIn 0.4s ease forwards ${i * 0.035}s` : 'none',
              }}>
                <div className="nv-cell" style={{ color:'rgba(255,255,255,0.82)', fontWeight:500, fontSize:'14px' }}>{row.feature}</div>
                <div className="nv-cell" style={{ display:'flex', alignItems:'center' }}>
                  {row.tools.map(t => <ToolBubble key={t} name={t} />)}
                </div>
                <div className="nv-cell" style={{ color:'rgba(255,255,255,0.38)', fontSize:'13px' }}>{row.price}</div>
                <div className="nv-cell" style={{ display:'flex', justifyContent:'center' }}>
                  <span style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:'30px', height:'30px', background:'rgba(0,102,255,0.22)', borderRadius:'50%',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7.5L5.2 11L12 3" stroke="#00cfff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            ))}
            <div style={{
              display:'grid', gridTemplateColumns:'1.4fr 180px 200px 140px',
              background:'rgba(0,102,255,0.09)', borderTop:'2px solid rgba(0,102,255,0.35)',
            }}>
              <div style={{ padding:'26px 20px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#00cfff', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'4px' }}>PRECIO TOTAL ESTIMADO</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>Si contrataras todo por separado</div>
              </div>
              <div style={{ padding:'26px 20px' }} />
              <div style={{ padding:'26px 20px', display:'flex', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.35)', textDecoration:'line-through', marginBottom:'2px' }}>€5.700–21.600/mes</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)' }}>por separado</div>
                </div>
              </div>
              <div style={{ padding:'26px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontSize:'52px', fontWeight:900, color:'#ffffff', lineHeight:1, letterSpacing:'-0.03em' }}>
                  <sup style={{ fontSize:'22px', color:'#00cfff', verticalAlign:'super', lineHeight:1 }}>€</sup>97
                </div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', marginTop:'3px' }}>/mes</div>
              </div>
            </div>
            <div style={{ padding:'28px 40px', textAlign:'center', background:'rgba(0,0,0,0.18)', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', margin:'0 0 16px 0' }}>Sin permanencia · Cancela cuando quieras · Respuesta en 48h</p>
              <a href="/contacto" style={{
                display:'inline-flex', alignItems:'center', gap:'8px',
                background:'#0066ff', color:'#ffffff', fontWeight:700, fontSize:'16px',
                padding:'0 40px', height:'52px', borderRadius:'50px', textDecoration:'none',
                boxShadow:'0 0 40px rgba(0,102,255,0.55)',
              }}>Empezar por €97/mes →</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
