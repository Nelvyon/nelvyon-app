type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function dealStatusTone(status: string): Tone {
  switch (status) {
    case "ganado":
      return "success";
    case "perdido":
      return "danger";
    case "propuesta":
      return "info";
    case "contactado":
      return "warning";
    default:
      return "neutral";
  }
}

export function dealStatusLabel(status: string): string {
  const map: Record<string, string> = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    propuesta: "Propuesta",
    ganado: "Ganado",
    perdido: "Perdido",
  };
  return map[status] ?? status;
}
