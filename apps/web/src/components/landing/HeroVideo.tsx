"use client";

import { Play } from "lucide-react";
import { motion } from "framer-motion";

import { BRAND } from "./shared";

export function HeroVideo() {
  return (
    <div className="relative aspect-video w-full">
      <button
        aria-label="Reproducir vídeo explicativo"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10"
        style={{ backdropFilter: "blur(4px)" }}
        type="button"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-full text-white"
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
