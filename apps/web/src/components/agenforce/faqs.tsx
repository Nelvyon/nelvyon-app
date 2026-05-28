"use client";
import React, { useState } from "react";
import { Container } from "./container";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
const questions = [
  { question: "¿Qué es NELVYON?", answer: "NELVYON es la plataforma todo-en-uno para agencias de marketing digital. CRM, email, automatizaciones, pagos, funnels y analíticas en un solo lugar — ejecutado por agentes expertos." },
  { question: "¿Necesito conocimientos técnicos?", answer: "No. NELVYON está diseñado para que cualquier agencia pueda usarlo desde el primer día. La configuración inicial tarda menos de 30 minutos." },
  { question: "¿Hay contrato de permanencia?", answer: "No. Puedes cancelar en cualquier momento sin penalizaciones. Creemos en que te quedas porque NELVYON te genera resultados, no porque estés atrapado." },
  { question: "¿Puedo probar NELVYON gratis?", answer: "Sí. Tienes 14 días de prueba gratuita con acceso completo a todas las funciones de tu plan. Sin tarjeta de crédito requerida." },
  { question: "¿Qué integraciones tiene NELVYON?", answer: "NELVYON se conecta con Meta Ads, Google Ads, TikTok Ads, WhatsApp Business, Stripe, Twilio, Zapier, Mailchimp, Shopify, HubSpot y más de 25 herramientas." },
  { question: "¿Qué soporte ofrece NELVYON?", answer: "Starter incluye soporte por email. Growth y Elite tienen soporte prioritario 24h. Elite además incluye un manager de cuenta dedicado." },
  { question: "¿Puedo tener el plan White-label?", answer: "Sí, el plan Elite incluye white-label completo para que ofrezcas NELVYON bajo tu propia marca a tus clientes." },
  { question: "¿Qué son los agentes expertos?", answer: "Los agentes expertos son sistemas automatizados especializados en cada proceso de marketing — captación, nutrición, cierre, facturación — que trabajan solos sin intervención humana." },
];
export function Faqs() {
  return <FAQs />;
}

export const FAQs = () => {
  return (
    <section id="faqs" className="py-12 lg:py-16 bg-[#f8faff]">
      <Container>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a7fc4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>FAQ</p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, color: "#07122a", letterSpacing: "-0.03em" }}>
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
