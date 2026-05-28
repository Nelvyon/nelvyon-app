"use client";
import React, { useState } from "react";
import { Container } from "./container";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
const questions = [
  { question: "¿NELVYON es una agencia o un software?", answer: "Es ambas cosas. NELVYON combina servicios profesionales de marketing con una plataforma SaaS operada por agentes expertos." },
  { question: "¿Prometéis resultados concretos?", answer: "No. Trabajamos con metodología, medición y optimización, pero no publicamos promesas de rendimiento que no puedan demostrarse." },
  { question: "¿Qué significa que opera 24/7?", answer: "Significa que los agentes expertos pueden ejecutar tareas, activar flujos, generar activos y coordinar procesos de forma continua según la configuración definida." },
  { question: "¿Necesito equipo técnico para usar NELVYON?", answer: "No necesariamente. La plataforma está pensada para simplificar la operación, aunque los proyectos avanzados pueden requerir configuración específica." },
  { question: "¿Puedo contratar solo servicios?", answer: "Sí. Una empresa puede trabajar con servicios profesionales, con el SaaS o con ambos." },
  { question: "¿Puedo usar NELVYON si ya tengo CRM?", answer: "Sí. Se puede evaluar integración, migración o convivencia con herramientas existentes." },
  { question: "¿Trabajáis con agencias?", answer: "Sí. NELVYON puede servir como infraestructura para agencias que necesitan operar clientes, automatizaciones y reporting con mayor orden." },
  { question: "¿Qué tipo de empresas encajan mejor?", answer: "Empresas que valoran procesos serios, visibilidad, automatización y ejecución profesional." },
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
