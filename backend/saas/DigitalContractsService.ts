import { randomUUID } from "node:crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

export type ContractStatus = "draft" | "sent" | "signed" | "voided";

export type ContractInput = {
  clientName: string;
  clientEmail: string;
  serviceType: string;
  price: number;
  currency: string;
  duration: string;
  terms?: string[];
  startDate: string;
};

export type GeneratedContract = {
  contractText: string;
  summary: string;
  keyTerms: string[];
};

export type DigitalContract = {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  price: number;
  currency: string;
  input: ContractInput;
  contractText: string;
  summary: string;
  keyTerms: string[];
  status: ContractStatus;
  signToken: string | null;
  sentAt: string | null;
  signedAt: string | null;
  voidedAt: string | null;
  signatureData: string | null;
  createdAt: string;
};

type DigitalContractsServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function parseJsonPayload(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

function num(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function toIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.toISOString();
}

function fallback(input: ContractInput): GeneratedContract {
  const terms = input.terms?.length ? input.terms : ["Pago en plazo pactado", "Confidencialidad", "Soporte estándar"];
  return {
    contractText: `CONTRATO DE SERVICIOS\n\nCliente: ${input.clientName}\nEmail: ${input.clientEmail}\nServicio: ${input.serviceType}\nDuración: ${input.duration}\nInicio: ${input.startDate}\nPrecio: ${input.price} ${input.currency}\n\nTérminos:\n- ${terms.join("\n- ")}\n\nFirmas digitales válidas.`,
    summary: `Contrato para ${input.clientName} por ${input.serviceType} (${input.price} ${input.currency})`,
    keyTerms: terms,
  };
}

function rowToContract(r: {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  service_type: string;
  price: string | number;
  currency: string;
  input: ContractInput;
  contract_text: string;
  summary: string;
  key_terms: string[] | null;
  status: ContractStatus;
  sign_token: string | null;
  sent_at: Date | string | null;
  signed_at: Date | string | null;
  signature_data: string | null;
  voided_at: Date | string | null;
  created_at: Date | string;
}): DigitalContract {
  return {
    id: r.id,
    userId: r.user_id,
    clientName: r.client_name,
    clientEmail: r.client_email,
    serviceType: r.service_type,
    price: num(r.price),
    currency: r.currency,
    input: r.input,
    contractText: r.contract_text,
    summary: r.summary,
    keyTerms: Array.isArray(r.key_terms) ? r.key_terms : [],
    status: r.status,
    signToken: r.sign_token,
    sentAt: toIso(r.sent_at),
    signedAt: toIso(r.signed_at),
    voidedAt: toIso(r.voided_at),
    signatureData: r.signature_data,
    createdAt: toIso(r.created_at) ?? new Date().toISOString(),
  };
}

export class DigitalContractsService {
  constructor(private readonly deps: DigitalContractsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async generateContract(userId: string, input: ContractInput): Promise<GeneratedContract> {
    const prompt = `Generate a digital contract in JSON only.
User: ${userId}
Input: ${JSON.stringify(input)}
Return:
{"contractText":"...","summary":"...","keyTerms":["..."]}`;
    try {
      const out = await this.llm.complete(prompt, { model: "gpt-4o", temperature: 0.2, maxTokens: 1200 });
      const parsed = JSON.parse(parseJsonPayload(out)) as Partial<GeneratedContract>;
      return {
        contractText: typeof parsed.contractText === "string" && parsed.contractText.trim() ? parsed.contractText : fallback(input).contractText,
        summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary : fallback(input).summary,
        keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms.filter((k): k is string => typeof k === "string").slice(0, 12) : fallback(input).keyTerms,
      };
    } catch {
      return fallback(input);
    }
  }

  async createContract(userId: string, input: ContractInput): Promise<DigitalContract> {
    const generated = await this.generateContract(userId, input);
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      client_name: string;
      client_email: string;
      service_type: string;
      price: string | number;
      currency: string;
      input: ContractInput;
      contract_text: string;
      summary: string;
      key_terms: string[] | null;
      status: ContractStatus;
      sign_token: string | null;
      sent_at: Date | string | null;
      signed_at: Date | string | null;
      signature_data: string | null;
      voided_at: Date | string | null;
      created_at: Date | string;
    }>(
      `INSERT INTO digital_contracts
       (user_id, client_name, client_email, service_type, price, currency, input, contract_text, summary, key_terms, status, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5::numeric, $6, $7::jsonb, $8, $9, $10::jsonb, 'draft', NOW())
       RETURNING id::text, user_id::text, client_name, client_email, service_type, price, currency, input, contract_text, summary, key_terms, status, sign_token, sent_at, signed_at, signature_data, voided_at, created_at`,
      [
        userId,
        input.clientName,
        input.clientEmail,
        input.serviceType,
        input.price,
        input.currency,
        JSON.stringify(input),
        generated.contractText,
        generated.summary,
        JSON.stringify(generated.keyTerms),
      ],
    );
    return rowToContract(rows[0]);
  }

  async sendForSignature(contractId: string, userId: string): Promise<{ contractId: string; token: string; status: ContractStatus }> {
    const token = randomUUID();
    const rows = await this.db.query<{ id: string; status: ContractStatus }>(
      `UPDATE digital_contracts
       SET status = 'sent', sign_token = $3, sent_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status = 'draft'
       RETURNING id::text, status`,
      [contractId, userId, token],
    );
    if (!rows[0]) throw new Error("Contrato no disponible para envío");
    return { contractId: rows[0].id, token, status: rows[0].status };
  }

  async signContract(token: string, signatureData: string): Promise<{ contractId: string; status: ContractStatus }> {
    const rows = await this.db.query<{ id: string; status: ContractStatus }>(
      `UPDATE digital_contracts
       SET status = 'signed', signature_data = $2, signed_at = NOW()
       WHERE sign_token = $1 AND status = 'sent'
       RETURNING id::text, status`,
      [token, signatureData],
    );
    if (!rows[0]) throw new Error("Token inválido o contrato no firmable");
    return { contractId: rows[0].id, status: rows[0].status };
  }

  async voidContract(contractId: string, userId: string): Promise<{ contractId: string; status: ContractStatus }> {
    const rows = await this.db.query<{ id: string; status: ContractStatus }>(
      `UPDATE digital_contracts
       SET status = 'voided', voided_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status <> 'signed'
       RETURNING id::text, status`,
      [contractId, userId],
    );
    if (!rows[0]) throw new Error("No se pudo anular contrato");
    return { contractId: rows[0].id, status: rows[0].status };
  }

  async getContracts(userId: string, filters?: { status?: ContractStatus; fromDate?: string }): Promise<DigitalContract[]> {
    const where: string[] = ["user_id = $1::uuid"];
    const params: Array<string> = [userId];
    if (filters?.status) {
      where.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }
    if (filters?.fromDate) {
      where.push(`created_at >= $${params.length + 1}::timestamptz`);
      params.push(filters.fromDate);
    }
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      client_name: string;
      client_email: string;
      service_type: string;
      price: string | number;
      currency: string;
      input: ContractInput;
      contract_text: string;
      summary: string;
      key_terms: string[] | null;
      status: ContractStatus;
      sign_token: string | null;
      sent_at: Date | string | null;
      signed_at: Date | string | null;
      signature_data: string | null;
      voided_at: Date | string | null;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, client_name, client_email, service_type, price, currency, input, contract_text, summary, key_terms, status, sign_token, sent_at, signed_at, signature_data, voided_at, created_at
       FROM digital_contracts
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToContract);
  }

  async getContract(contractId: string, userId: string): Promise<DigitalContract | null> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      client_name: string;
      client_email: string;
      service_type: string;
      price: string | number;
      currency: string;
      input: ContractInput;
      contract_text: string;
      summary: string;
      key_terms: string[] | null;
      status: ContractStatus;
      sign_token: string | null;
      sent_at: Date | string | null;
      signed_at: Date | string | null;
      signature_data: string | null;
      voided_at: Date | string | null;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, client_name, client_email, service_type, price, currency, input, contract_text, summary, key_terms, status, sign_token, sent_at, signed_at, signature_data, voided_at, created_at
       FROM digital_contracts
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [contractId, userId],
    );
    return rows[0] ? rowToContract(rows[0]) : null;
  }
}

let cachedDigitalContractsService: DigitalContractsService | undefined;

export function getDigitalContractsService(): DigitalContractsService {
  if (!cachedDigitalContractsService) cachedDigitalContractsService = new DigitalContractsService();
  return cachedDigitalContractsService;
}

export function resetDigitalContractsServiceForTests(): void {
  cachedDigitalContractsService = undefined;
}
