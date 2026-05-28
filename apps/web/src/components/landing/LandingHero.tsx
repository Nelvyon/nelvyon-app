'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
export function LandingHero() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <section
      style={{
        width: '100%',
        background: 'linear-gradient(175deg, #07122a 0%, #0b1e44 30%, #0e3a7a 58%, #0084fc 78%, #00d6fe 92%, #a8dff5 100%)',
        paddingTop: '0',
        paddingBottom: '0',
        position: 'relative',
        overflow: 'hidden',
        marginTop: '-80px',
      }}
    >
      {/* Navbar offset */}
      <div style={{ height: '80px' }} />
      {/* Fondo estrellas sutil */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.18) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.12) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.10) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.08) 0%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 48px 0 48px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.20)',
              borderRadius: '50px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#a8dff5',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d6fe', display: 'inline-block' }} />
            La plataforma todo-en-uno para agencias y negocios
          </span>
        </div>
        {/* H1 */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 'clamp(38px, 5.5vw, 68px)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
          }}
        >
          El sistema operativo<br />
          de tu negocio
        </h1>
        {/* Eslogan */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 'clamp(16px, 2vw, 20px)',
            fontWeight: 500,
            color: '#a8dff5',
            margin: '0 0 16px 0',
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}
        >
          Donde nace tu imperio, crece tu marca y se impone tu legado
        </p>
        {/* Subtítulo */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: 'rgba(255,255,255,0.72)',
            maxWidth: '640px',
            margin: '0 auto 44px auto',
            lineHeight: 1.6,
            fontWeight: 400,
          }}
        >
          Capta leads, automatiza seguimientos, cierra ventas y escala tu agencia —
          todo ejecutado por agentes expertos dentro de una sola plataforma.
        </p>
        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}>
          <a
            href="/registro"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 32px',
              borderRadius: '50px',
              background: '#ffffff',
              color: '#07122a',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            Empieza gratis 14 días
          </a>
          <a
            href="/demo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 32px',
              borderRadius: '50px',
              background: 'transparent',
              border: '2px solid rgba(255,255,255,0.40)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            Ver demo →
          </a>
        </div>
        {/* Dashboard mock */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1040px',
            margin: '0 auto',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -8px 80px rgba(7,18,42,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* Top bar */}
          <div
            style={{
              background: '#0d1b3e',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
            <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', margin: '0 16px' }} />
          </div>
          {/* Dashboard interior */}
          <div style={{ display: 'flex', background: '#0a1628', minHeight: '420px' }}>
            {/* Sidebar */}
            <div
              style={{
                width: '200px',
                flexShrink: 0,
                background: '#071020',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 0',
              }}
            >
              {/* Logo en sidebar */}
              <div style={{ padding: '0 16px 20px 16px' }}>
                <div
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #0084fc, #00d6fe)' }} />
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px' }}>NELVYON</span>
                </div>
              </div>
              {[
                { label: 'Dashboard', active: true },
                { label: 'Contactos', active: false },
                { label: 'Campañas', active: false },
                { label: 'Automatizaciones', active: false },
                { label: 'CRM', active: false },
                { label: 'Analíticas', active: false },
                { label: 'Sitios Web', active: false },
                { label: 'Pagos', active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: item.active ? 'rgba(29,127,196,0.18)' : 'transparent',
                    borderLeft: item.active ? '2px solid #0084fc' : '2px solid transparent',
                    cursor: 'default',
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.active ? '#00d6fe' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                  <span style={{ color: item.active ? '#ffffff' : 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: item.active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Main content */}
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700 }}>Bienvenido de nuevo</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '2px' }}>Hoy es un gran día para escalar</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '80px', height: '28px', background: 'rgba(29,127,196,0.25)', borderRadius: '6px', border: '1px solid rgba(29,127,196,0.4)' }} />
                  <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px' }} />
                </div>
              </div>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Leads este mes', value: '2,847', change: '+18%', up: true },
                  { label: 'Ingresos', value: '€38,420', change: '+24%', up: true },
                  { label: 'Tasa cierre', value: '34.2%', change: '+5%', up: true },
                  { label: 'Clientes activos', value: '142', change: '+12', up: true },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginBottom: '6px', fontWeight: 500 }}>{kpi.label}</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{kpi.value}</div>
                    <div style={{ color: '#28c840', fontSize: '10px', fontWeight: 600 }}>{kpi.change}</div>
                  </div>
                ))}
              </div>
              {/* Chart area + pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', flex: 1 }}>
                {/* Chart */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '12px', fontWeight: 500 }}>Ingresos — últimos 6 meses</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                    {[40, 55, 48, 70, 65, 90].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: '4px 4px 0 0',
                          background: i === 5
                            ? 'linear-gradient(180deg, #00d6fe 0%, #0084fc 100%)'
                            : 'rgba(29,127,196,0.25)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Pipeline */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '12px', fontWeight: 500 }}>Pipeline activo</div>
                  {[
                    { stage: 'Nuevo lead', count: 48, pct: 100 },
                    { stage: 'Contactado', count: 31, pct: 65 },
                    { stage: 'Propuesta', count: 18, pct: 38 },
                    { stage: 'Negociación', count: 9, pct: 19 },
                    { stage: 'Cerrado', count: 5, pct: 10 },
                  ].map((s) => (
                    <div key={s.stage} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px' }}>{s.stage}</span>
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px' }}>{s.count}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${s.pct}%`, height: '100%', background: '#0084fc', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
