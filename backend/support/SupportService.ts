import { DbClient } from "../db/DbClient";
import { createLogger } from "../logger";

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

export class SupportService {
  private readonly db: DbClient;
  private readonly logger = createLogger("support");

  private constructor() {
    this.db = DbClient.getInstance();
  }

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

    const priority = (data.priority ?? "normal") as SupportPriority;
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO support_tickets (
        user_id, subject, body, category, status, priority, template_used, auto_response
      ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)
      RETURNING id`,
      [userId, data.subject, data.body, data.category, priority, templateUsed, templateAuto],
    );

    const ticketId = inserted[0]!.id;

    if (templateAuto) {
      this.logger.info("support_ticket_created", {
        ticketId,
        category: data.category,
        templateUsed: templateUsed ?? undefined,
      });
    }

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
