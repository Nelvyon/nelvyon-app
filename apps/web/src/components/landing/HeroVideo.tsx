"use client";

import { Play } from "lucide-react";
import { motion } from "framer-motion";

import { BRAND } from "./shared";

export function HeroVideo() {
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        borderColor: "rgba(0, 102, 255, 0.35)",
        background: "linear-gradient(145deg, rgba(10,15,30,0.95) 0%, rgba(0,21,51,0.9) 100%)",
        boxShadow: "0 24px 80px rgba(0, 102, 255, 0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, rgba(0,102,255,0.4), transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,207,255,0.25), transparent 45%)",
        }}
      />
      <video
        aria-label="Vídeo explicativo NELVYON — próximamente"
        className="h-full w-full object-cover opacity-40"
        muted
        playsInline
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect fill='%23000510' width='640' height='360'/%3E%3C/svg%3E"
      />
      <button
        aria-label="Reproducir vídeo explicativo"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        type="button"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
          style={{ backgroundColor: BRAND.blue }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="ml-1 h-7 w-7 fill-current" />
        </motion.span>
        <span className="text-sm font-medium" style={{ color: BRAND.textMuted }}>
          Ver cómo trabajamos (vídeo próximamente)
        </span>
      </button>
    </div>
  );
}
