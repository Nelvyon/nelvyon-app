import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CRMDuplicatesTab() {
  const [duplicates, setDuplicates] = useState<{ email: string; count: number; contacts: Record<string, unknown>[] }[]>([]);
  const [loadingDups, setLoadingDups] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  const loadDuplicates = useCallback(async () => {
    setLoadingDups(true);
    try {
      const res = await api.crmFindDuplicates();
      setDuplicates(res);
    } catch {
      toast.error("Error buscando duplicados");
    } finally {
      setLoadingDups(false);
    }
  }, []);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

  const handleMerge = async (group: typeof duplicates[0]) => {
    const sorted = [...group.contacts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at as string).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at as string).getTime() : 0;
      return dateA - dateB;
    });
    const primaryId = sorted[0].id as number;
    const secondaryIds = sorted.slice(1).map(c => c.id as number);

    if (!confirm(`¿Fusionar ${group.count} contactos con email "${group.email}"? Se mantendrá el más antiguo (ID: ${primaryId}) y se eliminarán los demás.`)) return;

    setMerging(group.email);
    try {
      const res = await api.crmMerge(primaryId, secondaryIds);
      toast.success(`Fusionados ${res.contacts_merged} contactos. Deals: ${res.deals_reassigned}, Actividades: ${res.activities_reassigned}`);
      loadDuplicates();
    } catch {
      toast.error("Error fusionando contactos");
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-amber-400" /> Contactos Duplicados
          </h3>
          <p className="text-sm text-white/50 mt-1">
            Detecta y fusiona contactos duplicados por email. El contacto más antiguo se mantiene como principal.
          </p>
        </div>
        <Button variant="outline" className="border-white/10 text-white/70" onClick={loadDuplicates} disabled={loadingDups}>
          <RefreshCw className={cn("w-4 h-4 mr-1", loadingDups && "animate-spin")} /> Escanear
        </Button>
      </div>

      {loadingDups ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : duplicates.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400/50" />
          <p className="text-lg">No se encontraron duplicados</p>
          <p className="text-sm mt-1">Tu base de contactos está limpia</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-amber-400">{duplicates.length} grupo{duplicates.length !== 1 ? "s" : ""} de duplicados encontrado{duplicates.length !== 1 ? "s" : ""}</p>
          {duplicates.map((group) => (
            <div key={group.email} className="bg-white/5 rounded-xl border border-amber-500/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-white">{group.email}</p>
                  <p className="text-xs text-white/40">{group.count} contactos con este email</p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleMerge(group)}
                  disabled={merging === group.email}
                >
                  {merging === group.email ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <GitMerge className="w-4 h-4 mr-1" />}
                  Fusionar
                </Button>
              </div>
              <div className="grid gap-2">
                {group.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 rounded-lg p-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {((c.first_name as string)?.[0] || "?").toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{c.first_name as string} {(c.last_name as string) || ""}</span>
                    {c.company_name && <span className="text-white/40">• {c.company_name as string}</span>}
                    <span className="text-white/30 ml-auto text-xs">ID: {c.id as number}</span>
                    {i === 0 && <Badge className="bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">Principal</Badge>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}