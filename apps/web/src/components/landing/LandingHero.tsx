'use client'
import { useEffect, useState } from 'react'
export function LandingHero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <>
      <style>{`
        @keyframes nv-fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nv-fadeRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes nv-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes nv-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .nv-hero-t1 { opacity:0; animation: nv-fadeUp 0.7s ease forwards 0.1s; }
        .nv-hero-t2 { opacity:0; animation: nv-fadeUp 0.7s ease forwards 0.25s; }
        .nv-hero-t3 { opacity:0; animation: nv-fadeUp 0.7s ease forwards 0.4s; }
        .nv-hero-t4 { opacity:0; animation: nv-fadeUp 0.7s ease forwards 0.55s; }
        .nv-hero-t5 { opacity:0; animation: nv-fadeUp 0.7s ease forwards 0.7s; }
        .nv-hero-img { opacity:0; animation: nv-fadeRight 1s ease forwards 0.3s; }
        .nv-mock-float { animation: nv-float 5s ease-in-out infinite; }
        .nv-cta-primary {
          display:inline-flex; align-items:center; gap:8px;
          background:#0066ff; color:#fff; font-weight:700; font-size:16px;
          padding:0 32px; height:52px; border-radius:50px;
          text-decoration:none;
          box-shadow:0 0 28px rgba(0,102,255,0.5);
          transition:background 0.2s, transform 0.15s;
        }
        .nv-cta-primary:hover { background:#0052d4; transform:translateY(-2px); }
        .nv-cta-ghost {
          display:inline-flex; align-items:center; gap:8px;
          background:transparent; color:#fff; font-weight:600; font-size:16px;
          padding:0 28px; height:52px; border-radius:50px;
          text-decoration:none;
          border:1.5px solid rgba(255,255,255,0.28);
          transition:border-color 0.2s, background 0.2s;
        }
        .nv-cta-ghost:hover { border-color:rgba(255,255,255,0.6); background:rgba(255,255,255,0.07); }
      `}</style>
      <section style={{
        position: 'relative',
        background: 'linear-gradient(175deg, #07122a 0%, #0b1e44 30%, #0e3a7a 58%, #1a7fc4 78%, #4db8e8 92%, #a8dff5 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: '110px',
        paddingBottom: '80px',
        overflow: 'hidden',
      }}>
        <div style={{
          position:'absolute', top:'15%', left:'-8%',
          width:'560px', height:'560px', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,100,255,0.16) 0%, transparent 65%)',
          pointerEvents:'none',
        }} />
        <div style={{
          position:'absolute', top:'5%', right:'-5%',
          width:'420px', height:'420px', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(77,184,232,0.14) 0%, transparent 65%)',
          pointerEvents:'none',
        }} />
        <div style={{
          maxWidth:'1200px', margin:'0 auto', padding:'0 48px',
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:'56px', alignItems:'center', width:'100%',
        }}>
          <div>
            <div className="nv-hero-t1" style={{
              display:'inline-flex', alignItems:'center', gap:'8px',
              background:'rgba(0,102,255,0.15)',
              border:'1px solid rgba(77,184,232,0.35)',
              borderRadius:'50px', padding:'7px 18px', marginBottom:'28px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polygon points="7,1 8.8,5.5 13.5,5.8 10,9 11.2,13.5 7,11 2.8,13.5 4,9 0.5,5.8 5.2,5.5" fill="#FFB800"/>
              </svg>
              <span style={{ color:'#a8dff5', fontSize:'13px', fontWeight:600, letterSpacing:'0.04em' }}>
                Impulsa tu negocio con IA
              </span>
            </div>
            <h1 className="nv-hero-t2" style={{
              fontSize:'clamp(40px, 5vw, 68px)',
              fontWeight:900, lineHeight:1.06,
              color:'#ffffff', margin:'0 0 20px 0',
              letterSpacing:'-0.025em', fontFamily:'Inter, sans-serif',
            }}>
              El sistema operativo<br />
              <span style={{
                background:'linear-gradient(135deg, #4db8e8 0%, #0066ff 55%, #00cfff 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                de tu marketing
              </span>
            </h1>
            <p className="nv-hero-t3" style={{
              fontSize:'18px', color:'rgba(255,255,255,0.72)',
              lineHeight:1.72, margin:'0 0 36px 0', maxWidth:'460px',
            }}>
              Todas las herramientas que necesitas para captar, nutrir y convertir clientes — ejecutadas por IA, sin contratar cinco agencias distintas.
            </p>
            <div className="nv-hero-t4" style={{ display:'flex', gap:'14px', flexWrap:'wrap', marginBottom:'36px' }}>
              <a href="/contacto" className="nv-cta-primary">Solicitar propuesta gratis →</a>
              <a href="/saas" className="nv-cta-ghost">Ver la plataforma</a>
            </div>
            <div className="nv-hero-t5" style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
              {['✓ Sin permanencia','✓ Respuesta en 48h','✓ 132+ sectores'].map(t => (
                <span key={t} style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', fontWeight:500 }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="nv-hero-img" style={{ display:'flex', justifyContent:'flex-end', alignItems:'center' }}>
            <div className="nv-mock-float" style={{ width:'100%', maxWidth:'520px' }}>
              <div style={{
                background:'rgba(255,255,255,0.97)',
                borderRadius:'16px',
                boxShadow:'0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.2)',
                overflow:'hidden',
              }}>
                <div style={{
                  background:'#f5f6fa', padding:'10px 16px',
                  display:'flex', alignItems:'center', gap:'6px',
                  borderBottom:'1px solid #e4e8f0',
                }}>
                  <span style={{ width:'11px', height:'11px', borderRadius:'50%', background:'#ff5f57', display:'block' }} />
                  <span style={{ width:'11px', height:'11px', borderRadius:'50%', background:'#febc2e', display:'block' }} />
                  <span style={{ width:'11px', height:'11px', borderRadius:'50%', background:'#28c840', display:'block' }} />
                  <span style={{ marginLeft:'10px', color:'#9aa0b0', fontSize:'12px', fontWeight:500 }}>NELVYON — Dashboard</span>
                </div>
                <div style={{ display:'flex', minHeight:'340px' }}>
                  <div style={{ width:'140px', background:'#0d1b3e', padding:'16px 0', flexShrink:0 }}>
                    {[
                      { icon:'⚡', label:'Inicio' },
                      { icon:'📊', label:'Dashboard', active: true },
                      { icon:'💬', label:'Mensajes' },
                      { icon:'📅', label:'Calendario' },
                      { icon:'👤', label:'Contactos' },
                      { icon:'🎯', label:'Campañas' },
                      { icon:'🤖', label:'IA Agente' },
                      { icon:'📈', label:'Analytics' },
                    ].map(item => (
                      <div key={item.label} style={{
                        display:'flex', alignItems:'center', gap:'8px',
                        padding:'8px 14px',
                        background: item.active ? 'rgba(0,102,255,0.25)' : 'transparent',
                        borderLeft: item.active ? '2px solid #0066ff' : '2px solid transparent',
                      }}>
                        <span style={{ fontSize:'13px' }}>{item.icon}</span>
                        <span style={{ fontSize:'11px', color: item.active ? '#ffffff' : 'rgba(255,255,255,0.45)', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex:1, padding:'16px', background:'#f8fafc' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                      {[
                        { label:'LEADS HOY', value:'127', delta:'+18%', color:'#0066ff' },
                        { label:'ROAS', value:'4.2x', delta:'+12%', color:'#00b87a' },
                        { label:'CONVERSIÓN', value:'8.4%', delta:'+3%', color:'#7c3aed' },
                        { label:'INGRESOS', value:'€24.8k', delta:'+22%', color:'#ea8c00' },
                      ].map(k => (
                        <div key={k.label} style={{
                          background:'#ffffff', border:'1px solid #e4e8f0',
                          borderRadius:'10px', padding:'12px',
                        }}>
                          <div style={{ fontSize:'9px', color:'#9aa0b0', letterSpacing:'0.07em', marginBottom:'6px' }}>{k.label}</div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                            <span style={{ fontSize:'20px', fontWeight:800, color:'#0d1b3e' }}>{k.value}</span>
                            <span style={{ fontSize:'11px', fontWeight:700, color:k.color }}>{k.delta}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:'#ffffff', border:'1px solid #e4e8f0', borderRadius:'10px', padding:'12px' }}>
                      <div style={{ fontSize:'9px', color:'#9aa0b0', letterSpacing:'0.07em', marginBottom:'10px' }}>RENDIMIENTO SEMANAL</div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'5px', height:'56px' }}>
                        {[35, 58, 42, 75, 55, 90, 68].map((h, i) => (
                          <div key={i} style={{
                            flex:1, height:`${h}%`,
                            background: i === 5 ? 'linear-gradient(180deg, #0066ff 0%, #4db8e8 100%)' : 'rgba(0,102,255,0.18)',
                            borderRadius:'3px 3px 0 0',
                          }} />
                        ))}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                        {['L','M','X','J','V','S','D'].map(d => (
                          <span key={d} style={{ flex:1, textAlign:'center', fontSize:'9px', color:'#c4c9d6' }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'140px',
          background:'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.15) 60%, rgba(255,255,255,0.85) 85%, #ffffff 100%)',
          pointerEvents:'none',
        }} />
      </section>
    </>
  )
}
