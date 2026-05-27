"use client"
import { useState, useEffect, useRef } from "react"
const stats = [
  {value:193,suffix:"+",label:"Sectores atendidos"},
  {value:25,suffix:"",label:"Servicios incluidos"},
  {value:48,suffix:"h",label:"Tiempo de respuesta",fixed:true},
  {value:100,suffix:"%",label:"IA en cada servicio"},
]
function StatCard({stat,triggered}:{stat:typeof stats[0],triggered:boolean}) {
  const [current,setCurrent] = useState(0)
  const done = useRef(false)
  useEffect(()=>{
    if(!triggered||stat.fixed||done.current) return
    const steps = Math.ceil(1200/20)
    const inc = Math.ceil(stat.value/steps)
    let count = 0
    const id = setInterval(()=>{
      count += inc
      if(count>=stat.value){count=stat.value;clearInterval(id);done.current=true}
      setCurrent(count)
    },20)
    return ()=>clearInterval(id)
  },[triggered,stat.value,stat.fixed])
  return (
    <div style={{ background:"#ffffff", borderRadius:"16px", padding:"32px 24px", textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.08)", border:"1px solid #e2e8f0" }}>
      <div style={{ fontSize:"48px", fontWeight:900, color:"#0a1628", lineHeight:1, fontFamily:"Inter,sans-serif" }}>
        {stat.fixed?stat.value:current}<span>{stat.suffix}</span>
      </div>
      <div style={{ fontSize:"13px", fontWeight:600, color:"#64748b", letterSpacing:"2px", textTransform:"uppercase", marginTop:"8px", fontFamily:"Inter,sans-serif" }}>{stat.label}</div>
    </div>
  )
}
export function LandingStats() {
  const [triggered,setTriggered] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(()=>{
    const observer = new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting&&!triggered) setTriggered(true)
    },{threshold:0.2})
    const el = ref.current
    if(el) observer.observe(el)
    return ()=>{ if(el) observer.unobserve(el) }
  },[triggered])
  return (
    <section ref={ref} style={{ background:"#f0f7ff", padding:"60px 24px", boxSizing:"border-box" }}>
      <style>{`@media(max-width:640px){.stats-grid{grid-template-columns:1fr 1fr !important;}}`}</style>
      <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
        <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"24px" }}>
          {stats.map(s=><StatCard key={s.label} stat={s} triggered={triggered}/>)}
        </div>
      </div>
    </section>
  )
}
