"use client";
import React, { useState } from "react";
import { Container } from "./container";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
const questions = [
  { question: "¿NELVYON es una agencia o una plataforma?", answer: "Es ambas cosas integradas: servicios profesionales de marketing y un SaaS operativo con agentes expertos." },
  { question: "¿Qué son los agentes expertos?", answer: "Sistemas configurados para ejecutar tareas, coordinar procesos y mantener flujos activos de forma continua según las reglas definidas." },
  { question: "¿Usáis promesas de resultados?", answer: "No. Trabajamos con metodología, medición y optimización responsable, sin publicar promesas que no puedan demostrarse." },
  { question: "¿Puedo contratar solo servicios?", answer: "Sí. Puedes trabajar con servicios profesionales, con la plataforma o con ambos según la estructura que necesite tu empresa." },
  { question: "¿Puedo contratar solo la plataforma?", answer: "Sí. El SaaS puede centralizar operaciones sin contratar todos los servicios, según el nivel de autonomía que busques." },
  { question: "¿Trabajáis con agencias?", answer: "Sí. NELVYON puede servir como infraestructura multi-cliente para agencias que necesitan más orden en procesos y reporting." },
  { question: "¿Qué se puede automatizar?", answer: "Seguimiento comercial, emails, WhatsApp, tareas repetitivas, reporting y coordinación entre módulos, siempre con configuración y criterio previos." },
  { question: "¿Cómo empieza un proyecto?", answer: "Con un diagnóstico operativo: entendemos canales, herramientas, procesos y necesidades antes de configurar campañas o automatizaciones." },
];
export function Faqs() {
  return <FAQs />;
}

export const FAQs = () => {
  return (
    <section id="faqs" className="py-12 lg:py-16 bg-[#f8faff]">
      <Container>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0084fc", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>FAQ</p>
          <h2 className="fade-in" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, color: "#07122a", letterSpacing: "-0.03em" }}>
            Preguntas frecuentes
          </h2>
        </div>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {questions.map((q, index) => (
            <Question key={index} question={q.question} answer={q.answer} />
          ))}
        </div>
      </Container>
    </section>
  );
};
const Question = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} style={{
      width: "100%", background: "#ffffff", border: "1px solid #e8eef8",
      borderRadius: "16px", padding: "24px", textAlign: "left",
      cursor: "pointer", transition: "box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#07122a", margin: 0 }}>{question}</h3>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#07122a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: "16px" }}>
          {open ? <IconMinus style={{ width: "14px", height: "14px", color: "#ffffff" }} /> : <IconPlus style={{ width: "14px", height: "14px", color: "#ffffff" }} />}
        </div>
      </div>
      <motion.div animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} initial={false} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
        <p style={{ marginTop: "16px", fontSize: "14px", color: "#6b7a99", lineHeight: 1.6, marginBottom: 0 }}>{answer}</p>
      </motion.div>
    </button>
  );
};
