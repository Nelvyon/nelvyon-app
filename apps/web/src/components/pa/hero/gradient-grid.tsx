"use client";

import { useEffect, useState } from "react";

export function GradientGrid({ className }: { className?: string }) {
  const cellSize = 70;

  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cols = Math.ceil(size.width / cellSize);
  const rows = Math.ceil(size.height / cellSize);

  return (
    <svg width="100%" height="100%" className={className}>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const x = col * cellSize;
        const y = row * cellSize;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            fill="transparent"
            stroke="rgba(255,255,255,0.035)"
          />
        );
      })}
    </svg>
  );
}
