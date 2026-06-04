/** Fuentes unificadas en /os/documentos (solo dominio OS / workspace). */
export const OS_DOCUMENT_SOURCES = [
  "entrega",
  "archivo",
  "contrato",
  "factura",
] as const;

export type OsDocumentSource = (typeof OS_DOCUMENT_SOURCES)[number];

export const OS_DOCUMENT_TAB_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "entregas", label: "Entregas" },
  { value: "archivos", label: "Archivos" },
  { value: "contratos", label: "Contratos" },
  { value: "facturas", label: "Facturas" },
  { value: "biblioteca", label: "Biblioteca" },
] as const;

export type OsDocumentTab = (typeof OS_DOCUMENT_TAB_OPTIONS)[number]["value"];

/** Categorías biblioteca — filtro sobre nelvyon_assets (asset_type / classification / tags). */
export const OS_LIBRARY_CATEGORY_OPTIONS = [
  { value: "", label: "Todas las categorías" },
  { value: "web", label: "Plantillas web" },
  { value: "ecommerce", label: "Plantillas ecommerce" },
  { value: "funnel", label: "Plantillas funnels" },
  { value: "branding", label: "Plantillas branding" },
  { value: "ads", label: "Plantillas anuncios" },
  { value: "prompt", label: "Prompts" },
  { value: "recurso", label: "Recursos internos" },
  { value: "documento", label: "Documentos reutilizables" },
] as const;

export const OS_OUTPUT_STATUS_FILTER = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "qa_review", label: "En QA" },
  { value: "passed", label: "Aprobado" },
  { value: "failed", label: "Fallido" },
  { value: "generating", label: "Generando" },
  { value: "draft", label: "Borrador" },
] as const;
