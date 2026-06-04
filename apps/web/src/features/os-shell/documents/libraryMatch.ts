/** Clasifica nelvyon_assets para la pestaña Biblioteca (sin tabla nueva). */
export function libraryCategoryFromAsset(asset: {
  asset_type: string;
  classification?: string | null;
  tags?: string | null;
  file_name?: string;
}): string {
  const blob = [
    asset.asset_type,
    asset.classification ?? "",
    asset.tags ?? "",
    asset.file_name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/ecommerce|woo|shopify|tienda/.test(blob)) return "ecommerce";
  if (/funnel|embudo|landing.?funnel/.test(blob)) return "funnel";
  if (/brand|branding|logo|identidad/.test(blob)) return "branding";
  if (/ads|anuncio|meta.?ads|google.?ads/.test(blob)) return "ads";
  if (/prompt|gpt|llm|system.?prompt/.test(blob)) return "prompt";
  if (/template|plantilla/.test(blob) && /web|site|landing/.test(blob)) return "web";
  if (/web|landing|sitio|static.?site/.test(blob)) return "web";
  if (/doc|pdf|brief|propuesta|contrato/.test(blob)) return "documento";
  if (/recurso|resource|internal|interno/.test(blob)) return "recurso";
  if (/template|plantilla/.test(blob)) return "web";
  return "recurso";
}

export function isLibraryAsset(asset: {
  asset_type: string;
  classification?: string | null;
  tags?: string | null;
}): boolean {
  const blob = [asset.asset_type, asset.classification ?? "", asset.tags ?? ""].join(" ").toLowerCase();
  return /template|plantilla|prompt|recurso|resource|biblioteca|library|branding|funnel|ecommerce|ads/.test(
    blob,
  );
}

export function matchesLibraryCategory(
  asset: {
    asset_type: string;
    classification?: string | null;
    tags?: string | null;
  },
  category: string,
): boolean {
  if (!isLibraryAsset(asset)) return false;
  if (!category) return true;
  return libraryCategoryFromAsset(asset) === category;
}

export function libraryCategoryLabel(id: string): string {
  const map: Record<string, string> = {
    web: "Plantillas web",
    ecommerce: "Plantillas ecommerce",
    funnel: "Plantillas funnels",
    branding: "Plantillas branding",
    ads: "Plantillas anuncios",
    prompt: "Prompts",
    recurso: "Recursos internos",
    documento: "Documentos reutilizables",
  };
  return map[id] ?? id;
}
