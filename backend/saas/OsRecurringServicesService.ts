import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type RecurringServiceType = "seo_report" | "social_calendar" | "ads_snapshot";
export type RecurringDeliverableStatus = "generated" | "delivered" | "archived";

export interface RecurringDeliverable {
  id: string;
  tenantId: string;
  month: string;
  serviceType: RecurringServiceType;
  payload: Record<string, unknown>;
  status: RecurringDeliverableStatus;
  createdAt: string;
}

export type OsRecurringServicesDeps = { db?: Pick<DbClient, "query"> };

// ── Payload generators ────────────────────────────────────────────────────────

function buildSeoReport(tenantId: string, month: string): Record<string, unknown> {
  return {
    tenantId,
    month,
    type: "seo_report",
    title: `Informe SEO mensual — ${month}`,
    sections: [
      {
        heading: "Resumen ejecutivo",
        body: "El posicionamiento orgánico ha mantenido su tendencia estable. Se recomienda ampliar el cluster de contenidos del sector principal.",
      },
      {
        heading: "Keywords principales",
        metrics: [
          { keyword: "negocio local", position: 4, delta: +1 },
          { keyword: "servicio premium", position: 7, delta: -1 },
          { keyword: "contactar empresa", position: 12, delta: +3 },
        ],
      },
      {
        heading: "Oportunidades detectadas",
        items: [
          "Añadir FAQ estructurada a la página de contacto (+CTR estimado 8%)",
          "Optimizar meta-descripción de la landing principal",
          "Crear 2 artículos de blog para keywords de cola larga",
        ],
      },
      {
        heading: "Próximos pasos",
        actions: ["Publicar artículo blog semana 1", "Revisar Core Web Vitals", "Solicitar enlaces desde directorios sectoriales"],
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function buildSocialCalendar(tenantId: string, month: string): Record<string, unknown> {
  const [year, monthNum] = month.split("-").map(Number);
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(year, (monthNum ?? 6) - 1, 1 + i * 7);
    return {
      week: i + 1,
      startDate: weekStart.toISOString().slice(0, 10),
      posts: [
        {
          day: "Lunes",
          channel: "Instagram",
          format: "Carrusel",
          topic: `Tip de valor semana ${i + 1}`,
          caption: `¿Sabías que puedes mejorar tus resultados con este truco? 💡 #negocio #consejo`,
          hashtags: ["#negocio", "#emprendedores", "#marketing"],
        },
        {
          day: "Miércoles",
          channel: "LinkedIn",
          format: "Post texto",
          topic: `Caso de éxito — semana ${i + 1}`,
          caption: "Cómo uno de nuestros clientes logró un 30% más de conversiones con una pequeña mejora en su landing.",
          hashtags: ["#growth", "#b2b", "#resultados"],
        },
        {
          day: "Viernes",
          channel: "Instagram Stories",
          format: "Historia + CTA",
          topic: "Llamada a la acción semanal",
          caption: "Desliza para ver cómo podemos ayudarte →",
          hashtags: [],
        },
      ],
    };
  });

  return {
    tenantId,
    month,
    type: "social_calendar",
    title: `Calendario social — ${month}`,
    totalPosts: weeks.length * 3,
    weeks,
    generatedAt: new Date().toISOString(),
  };
}

function buildAdsSnapshot(tenantId: string, month: string): Record<string, unknown> {
  return {
    tenantId,
    month,
    type: "ads_snapshot",
    title: `Snapshot campañas publicitarias — ${month}`,
    channels: [
      {
        name: "Meta Ads",
        status: "active",
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        roas: 0,
        recommendations: [
          "Ampliar audiencia lookalike al 3% para escalar alcance",
          "Testear creative con vídeo corto — CTR estimado +15%",
        ],
      },
      {
        name: "Google Ads",
        status: "ready_to_activate",
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        roas: 0,
        recommendations: [
          "Configurar campaña Búsqueda con keywords de la auditoría SEO",
          "Activar extensiones de llamada para aumentar CTR local",
        ],
      },
    ],
    summary: "Campaña lista para activar. Presupuesto mínimo recomendado: 500€/mes. ROI esperado: 3x en 90 días.",
    generatedAt: new Date().toISOString(),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class OsRecurringServicesService {
  constructor(private readonly deps: OsRecurringServicesDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async generateMonthlyDeliverables(
    tenantId: string,
    month: string,
  ): Promise<RecurringDeliverable[]> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw Object.assign(new Error("month must be YYYY-MM"), { code: "VALIDATION" });
    }

    const services: Array<{ type: RecurringServiceType; payload: Record<string, unknown> }> = [
      { type: "seo_report",       payload: buildSeoReport(tenantId, month) },
      { type: "social_calendar",  payload: buildSocialCalendar(tenantId, month) },
      { type: "ads_snapshot",     payload: buildAdsSnapshot(tenantId, month) },
    ];

    const results: RecurringDeliverable[] = [];

    for (const { type, payload } of services) {
      const rows = await this.db.query<Record<string, unknown>>(
        `INSERT INTO saas_recurring_deliverables (tenant_id, month, service_type, payload)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (tenant_id, month, service_type) DO NOTHING
         RETURNING id, tenant_id AS "tenantId", month, service_type AS "serviceType",
                   payload, status, created_at AS "createdAt"`,
        [tenantId, month, type, JSON.stringify(payload)],
      );
      if (rows[0]) {
        results.push(this._map(rows[0]));
      }
    }

    return results;
  }

  async listDeliverables(tenantId: string, month?: string): Promise<RecurringDeliverable[]> {
    const base = `SELECT id, tenant_id AS "tenantId", month, service_type AS "serviceType",
                         payload, status, created_at AS "createdAt"
                  FROM saas_recurring_deliverables WHERE tenant_id=$1`;
    const rows = month
      ? await this.db.query<Record<string, unknown>>(base + ` AND month=$2 ORDER BY created_at DESC`, [tenantId, month])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY month DESC, created_at DESC`, [tenantId]);
    return rows.map(r => this._map(r));
  }

  async markDelivered(tenantId: string, deliverableId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_recurring_deliverables SET status='delivered'
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING id`,
      [deliverableId, tenantId],
    );
    return rows.length > 0;
  }

  private _map(r: Record<string, unknown>): RecurringDeliverable {
    return {
      id: String(r.id),
      tenantId: String(r.tenantId),
      month: String(r.month),
      serviceType: String(r.serviceType) as RecurringServiceType,
      payload: (r.payload as Record<string, unknown>) ?? {},
      status: String(r.status) as RecurringDeliverableStatus,
      createdAt: String(r.createdAt),
    };
  }
}

let _svc: OsRecurringServicesService | undefined;
export function getOsRecurringServicesService(): OsRecurringServicesService {
  if (!_svc) _svc = new OsRecurringServicesService();
  return _svc;
}
export function resetOsRecurringServicesServiceForTests(): void { _svc = undefined; }
