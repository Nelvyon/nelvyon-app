/** Extrae URL de enlace si existe en object_key, extra_data JSON o campo pdf. */
export function resolveFileUrl(
  objectKey?: string | null,
  extraData?: string | null,
  pdfUrl?: string | null,
): string | null {
  if (pdfUrl?.trim()) return pdfUrl.trim();
  const key = objectKey?.trim();
  if (key && /^https?:\/\//i.test(key)) return key;
  if (!extraData?.trim()) return null;
  try {
    const parsed = JSON.parse(extraData) as Record<string, unknown>;
    for (const k of ["url", "file_url", "download_url", "href", "public_url"]) {
      const v = parsed[k];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
  } catch {
    if (/^https?:\/\//i.test(extraData.trim())) return extraData.trim();
  }
  return null;
}
