"use client";

import { useEffect, useRef, useState } from "react";

type StatCardProps = {
  end: number;
  suffix?: string;
  label: string;
};

export function StatCard({ end, suffix = "", label }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(end * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [started, end]);

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-[#e8eef8] bg-white p-6 text-center shadow-sm transition hover:shadow-md"
    >
      <p className="text-4xl font-extrabold text-[#1a7fc4] lg:text-5xl">
        {value}
        {suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-[#07122a]/70">{label}</p>
    </div>
  );
}
