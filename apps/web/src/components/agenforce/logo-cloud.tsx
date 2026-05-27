"use client";
import React from "react";
import { motion } from "motion/react";
import { Container } from "./container";
const logos = [
  "Meta Ads", "Google Ads", "WhatsApp Business", "Stripe", "Twilio",
  "Zapier", "Mailchimp", "TikTok Ads", "Shopify", "HubSpot",
  "Meta Ads", "Google Ads", "WhatsApp Business", "Stripe", "Twilio",
  "Zapier", "Mailchimp", "TikTok Ads", "Shopify", "HubSpot",
];
export const LogoCloud = () => {
  return (
    <section className="py-16 bg-[#f8faff] overflow-hidden">
      <Container>
        <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#6b7a99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "32px" }}>
          Conectado con las herramientas que ya usas
        </p>
      </Container>
      <div style={{ display: "flex", overflow: "hidden", position: "relative" }}>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", gap: "48px", alignItems: "center", whiteSpace: "nowrap" }}
        >
          {logos.map((logo, i) => (
            <div key={i} style={{
              padding: "10px 24px", background: "#ffffff", border: "1px solid #e8eef8",
              borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#07122a",
              boxShadow: "0 2px 8px rgba(7,18,42,0.06)", flexShrink: 0
            }}>
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
