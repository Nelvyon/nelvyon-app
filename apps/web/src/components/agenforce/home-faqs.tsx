"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconPlus } from "@tabler/icons-react";

type FAQItem = { question: string; answer: string };
type FAQSection = { title: string; items: FAQItem[] };

const FAQ_DATA: FAQSection[] = [
  {
    title: "Servicios",
    items: [
      {
        question: "¿En qué se diferencian los servicios del software?",
        answer:
          "El SaaS es la plataforma para operar. Los servicios cubren ejecución profesional: SEO, Ads, Branding, Desarrollo Web, Ecommerce y Automatización, con entregables acordados por proyecto.",
      },
      {
        question: "¿Garantizáis resultados en campañas o SEO?",
        answer:
          "No. Documentamos procesos y entregables. No publicamos métricas inventadas ni prometemos resultados garantizados.",
      },
      {
        question: "¿Puedo contratar solo servicios?",
        answer:
          "Sí. Los servicios son independientes del SaaS. Muchos clientes empiezan con ejecución profesional y adoptan la plataforma cuando la operación crece.",
      },
    ],
  },
  {
    title: "Plataforma SaaS",
    items: [
      {
        question: "¿Qué incluye NELVYON SaaS?",
        answer:
          "CRM, campañas, automatizaciones, inbox, facturación, calendario, funnels y reporting en un entorno operativo centralizado.",
      },
      {
        question: "¿Puedo usar solo el software sin contratar servicios?",
        answer: "Sí. NELVYON SaaS funciona de forma autónoma. Los servicios son opcionales.",
      },
    ],
  },
  {
    title: "Precios",
    items: [
      {
        question: "¿Cuánto cuesta la plataforma?",
        answer:
          "Los planes SaaS parten desde 47 €/mes. Puedes consultar el detalle de planes en la página de SaaS antes de contratar.",
      },
      {
        question: "¿Hay permanencia?",
        answer:
          "La propuesta comercial no incluye permanencia forzada. Consulta condiciones concretas al solicitar información.",
      },
    ],
  },
  {
    title: "Integraciones",
    items: [
      {
        question: "¿Qué integraciones están disponibles hoy?",
        answer:
          "Meta, Google, TikTok, Instagram, LinkedIn, WhatsApp, email, Stripe, Shopify, calendario y reporting, entre otras. WooCommerce figura como próximamente.",
      },
    ],
  },
  {
    title: "Datos y seguridad",
    items: [
      {
        question: "¿Cómo gestionáis pagos y datos?",
        answer:
          "Suscripciones y facturación con Stripe. Workspaces multi-tenant con roles, OAuth para conexiones de canal, exportación y borrado de datos de usuario conforme a GDPR.",
      },
    ],
  },
];

export function HomeFaqs() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-home-faqs" aria-labelledby="home-faqs-title">
      <div className="nelvyon-section-inner nelvyon-home-faqs__inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Preguntas frecuentes</p>
          <h2 id="home-faqs-title" className="mkt-h2 mkt-h2--display fade-in">
            Respuestas directas, sin humo
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead fade-in">
            Lo esencial sobre la plataforma, los servicios y cómo trabajamos.
          </p>
        </header>

        <div ref={containerRef} className="nelvyon-home-faqs__list">
          {FAQ_DATA.map((section) => (
            <div key={section.title} className="nelvyon-home-faqs__group">
              <h3 className="nelvyon-home-faqs__group-title">{section.title}</h3>
              <div className="nelvyon-home-faqs__items">
                {section.items.map((item, index) => {
                  const id = `${section.title}-${index}`;
                  const isActive = activeId === id;
                  return (
                    <div key={id} className={`nelvyon-home-faqs__item${isActive ? " nelvyon-home-faqs__item--active" : ""}`}>
                      <button type="button" className="nelvyon-home-faqs__trigger" onClick={() => setActiveId(isActive ? null : id)}>
                        <span>{item.question}</span>
                        <motion.span animate={{ rotate: isActive ? 45 : 0 }} transition={{ duration: 0.2 }}>
                          <IconPlus size={18} stroke={1.75} aria-hidden />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isActive ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className="nelvyon-home-faqs__panel"
                          >
                            <p>{item.answer}</p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
