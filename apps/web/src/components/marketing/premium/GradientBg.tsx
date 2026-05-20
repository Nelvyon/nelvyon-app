"use client";

export function GradientBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-[20%] top-[-10%] h-[55vh] w-[55vw] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute right-[-15%] top-[20%] h-[45vh] w-[45vw] rounded-full bg-indigo-500/15 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[30%] h-[40vh] w-[50vw] rounded-full bg-blue-600/10 blur-[110px]" />
    </div>
  );
}
