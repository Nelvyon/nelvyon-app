import { OsDocumentDetailView } from "@/features/os-shell/documents/OsDocumentDetailView";
import type { OsDocumentSource } from "@/features/os-shell/documents/constants";

const VALID: OsDocumentSource[] = ["entrega", "archivo", "contrato", "factura"];

export const metadata = {
  title: "Detalle documento · NELVYON OS",
};

export default async function OsDocumentoDetallePage({
  params,
}: {
  params: Promise<{ source: string; id: string }>;
}) {
  const { source, id } = await params;
  const src = VALID.includes(source as OsDocumentSource)
    ? (source as OsDocumentSource)
    : "entrega";
  return <OsDocumentDetailView source={src} id={Number(id)} />;
}
