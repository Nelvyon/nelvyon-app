import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CRMExportTab() {
  const [exporting, setExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      const res = await api.crmExport({
        status: filterStatus || undefined,
        search: searchTerm || undefined,
      });

      if (res.items.length === 0) {
        toast.error("No hay contactos para exportar");
        return;
      }

      const rows = res.items.map((c) => ({
        ID: c.id,
        Nombre: c.first_name,
        Apellido: c.last_name || "",
        Email: c.email,
        Teléfono: c.phone || "",
        Empresa: c.company_name || "",
        Tags: c.tags || "",
        Estado: c.status || "",
        Fuente: c.source || "",
        Score: c.score ?? "",
        Notas: c.notes || "",
        Creado: c.created_at || "",
      }));

      if (format === "csv") {
        const Papa = (await import("papaparse")).default;
        const { saveAs } = await import("file-saver");
        const csv = Papa.unparse(rows);
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `contactos_${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contactos");
        XLSX.writeFile(wb, `contactos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }

      toast.success(`${res.items.length} contactos exportados como ${format.toUpperCase()}`);
    } catch {
      toast.error("Error exportando contactos");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Download className="w-5 h-5 text-emerald-400" /> Exportar Contactos
      </h3>
      <p className="text-sm text-white/50">
        Descarga tus contactos en formato CSV o Excel. Puedes filtrar antes de exportar.
      </p>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar..."
          className="bg-white/5 border-white/10 max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="prospect">Prospecto</option>
          <option value="lead">Lead</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <div className="flex gap-3">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleExport("csv")} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Exportar CSV
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleExport("xlsx")} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Exportar Excel
        </Button>
      </div>
    </div>
  );
}