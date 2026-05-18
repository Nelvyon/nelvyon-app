/**
 * SaasCRM — Fully code-split CRM module.
 * ALL tabs are lazy-loaded to keep the initial chunk minimal (~30KB).
 * Heavy dependencies (papaparse, xlsx, recharts) only load when needed.
 */
import { useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SaasLayout from "@/components/SaasLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Upload, Download, GitMerge, BarChart3, Target,
} from "lucide-react";
import { SkeletonTable } from "@/components/SkeletonCards";

// ─── ALL tabs lazy-loaded (including ContactsTab & Analytics) ───
const CRMContactsTab = lazy(() => import("./crm/CRMContactsTab"));
const CRMImportTab = lazy(() => import("./crm/CRMImportTab"));
const CRMExportTab = lazy(() => import("./crm/CRMExportTab"));
const CRMDuplicatesTab = lazy(() => import("./crm/CRMDuplicatesTab"));
const CRMContactDetail = lazy(() => import("./crm/CRMContactDetail"));
const CRMAnalyticsTab = lazy(() => import("@/components/analytics/CRMAnalyticsTab"));

function TabFallback() {
  return (
    <div className="py-8">
      <SkeletonTable rows={4} columns={5} />
    </div>
  );
}

// ─── Main Component ───
export default function SaasCRM() {
  const { user, loading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "contacts";
  const viewContactId = searchParams.get("view") ? Number(searchParams.get("view")) : null;

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  if (viewContactId) {
    return (
      <Suspense fallback={<TabFallback />}>
        <CRMContactDetail
          key={`${viewContactId}-${activeWorkspace?.id ?? "ws"}`}
          contactId={viewContactId}
          onBack={() => setSearchParams({})}
        />
      </Suspense>
    );
  }

  return (
    <SaasLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" /> CRM
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Contactos del workspace: lista clara, ficha y herramientas de importación cuando las necesites
            </p>
            <Link
              to="/saas/pipelines"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400/90 hover:text-blue-300 mt-2 transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              Pipelines & Deals (mismo workspace)
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="contacts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" /> Contactos
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Upload className="w-4 h-4 mr-1.5" /> Importar
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Download className="w-4 h-4 mr-1.5" /> Exportar
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <GitMerge className="w-4 h-4 mr-1.5" /> Duplicados
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <CRMContactsTab
                key={activeWorkspace?.id ?? "no-workspace"}
                onViewContact={(id) => setSearchParams({ view: String(id) })}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="import" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <CRMImportTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="export" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <CRMExportTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="duplicates" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <CRMDuplicatesTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <CRMAnalyticsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </SaasLayout>
  );
}