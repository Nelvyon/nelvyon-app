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
  { m: "Ene", leads: 42, conv: 3.2 },
  { m: "Feb", leads: 58, conv: 4.1 },
  { m: "Mar", leads: 71, conv: 5.0 },
  { m: "Abr", leads: 89, conv: 6.2 },
  { m: "May", leads: 112, conv: 7.8 },
  { m: "Jun", leads: 134, conv: 8.4 },
];

const BAR_DATA = [
  { k: "SEO", v: 85 },
  { k: "Ads", v: 92 },
  { k: "Email", v: 78 },
  { k: "Social", v: 88 },
];

export function GrowthCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div
        className="rounded-2xl border p-4 md:p-6"
        initial={{ opacity: 0, y: 20 }}
        style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: BRAND.cyan }}>
          Tecnología IA · Predicción de crecimiento
        </p>
        <p className="mb-4 text-sm" style={{ color: BRAND.textMuted }}>
          Leads y conversión — tendencia ascendente
        </p>
        <div className="h-52">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={LINE_DATA}>
              <defs>
                <linearGradient id="leadGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.blue} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={BRAND.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: BRAND.card,
                  border: `1px solid ${BRAND.cardBorder}`,
                  borderRadius: 8,
                }}
              />
              <Area
                dataKey="leads"
                fill="url(#leadGrad)"
                stroke={BRAND.blue}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      <motion.div
        className="rounded-2xl border p-4 md:p-6"
        initial={{ opacity: 0, y: 20 }}
        style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
        transition={{ duration: 0.5, delay: 0.1 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: BRAND.cyan }}>
          Rendimiento por canal
        </p>
        <p className="mb-4 text-sm" style={{ color: BRAND.textMuted }}>
          Optimización automática con IA
        </p>
        <div className="h-52">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={BAR_DATA}>
              <XAxis dataKey="k" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: BRAND.card,
                  border: `1px solid ${BRAND.cardBorder}`,
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
