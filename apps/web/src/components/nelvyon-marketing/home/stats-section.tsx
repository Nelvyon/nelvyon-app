import { StatCard } from "../stat-card";

export function HomeStatsSection() {
  return (
    <section className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard end={132} suffix="+" label="Agencias" />
        <StatCard end={25} label="Herramientas" />
        <StatCard end={48} suffix="h" label="Ahorro/mes" />
        <StatCard end={100} suffix="%" label="Automatización" />
      </div>
    </section>
  );
}
