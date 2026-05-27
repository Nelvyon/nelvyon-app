"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
export function StickyCtaBar() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:"#0066ff", transform:visible?"translateY(0)":"translateY(-100%)", transition:"transform 0.3s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:"20px", padding:"12px 24px", flexWrap:"wrap" }} aria-hidden={!visible}>
      <span style={{ fontSize:"16px", fontWeight:600, color:"#ffffff", fontFamily:"Inter,sans-serif", whiteSpace:"nowrap" }}>¿Listo para dominar tu mercado?</span>
      <Link href="/contacto" style={{ display:"inline-block", background:"#FFB800", color:"#1a1a1a", fontWeight:700, fontSize:"14px", padding:"10px 24px", borderRadius:"50px", textDecoration:"none", fontFamily:"Inter,sans-serif", whiteSpace:"nowrap" }}>Solicitar propuesta gratis</Link>
    </div>
  )
}
