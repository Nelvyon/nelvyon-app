'use client'
import { useState, useEffect, useRef } from 'react'
interface StatCardProps {
  value: number
  suffix: string
  label: string
  description: string
}
function StatCard({ value, suffix, label, description }: StatCardProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setInterval> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          let start = 0
          const duration = 1800
          const step = Math.ceil(value / (duration / 16))
          timer = setInterval(() => {
            start += step
            if (start >= value) {
              setCount(value)
              if (timer) clearInterval(timer)
            } else {
              setCount(start)
            }
          }, 16)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer) clearInterval(timer)
    }
  }, [value])
  return (
    <div
      ref={ref}
      style={{
        background: '#ffffff',
        border: '1px solid #e8eef8',
        borderRadius: '16px',
        padding: '36px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 'clamp(36px, 4vw, 52px)',
          fontWeight: 800,
          color: '#07122a',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {count.toLocaleString('es-ES')}{suffix}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#07122a', marginTop: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#6b7a99', lineHeight: 1.5, fontWeight: 400 }}>
        {description}
      </div>
    </div>
  )
}
export function LandingStats() {
  const stats = [
    {
      value: 132,
      suffix: '+',
      label: 'Agencias confían en Nelvyon',
      description: 'Profesionales del marketing que escalan con nuestra plataforma',
    },
    {
      value: 25,
      suffix: '',
      label: 'Herramientas integradas',
      description: 'CRM, email, automatización, pagos y más en un solo lugar',
    },
    {
      value: 48,
      suffix: 'h',
      label: 'Ahorro mensual por agencia',
      description: 'Tiempo recuperado gracias a los agentes expertos de Nelvyon',
    },
    {
      value: 100,
      suffix: '%',
      label: 'Automatización real',
      description: 'Flujos que corren solos, sin que nadie tenga que tocar nada',
    },
  ]
  return (
    <section
      style={{
        width: '100%',
        background: '#ffffff',
        padding: '96px 0',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 48px',
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 800,
              color: '#07122a',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 16px 0',
            }}
          >
            Números que lo dicen todo
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#6b7a99',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Agencias reales, resultados reales. Sin promesas vacías.
          </p>
        </div>
        {/* Cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
          }}
        >
          {stats.map((s) => (
            <StatCard
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              description={s.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
