"use client";

import { useState } from "react";

/** Accordion FAQ compatible con piel AIOR. */
export function AiorFaq({ items }: { items: readonly { question: string; answer: string }[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="accordion" id="nv-aior-faq" style={{ maxWidth: 800, margin: "0 auto" }}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.question}
            style={{
              border: "1px solid #E0E0E0",
              borderRadius: 12,
              marginBottom: 12,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <button
              type="button"
              className="w-100 text-start"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                padding: "18px 20px",
                background: "transparent",
                border: 0,
                fontWeight: 600,
                fontSize: 16,
                color: "#06050B",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                cursor: "pointer",
              }}
            >
              <span>{item.question}</span>
              <span aria-hidden style={{ color: "#0084FF" }}>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div style={{ padding: "0 20px 18px", color: "#484848", lineHeight: 1.6 }}>{item.answer}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
