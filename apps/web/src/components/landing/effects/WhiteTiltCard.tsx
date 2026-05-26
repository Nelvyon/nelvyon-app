"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

export function WhiteTiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
  };

  return (
    <div
      className={`transition-transform duration-200 ease-out ${className}`}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      ref={ref}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
