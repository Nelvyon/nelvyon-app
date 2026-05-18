import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CRMImportTab() {
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped_duplicates: number; errors: { row: number; error: string }[] } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const Papa = (await import("papaparse")).default;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          setParsedRows(res.data as Record<string, unknown>[]);
          toast.success(`${res.data.length} filas parseadas del CSV`);
        },
        error: () => toast.error("Error parseando CSV"),
      });
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        setParsedRows(data);
        toast.success(`${data.length} filas parseadas del Excel`);
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Formato no soportado. Usa CSV o Excel.");
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.crmImportCSV(parsedRows, skipDuplicates);
      setResult(res);
      toast.success(`${res.imported} contactos importados`);
    } catch {
      toast.error("Error importando contactos");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" /> Importar Contactos
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Sube un archivo CSV o Excel con tus contactos. Columnas soportadas: first_name, last_name, email, phone, company_name, tags, status, source, score, notes.
          También acepta nombres en español (nombre, apellido, correo, teléfono, empresa, etc.)
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" className="border-white/10 text-white" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Seleccionar Archivo
          </Button>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="rounded" />
            Omitir duplicados (por email)
          </label>
        </div>

        {parsedRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">{parsedRows.length} filas listas para importar</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Importar {parsedRows.length} contactos
              </Button>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    {Object.keys(parsedRows[0] || {}).slice(0, 8).map((k) => (
                      <th key={k} className="text-left py-2 px-2 font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-white/5 text-white/60">
                      {Object.keys(parsedRows[0] || {}).slice(0, 8).map((k) => (
                        <td key={k} className="py-1.5 px-2 truncate max-w-[150px]">{String(row[k] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 5 && <p className="text-xs text-white/30 mt-1 px-2">...y {parsedRows.length - 5} filas más</p>}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-medium text-white mb-2">Resultado de Importación</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-500/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                <p className="text-xs text-white/50">Importados</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-400">{result.skipped_duplicates}</p>
                <p className="text-xs text-white/50">Duplicados omitidos</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-400">{result.errors.length}</p>
                <p className="text-xs text-white/50">Errores</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto text-xs text-red-400/80">
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i}>Fila {err.row}: {err.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}