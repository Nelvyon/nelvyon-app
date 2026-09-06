import { DbClient } from "../db/DbClient";
import type { ConexionSql } from "../db/ConexionSql";
import { createLogger } from "../logger";
import { triarTicket, type UrgenciaDeTicket } from "./triajeDeTicket";

export type SupportCategory = "billing" | "technical" | "feature_request" | "other";
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  body: string;
  category: SupportCategory;
  status: SupportTicketStatus;
  priority: SupportPriority;
  templateUsed: string | null;
  autoResponse: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTemplate {
  id: string;
  category: SupportCategory;
  title: string;
  description: string;
  autoResponse: string;
}

interface TicketRow {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  category: SupportCategory;
  status: SupportTicketStatus;
  priority: SupportPriority;
  template_used: string | null;
  auto_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateRow {
  id: string;
  category: SupportCategory;
  title: string;
  description: string;
  auto_response: string;
}

function mapTicket(r: TicketRow): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    subject: r.subject,
    body: r.body,
    category: r.category,
    status: r.status,
    priority: r.priority,
    templateUsed: r.template_used,
    autoResponse: r.auto_response,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTemplate(r: TemplateRow): SupportTemplate {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description,
    autoResponse: r.auto_response,
  };
}

let inst: SupportService | undefined;

/**
 * De la urgencia que decide el triaje a la prioridad que guarda la tabla.
 *
 * Son dos vocabularios distintos y a proposito: el triaje habla de cuanto puede
 * esperar un problema; la tabla, de en que cola entra. Traducir en un sitio
 * evita que cada llamada invente su propia equivalencia.
 */
const PRIORIDAD_SEGUN_URGENCIA: Readonly<Record<UrgenciaDeTicket, SupportPriority>> = {
  critica: "urgent",
  alta: "high",
  normal: "normal",
  baja: "low",
};

/** De menos a mas, para poder comparar sin ordenar cadenas. */
const ESCALA: readonly SupportPriority[] = ["low", "normal", "high", "urgent"];

/**
 * La prioridad definitiva de un ticket.
 *
 * ── POR QUE NO BASTA CON LO QUE DIGA QUIEN ABRE EL TICKET ───────────────────
 *
 * `createTicket` cogia `priority` del cuerpo de la peticion y, si no venia,
 * ponia «normal». Es decir: quien abre el ticket decidia su propio sitio en la
 * cola. Eso falla en las dos direcciones.
 *
 *   · Hacia arriba: cualquiera puede marcar «urgent» y colarse.
 *   · Hacia abajo, que es la peligrosa: «me han entrado en la cuenta» enviado
 *     sin prioridad se quedaba en «normal», esperando turno detras de dudas de
 *     facturacion. Un aviso de seguridad no puede depender de que quien lo
 *     manda sepa que es grave.
 *
 * ── LA REGLA ────────────────────────────────────────────────────────────────
 *
 * Se toma la MAYOR de las dos: la que pide quien escribe y la que deduce el
 * triaje del texto. Nunca se BAJA lo que ha pedido una persona —eso seria que
 * el sistema decidiera que su problema importa menos de lo que dice— y nunca se
 * deja pasar por debajo lo que el triaje ha visto.
 */
function prioridadDefinitiva(
  pedida: SupportPriority | undefined,
  urgencia: UrgenciaDeTicket,
): SupportPriority {
  const delTriaje = PRIORIDAD_SEGUN_URGENCIA[urgencia];
  if (!pedida) return delTriaje;
  return ESCALA.indexOf(pedida) >= ESCALA.indexOf(delTriaje) ? pedida : delTriaje;
}

export class SupportService {
  private readonly logger = createLogger("support");

  /**
   * La conexion se puede pasar, y por eso esto se puede probar.
   *
   * El constructor era privado y cogia el singleton real, asi que cualquier
   * prueba de `createTicket` necesitaba un PostgreSQL de verdad — es decir, no
   * habia ninguna. `instance()` sigue devolviendo el mismo singleton de siempre:
   * quien lo usa hoy no nota nada.
   */
  constructor(private readonly db: ConexionSql = DbClient.getInstance()) {}

  static instance(): SupportService {
    if (!inst) inst = new SupportService();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  async createTicket(
    userId: string,
    data: {
      subject: string;
      body: string;
      category: string;
      priority?: string;
      templateId?: string;
    },
  ): Promise<{ ticketId: string; autoResponse: string | null }> {
    let templateAuto: string | null = null;
    let templateUsed: string | null = null;

    if (data.templateId && data.templateId.trim().length > 0) {
      const rows = await this.db.query<Pick<TemplateRow, "auto_response">>(
        `SELECT auto_response FROM support_templates WHERE id = $1 LIMIT 1`,
        [data.templateId.trim()],
      );
      if (rows.length > 0 && rows[0].auto_response) {
        templateAuto = rows[0].auto_response;
        templateUsed = data.templateId.trim();
      }
    }

    // EL TRIAJE ENTRA AQUI, QUE ES DONDE NACE EL TICKET.
    //
    // Se lee asunto y cuerpo juntos: un asunto escueto —«ayuda»— con el
    // problema entero en el cuerpo es el caso normal, no la excepcion.
    const triado = triarTicket(`${data.subject} ${data.body}`);
    const priority = prioridadDefinitiva(data.priority as SupportPriority | undefined, triado.urgencia);
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO support_tickets (
        user_id, subject, body, category, status, priority, template_used, auto_response
      ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)
      RETURNING id`,
      [userId, data.subject, data.body, data.category, priority, templateUsed, templateAuto],
    );

    const ticketId = inserted[0]!.id;

    // El rastro se deja SIEMPRE, no solo cuando hubo plantilla.
    //
    // Antes solo quedaba constancia de los tickets que dispararon una respuesta
    // automatica, que son los menos interesantes. De los demas —los que van a
    // mirar personas— no quedaba ni por que estan donde estan.
    this.logger.info("support_ticket_created", {
      ticketId,
      category: data.category,
      templateUsed: templateUsed ?? undefined,
      equipo: triado.equipo,
      urgencia: triado.urgencia,
      prioridad: priority,
      requiereHumano: triado.requiereHumano,
      porQue: triado.porQue,
    });

    return { ticketId, autoResponse: templateAuto };
  }

  async getTickets(userId: string): Promise<SupportTicket[]> {
    const rows = await this.db.query<TicketRow>(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return rows.map(mapTicket);
  }

  async getTicket(userId: string, ticketId: string): Promise<SupportTicket | null> {
    const rows = await this.db.query<TicketRow>(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [ticketId, userId],
    );
    return rows.length > 0 ? mapTicket(rows[0]!) : null;
  }

  async closeTicket(userId: string, ticketId: string): Promise<void> {
    await this.db.query(
      `UPDATE support_tickets
       SET status = 'closed', updated_at = now(), resolved_at = COALESCE(resolved_at, now())
       WHERE id = $1 AND user_id = $2`,
      [ticketId, userId],
    );
  }

  async getTemplates(category?: string): Promise<SupportTemplate[]> {
    if (category && category.trim().length > 0) {
      const rows = await this.db.query<TemplateRow>(
        `SELECT * FROM support_templates WHERE category = $1 ORDER BY title`,
        [category.trim()],
      );
      return rows.map(mapTemplate);
    }
    const rows = await this.db.query<TemplateRow>(
      `SELECT * FROM support_templates ORDER BY category, title`,
    );
    return rows.map(mapTemplate);
  }
}
