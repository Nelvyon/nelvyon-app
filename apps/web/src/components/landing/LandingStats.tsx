'use client'
import { useEffect, useRef, useState } from 'react'
function useCountUp(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [active, target, duration])
  return count
}
const STATS = [
  { value: 132, suffix: '+', label: 'SECTORES ATENDIDOS' },
  { value: 25,  suffix: '',  label: 'SERVICIOS INCLUIDOS' },
  { value: 48,  suffix: 'h', label: 'TIEMPO DE RESPUESTA' },
  { value: 100, suffix: '%', label: 'IA EN CADA SERVICIO' },
]
function StatItem({ stat, active }: { stat: (typeof STATS)[0]; active: boolean }) {
  const count = useCountUp(stat.value, active)
  return (
    <div style={{
      background: '#ffffff', border: '1.5px solid #e8eef8',
      borderRadius: '20px', padding: '36px 28px', textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      minHeight: '140px', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      <div style={{
        fontSize: '56px', fontWeight: 900, lineHeight: 1,
        color: '#0d1b3e', letterSpacing: '-0.03em', marginBottom: '10px',
      }}>
        {count}{stat.suffix}
      </div>
      <div style={{
        fontSize: '12px', fontWeight: 700, color: '#9aa0b0',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {stat.label}
      </div>
    </div>
  )
}
export function LandingStats() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <section style={{ background: '#ffffff', paddingTop: '72px', paddingBottom: '72px' }}>
      <div ref={ref} style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 48px',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px',
      }}>
        {STATS.map((s) => (
          <StatItem key={s.label} stat={s} active={active} />
        ))}
      </div>
    </section>
  )
}
