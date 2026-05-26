"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BRAND } from "./shared";

const LINE_DATA = [
  { m: "Ene", leads: 42 },
  { m: "Feb", leads: 58 },
  { m: "Mar", leads: 71 },
  { m: "Abr", leads: 89 },
  { m: "May", leads: 112 },
  { m: "Jun", leads: 134 },
];

const BAR_DATA = [
  { k: "SEO", v: 85 },
  { k: "Ads", v: 92 },
  { k: "Email", v: 78 },
  { k: "Social", v: 88 },
];

const cardClass = "rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6";

export function GrowthCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div
        className={cardClass}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: BRAND.cyan }}>
          Tecnología IA · Evolución de actividad
        </p>
        <p className="mb-4 text-sm text-[#374151]">Indicadores agregados por mes (ilustrativo)</p>
        <div className="h-52">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={LINE_DATA}>
              <defs>
                <linearGradient id="leadGradWhite" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.blue} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BRAND.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" stroke="#9CA3AF" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: `1px solid ${BRAND.borderLight}`,
                  borderRadius: 8,
                  color: "#111827",
                }}
              />
              <Area
                dataKey="leads"
                fill="url(#leadGradWhite)"
                stroke={BRAND.blue}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      <motion.div
        className={cardClass}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: BRAND.cyan }}>
          Rendimiento por canal
        </p>
        <p className="mb-4 text-sm text-[#374151]">Comparativa relativa entre canales</p>
        <div className="h-52">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={BAR_DATA}>
              <XAxis dataKey="k" stroke="#9CA3AF" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: `1px solid ${BRAND.borderLight}`,
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="v" fill={BRAND.blue} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
