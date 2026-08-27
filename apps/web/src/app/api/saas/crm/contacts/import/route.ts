import { NextResponse } from "next/server";
import { formDataConTope, jsonConTope, textoConTope } from "@/lib/security/cuerpoConTope";
import {
  getSaasCrmService,
  SaasCrmError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]!).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ""; });
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const FIELD_MAP: Record<string, string> = {
  nombre: "name", name: "name",
  email: "email", correo: "email",
  telefono: "phone", phone: "phone", tel: "phone",
  empresa: "company", company: "company",
  cargo: "position", position: "position", puesto: "position",
  estado: "status", status: "status",
  etapa: "pipeline_stage", stage: "pipeline_stage",
  valor: "value", value: "value",
  notas: "notes", notes: "notes",
  tags: "tags", etiquetas: "tags",
};

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const contentType = req.headers.get("content-type") ?? "";

    let csvText: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await formDataConTope(req);
      const file = formData.get("file");
      if (!file || typeof file === "string") return NextResponse.json({ error: "file required in multipart" }, { status: 400 });
      csvText = await (file as File).text();
    } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvText = await textoConTope(req);
    } else if (contentType.includes("application/json")) {
      const body = await jsonConTope(req) as Record<string, unknown> | null;
      if (!body?.csv || typeof body.csv !== "string") return NextResponse.json({ error: "csv field required" }, { status: 400 });
      csvText = body.csv;
    } else {
      csvText = await textoConTope(req);
    }

    const rows = parseCSV(csvText);
    if (rows.length === 0) return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
    if (rows.length > 5000) return NextResponse.json({ error: "Max 5000 rows per import" }, { status: 400 });

    const crm = getSaasCrmService();
    const inputs: Array<{
      name: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      position: string | null;
      status: "lead" | "prospect" | "client" | "churned";
      pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
      value: number;
      notes: string | null;
      tags: string[];
    }> = [];
    const preErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]!;
      const mapped: Record<string, string> = {};
      for (const [rawKey, val] of Object.entries(raw)) {
        const normalized = FIELD_MAP[rawKey];
        if (normalized) mapped[normalized] = val;
      }
      const name = mapped.name?.trim();
      if (!name) {
        preErrors.push({ row: i + 2, error: "name/nombre required" });
        continue;
      }
      inputs.push({
        name,
        email: mapped.email || null,
        phone: mapped.phone || null,
        company: mapped.company || null,
        position: mapped.position || null,
        status: (mapped.status as "lead" | "prospect" | "client" | "churned") || "lead",
        pipeline_stage: (mapped.pipeline_stage as "new" | "contacted" | "qualified" | "proposal" | "won" | "lost") || "new",
        value: mapped.value ? Number(mapped.value) || 0 : 0,
        notes: mapped.notes || null,
        tags: mapped.tags ? mapped.tags.split(";").map((t) => t.trim()).filter(Boolean) : [],
      });
    }

    // Chunked multi-row INSERT — avoids up to 5k sequential round-trips.
    const { created, errors: batchErrors, avisos } = await crm.createContactsBatch(
      ctx.tenant.id,
      inputs,
    );
    const errors = [
      ...preErrors,
      ...batchErrors.map((e) => ({ row: e.index + 2, error: e.error })),
    ];

    // Los AVISOS no son errores, y por eso van aparte.
    //
    // Una fila con un correo que no se va a poder enviar SE IMPORTA igual y
    // conserva el valor: rechazar el lote entero por unos cuantos, o descartar
    // esos en silencio, son las dos formas de perder el trabajo de quien
    // importa. Lo que hace falta es que sepa CUALES son para poder arreglarlos,
    // y para eso tienen que llegar hasta aqui.
    //
    // `+2` porque la fila 1 del fichero es la cabecera y el indice empieza en 0:
    // asi el numero que se ve coincide con el que muestra la hoja de calculo.
    const avisosPorFila = avisos.map((a) => ({ row: a.index + 2, aviso: a.aviso }));

    return NextResponse.json({
      imported: created.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 50),
      warnings: avisosPorFila.length,
      warningDetails: avisosPorFila.slice(0, 50),
    }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof SaasCrmError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
