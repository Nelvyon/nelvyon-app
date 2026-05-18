export const INDUSTRY_BENCHMARKS = {
  googleAds: {
    averageCTR: {
      search: 0.0621,
      display: 0.0046,
      byIndustry: {
        ecommerce: 0.0571,
        finance: 0.0559,
        health: 0.0512,
        legal: 0.0667,
        realestate: 0.0579,
        education: 0.0523,
        travel: 0.0547,
        technology: 0.0502,
        retail: 0.0589,
        restaurants: 0.0689,
        automotive: 0.0598,
        b2b: 0.0462,
        default: 0.0621,
      },
    },
    averageCPC: {
      byIndustry: {
        ecommerce: 1.16,
        finance: 3.44,
        health: 2.62,
        legal: 6.75,
        realestate: 2.37,
        education: 2.4,
        travel: 1.53,
        technology: 3.8,
        retail: 1.35,
        restaurants: 1.95,
        automotive: 2.46,
        b2b: 3.33,
        default: 2.32,
      },
    },
    averageConversionRate: {
      byIndustry: {
        ecommerce: 0.0257,
        finance: 0.0531,
        health: 0.032,
        legal: 0.0672,
        realestate: 0.0232,
        education: 0.0323,
        travel: 0.0324,
        technology: 0.0292,
        retail: 0.03,
        restaurants: 0.058,
        automotive: 0.0612,
        b2b: 0.031,
        default: 0.0352,
      },
    },
    averageCPA: {
      byIndustry: {
        ecommerce: 45.27,
        finance: 81.93,
        health: 78.09,
        legal: 73.7,
        realestate: 116.61,
        education: 72.7,
        travel: 44.73,
        technology: 133.52,
        retail: 38.87,
        restaurants: 12.68,
        automotive: 33.52,
        b2b: 116.13,
        default: 56.11,
      },
    },
  },
  metaAds: {
    averageCTR: {
      byIndustry: {
        ecommerce: 0.009,
        finance: 0.0056,
        health: 0.0083,
        legal: 0.0094,
        realestate: 0.0099,
        education: 0.0073,
        travel: 0.009,
        technology: 0.0078,
        retail: 0.01,
        restaurants: 0.0104,
        automotive: 0.0082,
        b2b: 0.0058,
        default: 0.009,
      },
    },
    averageCPC: {
      byIndustry: {
        ecommerce: 0.45,
        finance: 3.77,
        health: 1.32,
        legal: 1.92,
        realestate: 1.81,
        education: 0.8,
        travel: 0.63,
        technology: 1.27,
        retail: 0.7,
        restaurants: 0.51,
        automotive: 2.24,
        b2b: 2.52,
        default: 0.97,
      },
    },
    averageROAS: {
      byIndustry: {
        ecommerce: 4.12,
        fashion: 3.89,
        health: 3.2,
        retail: 3.75,
        education: 2.8,
        travel: 3.1,
        technology: 2.95,
        default: 3.5,
      },
    },
    averageCPM: {
      byIndustry: {
        ecommerce: 7.19,
        finance: 11.2,
        health: 7.5,
        legal: 8.5,
        realestate: 10.26,
        education: 7.0,
        travel: 6.8,
        technology: 9.5,
        retail: 8.0,
        restaurants: 5.5,
        default: 8.0,
      },
    },
  },
  emailMarketing: {
    averageOpenRate: {
      byIndustry: {
        ecommerce: 0.1568,
        finance: 0.2756,
        health: 0.2337,
        legal: 0.2211,
        realestate: 0.1964,
        education: 0.2328,
        travel: 0.2011,
        technology: 0.22,
        retail: 0.172,
        restaurants: 0.1955,
        nonprofit: 0.2866,
        b2b: 0.219,
        default: 0.2122,
      },
    },
    averageClickRate: {
      byIndustry: {
        ecommerce: 0.025,
        finance: 0.027,
        health: 0.023,
        legal: 0.028,
        realestate: 0.018,
        education: 0.028,
        travel: 0.023,
        technology: 0.022,
        retail: 0.02,
        restaurants: 0.013,
        nonprofit: 0.028,
        b2b: 0.031,
        default: 0.023,
      },
    },
    averageUnsubscribeRate: {
      default: 0.0023,
    },
    averageBounceRate: {
      default: 0.0071,
    },
  },
  seo: {
    averageCTRByPosition: {
      1: 0.2795,
      2: 0.1551,
      3: 0.1024,
      4: 0.0713,
      5: 0.0527,
      6: 0.0374,
      7: 0.0285,
      8: 0.022,
      9: 0.0173,
      10: 0.0139,
    },
    averageTimeToRank: {
      newSite: { months: 12, description: "Sitio nuevo sin autoridad" },
      establishedSite: { months: 3, description: "Sitio con DA 30+" },
      authoritysite: { months: 1, description: "Sitio con DA 60+" },
    },
    contentLengthBenchmarks: {
      blogPost: { min: 1500, optimal: 2100, top10: 2450 },
      landingPage: { min: 500, optimal: 900, top10: 1200 },
      productPage: { min: 300, optimal: 500, top10: 700 },
    },
  },
  socialMedia: {
    averageEngagementRate: {
      instagram: {
        byFollowers: {
          nano: 0.048,
          micro: 0.032,
          mid: 0.022,
          macro: 0.018,
          mega: 0.014,
        },
      },
      tiktok: { average: 0.053 },
      linkedin: { average: 0.0054 },
      twitter: { average: 0.0029 },
      facebook: { average: 0.0064 },
    },
    bestPostingTimes: {
      instagram: { days: ["Tuesday", "Wednesday", "Friday"], hours: [9, 11, 14] },
      tiktok: { days: ["Tuesday", "Thursday", "Friday"], hours: [7, 10, 19] },
      linkedin: { days: ["Tuesday", "Wednesday", "Thursday"], hours: [8, 10, 12] },
      twitter: { days: ["Wednesday", "Friday"], hours: [9, 12, 15] },
      facebook: { days: ["Tuesday", "Wednesday", "Friday"], hours: [9, 13, 15] },
    },
  },
  conversionRates: {
    landingPage: {
      poor: 0.01,
      average: 0.026,
      good: 0.055,
      excellent: 0.112,
    },
    ecommerce: {
      poor: 0.005,
      average: 0.014,
      good: 0.032,
      excellent: 0.065,
    },
    leadGenForm: {
      poor: 0.01,
      average: 0.042,
      good: 0.095,
      excellent: 0.2,
    },
  },
} as const;

type BenchmarkRoot = typeof INDUSTRY_BENCHMARKS;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readByIndustry(table: unknown, industry: string): number | null {
  if (!isRecord(table)) return null;
  const byIndustry = table.byIndustry;
  if (!isRecord(byIndustry)) return null;
  const key = industry in byIndustry ? industry : "default";
  const val = byIndustry[key];
  return typeof val === "number" && Number.isFinite(val) ? val : null;
}

function readMetricLeaf(node: unknown, industry: string): number | null {
  if (typeof node === "number" && Number.isFinite(node)) return node;
  if (!isRecord(node)) return null;

  const fromIndustry = readByIndustry(node, industry);
  if (fromIndustry !== null) return fromIndustry;

  if (industry in node && typeof node[industry] === "number") {
    return node[industry] as number;
  }

  if ("default" in node && typeof node.default === "number") {
    return node.default;
  }

  return null;
}

export function getBenchmark(channel: string, metric: string, industry: string): number | null {
  try {
    const root = INDUSTRY_BENCHMARKS as Record<string, unknown>;
    const channelNode = root[channel];
    if (!isRecord(channelNode)) return null;

    const metricNode = channelNode[metric];
    return readMetricLeaf(metricNode, industry);
  } catch {
    return null;
  }
}

function formatPercentValue(value: number, asRate: boolean): string {
  if (asRate) return `${(value * 100).toFixed(1)}%`;
  return value >= 10 ? `${value.toFixed(2)}€` : `${value.toFixed(2)}`;
}

export function formatBenchmarkComparison(
  clientValue: number,
  benchmarkValue: number,
  metricName: string,
  options?: { asRate?: boolean; unit?: string },
): string {
  if (!Number.isFinite(clientValue) || !Number.isFinite(benchmarkValue) || benchmarkValue === 0) {
    return `No hay benchmark de referencia para ${metricName}.`;
  }

  const asRate = options?.asRate ?? (benchmarkValue > 0 && benchmarkValue <= 1 && clientValue <= 1);
  const diff = ((clientValue - benchmarkValue) / benchmarkValue) * 100;
  const label = diff > 20 ? "EXCELENTE" : diff > 0 ? "BUENO" : diff > -20 ? "MEJORABLE" : "CRÍTICO";

  const clientStr = formatPercentValue(clientValue, asRate);
  const benchStr = formatPercentValue(benchmarkValue, asRate);
  const unit = options?.unit ?? "";

  if (diff >= 0) {
    return `Tu ${metricName}${unit} (${clientStr}) supera en +${Math.abs(diff).toFixed(0)}% al promedio de la industria (${benchStr}) — rendimiento ${label}`;
  }
  return `Tu ${metricName}${unit} (${clientStr}) está un ${Math.abs(diff).toFixed(0)}% por debajo del promedio (${benchStr}) — rendimiento ${label}`;
}

const INDUSTRY_ALIASES: Record<string, string> = {
  ecommerce: "ecommerce",
  "e-commerce": "ecommerce",
  retail: "retail",
  finance: "finance",
  fintech: "finance",
  health: "health",
  legal: "legal",
  realestate: "realestate",
  inmobiliaria: "realestate",
  education: "education",
  educacion: "education",
  travel: "travel",
  tourism: "travel",
  turismo: "travel",
  technology: "technology",
  tech: "technology",
  tecnologia: "technology",
  restaurants: "restaurants",
  restaurantes: "restaurants",
  hospitality: "restaurants",
  automotive: "automotive",
  b2b: "b2b",
  saas: "b2b",
  nonprofit: "nonprofit",
  fashion: "fashion",
  moda: "fashion",
};

export function resolveIndustryKey(input?: Record<string, unknown>): string {
  const raw =
    (typeof input?.industry === "string" && input.industry) ||
    (typeof input?.sector === "string" && input.sector) ||
    "";
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");

  if (!normalized) return "default";
  if (INDUSTRY_ALIASES[normalized]) return INDUSTRY_ALIASES[normalized];

  const known = INDUSTRY_BENCHMARKS.googleAds.averageCTR.byIndustry;
  if (normalized in known) return normalized;

  return "default";
}
