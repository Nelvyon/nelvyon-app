type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function outputStatusTone(status: string | null | undefined): Tone {
  const s = (status ?? "pending").toLowerCase();
  if (s === "passed" || s === "approved") return "success";
  if (s === "failed") return "danger";
  if (s === "qa_review" || s === "generating") return "info";
  if (s === "draft") return "neutral";
  return "warning";
}

export function outputStatusLabel(status: string | null | undefined): string {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "Pendiente",
    qa_review: "En QA",
    passed: "Aprobado",
    failed: "Fallido",
    generating: "Generando",
    draft: "Borrador",
  };
  return map[s] ?? status ?? "—";
}
