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
    <section id="faqs" className="nelvyon-mkt-section--compact bg-[#f8faff]">
      <Container>
        <div style={{ maxWidth: 480, marginBottom: 40 }}>
          <p className="mkt-eyebrow">FAQ</p>
          <h2 className="mkt-h2 fade-in">Preguntas frecuentes</h2>
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", borderTop: "1px solid #e8eef8" }}>
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
    <button
      onClick={() => setOpen(!open)}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid #e8eef8",
        padding: "18px 0",
        textAlign: "left",
        cursor: "pointer",
        transition: "opacity 0.2s ease",
      }}
      className="nelvyon-faq-item"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "#07122a", margin: 0 }}>{question}</h3>
        <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "rgba(7,18,42,0.35)" }}>
          {open ? <IconMinus style={{ width: 14, height: 14 }} /> : <IconPlus style={{ width: 14, height: 14 }} />}
        </div>
      </div>
      <motion.div animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} initial={false} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
        <p className="mkt-body" style={{ marginTop: 12, marginBottom: 0, maxWidth: 560 }}>{answer}</p>
      </motion.div>
    </button>
  );
};
