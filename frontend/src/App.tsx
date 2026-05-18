import { Suspense, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { lazyWithRetry } from '@/lib/lazy-retry';

/* ─── Premium Loading Spinner ─── */
function NelvyonLoader() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-black text-xl tracking-tighter">N</span>
          </div>
          <div className="absolute -inset-1 rounded-xl border-2 border-violet-500/30 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-[11px] text-zinc-600 font-medium tracking-wide">NELVYON</p>
      </div>
    </div>
  );
}

/* ─── Acceso ─── */
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));

/* ─── NELVYON OS — Sistema Privado de Producción ─── */
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Clients = lazyWithRetry(() => import('./pages/Clients'));
const Projects = lazyWithRetry(() => import('./pages/Projects'));
const Generator = lazyWithRetry(() => import('./pages/Generator'));
const QAPanel = lazyWithRetry(() => import('./pages/QAPanel'));
const Assets = lazyWithRetry(() => import('./pages/Assets'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const ServiceQuality = lazyWithRetry(() => import('./pages/ServiceQuality'));
const Automation = lazyWithRetry(() => import('./pages/Automation'));
const HostingAgent = lazyWithRetry(() => import('./pages/HostingAgent'));
const WebAgent = lazyWithRetry(() => import('./pages/WebAgent'));
const SystemStatus = lazyWithRetry(() => import('./pages/SystemStatus'));

/* ─── NELVYON SaaS — Plataforma SaaS Completa ─── */
const SaasEntry = lazyWithRetry(() => import('./pages/saas/SaasEntry'));
const SaasDashboard = lazyWithRetry(() => import('./pages/saas/SaasDashboard'));
const SaasWorkspaceHome = lazyWithRetry(() => import('./pages/saas/SaasWorkspaceHome'));
const SaasCRM = lazyWithRetry(() => import('./pages/saas/SaasCRM'));
const SaasAnalytics = lazyWithRetry(() => import('./pages/saas/SaasAnalytics'));
const SaasHelpdesk = lazyWithRetry(() => import('./pages/saas/SaasHelpdesk'));
const SaasSales = lazyWithRetry(() => import('./pages/saas/SaasSales'));
const SaasPipelines = lazyWithRetry(() => import('./pages/saas/SaasPipelines'));
const SaasMarketing = lazyWithRetry(() => import('./pages/saas/SaasMarketing'));
const SaasWorkflows = lazyWithRetry(() => import('./pages/saas/SaasWorkflows'));
const SaasTemplates = lazyWithRetry(() => import('./pages/saas/SaasTemplates'));
const SaasCampaigns = lazyWithRetry(() => import('./pages/saas/SaasCampaigns'));
const SaasFunnels = lazyWithRetry(() => import('./pages/saas/SaasFunnels'));
const SaasSocial = lazyWithRetry(() => import('./pages/saas/SaasSocial'));
const SaasConversations = lazyWithRetry(() => import('./pages/saas/SaasConversations'));
const SaasCalls = lazyWithRetry(() => import('./pages/saas/SaasCalls'));
const SaasCalendar = lazyWithRetry(() => import('./pages/saas/SaasCalendar'));
const SaasWebsites = lazyWithRetry(() => import('./pages/saas/SaasWebsites'));
const SaasWebsiteBuilder = lazyWithRetry(() => import('./pages/saas/SaasWebsiteBuilder'));
const SaasForms = lazyWithRetry(() => import('./pages/saas/SaasForms'));
const SaasBlog = lazyWithRetry(() => import('./pages/saas/SaasBlog'));
const SaasPayments = lazyWithRetry(() => import('./pages/saas/SaasPayments'));
const SaasReports = lazyWithRetry(() => import('./pages/saas/SaasReports'));
const SaasIntegrations = lazyWithRetry(() => import('./pages/saas/SaasIntegrations'));
const SaasSettingsPage = lazyWithRetry(() => import('./pages/saas/SaasSettingsPage'));
const SaasPDFGenerator = lazyWithRetry(() => import('./pages/saas/SaasPDFGenerator'));
const SaasPresentations = lazyWithRetry(() => import('./pages/saas/SaasPresentations'));
const SaasSegmentation = lazyWithRetry(() => import('./pages/saas/SaasSegmentation'));
const SaasPartners = lazyWithRetry(() => import('./pages/saas/SaasPartners'));
const SaasAgentsMarketplace = lazyWithRetry(() => import('./pages/saas/SaasAgentsMarketplace'));
const SaasContracts = lazyWithRetry(() => import('./pages/saas/SaasContracts'));
const SaasVideoAds = lazyWithRetry(() => import('./pages/saas/SaasVideoAds'));
const SaasAutopilot = lazyWithRetry(() => import('./pages/saas/SaasAutopilot'));
const SaasCybersecurity = lazyWithRetry(() => import('./pages/saas/SaasCybersecurity'));
const SaasAPIHub = lazyWithRetry(() => import('./pages/saas/SaasAPIHub'));
const SaasAdminPanel = lazyWithRetry(() => import('./pages/saas/SaasAdminPanel'));
const SaasAgentsDashboard = lazyWithRetry(() => import('./pages/saas/SaasAgentsDashboard'));
const SaasPaymentSuccess = lazyWithRetry(() => import('./pages/saas/SaasPaymentSuccess'));
const SaasPricing = lazyWithRetry(() => import('./pages/saas/SaasPricing'));
const SaasPlatformHealth = lazyWithRetry(() => import('./pages/saas/SaasPlatformHealth'));
const SaasBilling = lazyWithRetry(() => import('./pages/saas/SaasBilling'));
const SaasSystemLogs = lazyWithRetry(() => import('./pages/saas/SaasSystemLogs'));
const SaasOnboarding = lazyWithRetry(() => import('./pages/saas/SaasOnboarding'));
const SaasGlobalDashboard = lazyWithRetry(() => import('./pages/saas/SaasGlobalDashboard'));
const SaasTenantSettings = lazyWithRetry(() => import('./pages/saas/SaasTenantSettings'));
const SaasQRService = lazyWithRetry(() => import('./pages/saas/SaasQRService'));
const SaasAppCreator = lazyWithRetry(() => import('./pages/saas/SaasAppCreator'));

/* ─── Comparativas y Benchmarks ─── */
const QualityBenchmark = lazyWithRetry(() => import('./pages/QualityBenchmark'));
const ServicesComparison = lazyWithRetry(() => import('./pages/ServicesComparison'));
const VsGoHighLevel = lazyWithRetry(() => import('./pages/VsGoHighLevel'));
const BotsTemplates = lazyWithRetry(() => import('./pages/BotsTemplates'));

/* ─── NELVYON Agents — Panel Interno de Agentes ─── */
const AgentsPanel = lazyWithRetry(() => import('./pages/AgentsPanel'));
const AgentDetail = lazyWithRetry(() => import('./pages/AgentDetail'));
const AgentChat = lazyWithRetry(() => import('./pages/AgentChat'));

/* ─── Auth Pages ─── */
const AuthCallback = lazyWithRetry(() => import('./pages/AuthCallback'));
const AuthError = lazyWithRetry(() => import('./pages/AuthError'));
const LogoutCallbackPage = lazyWithRetry(() => import('./pages/LogoutCallbackPage'));

/* ─── Service & 404 ─── */
const SaasServicePage = lazyWithRetry(() => import('./pages/saas/SaasServicePage'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

/* ─── Protected Route ─── */
const ProtectedRoute = lazyWithRetry(() => import('./components/ProtectedRoute'));

/* ─── QueryClient — Production-grade config ─── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — avoid re-fetching on tab switch
      gcTime: 15 * 60 * 1000,          // 15 min garbage collection
      retry: 2,                         // 2 retries before failing
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,      // Prevent jarring refetches
      refetchOnReconnect: true,         // Refetch after network recovery
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Global unhandled error catcher — prevents silent failures.
 * Logs to sessionStorage for the Platform Health dashboard.
 */
function useGlobalErrorCatcher() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the browser default (console error) for handled patterns
      const msg = event.reason?.message || String(event.reason);
      // Ignore chunk load errors (handled by lazyWithRetry)
      if (msg.includes('dynamically imported') || msg.includes('Loading chunk')) return;
      console.error('[NELVYON:unhandled]', event.reason);
      try {
        const log = JSON.parse(sessionStorage.getItem('nelvyon_error_log') || '[]');
        log.push({
          type: 'unhandled_rejection',
          message: msg.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
        sessionStorage.setItem('nelvyon_error_log', JSON.stringify(log.slice(-30)));
      } catch { /* storage full — silent */ }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[NELVYON:global]', event.error);
      try {
        const log = JSON.parse(sessionStorage.getItem('nelvyon_error_log') || '[]');
        log.push({
          type: 'global_error',
          message: (event.message || '').slice(0, 300),
          filename: event.filename,
          timestamp: new Date().toISOString(),
        });
        sessionStorage.setItem('nelvyon_error_log', JSON.stringify(log.slice(-30)));
      } catch { /* silent */ }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
}

/* ─── Helper: Protected route wrapper (removes double Suspense) ─── */
function P({ children, requireSuperAdmin }: { children: React.ReactNode; requireSuperAdmin?: boolean }) {
  return (
    <ProtectedRoute requireSuperAdmin={requireSuperAdmin}>
      {children}
    </ProtectedRoute>
  );
}

const App = () => {
  useGlobalErrorCatcher();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RBACProvider>
        <WorkspaceProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster richColors closeButton position="top-right" />
            <BrowserRouter>
              <GlobalErrorBoundary>
                <Suspense fallback={<NelvyonLoader />}>
                  <Routes>
                    {/* ═══ ACCESO ═══ */}
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* ═══ AUTH CALLBACKS ═══ */}
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth/error" element={<AuthError />} />
                    <Route path="/logout/callback" element={<LogoutCallbackPage />} />

                    {/* ═══ NELVYON OS — PROTEGIDO ═══ */}
                    <Route path="/dashboard" element={<P requireSuperAdmin><Dashboard /></P>} />
                    <Route path="/clients" element={<P requireSuperAdmin><Clients /></P>} />
                    <Route path="/projects" element={<P requireSuperAdmin><Projects /></P>} />
                    <Route path="/generator" element={<P requireSuperAdmin><Generator /></P>} />
                    <Route path="/qa" element={<P requireSuperAdmin><QAPanel /></P>} />
                    <Route path="/assets" element={<P requireSuperAdmin><Assets /></P>} />
                    <Route path="/settings" element={<P requireSuperAdmin><Settings /></P>} />
                    <Route path="/quality" element={<P requireSuperAdmin><ServiceQuality /></P>} />
                    <Route path="/automation" element={<P requireSuperAdmin><Automation /></P>} />
                    <Route path="/hosting-agent" element={<P requireSuperAdmin><HostingAgent /></P>} />
                    <Route path="/web-agent" element={<P requireSuperAdmin><WebAgent /></P>} />
                    <Route path="/system-status" element={<P requireSuperAdmin><SystemStatus /></P>} />

                    {/* ═══ NELVYON SaaS — PROTEGIDO ═══ */}
                    <Route path="/saas" element={<P><SaasEntry /></P>} />
                    <Route path="/saas/home" element={<P><SaasWorkspaceHome /></P>} />
                    <Route path="/saas/dashboard" element={<P><SaasDashboard /></P>} />
                    <Route path="/saas/crm" element={<P><SaasCRM /></P>} />
                    <Route path="/saas/pipelines" element={<P><SaasPipelines /></P>} />
                    <Route path="/saas/email-marketing" element={<P><SaasMarketing /></P>} />
                    <Route path="/saas/campaigns" element={<P><SaasCampaigns /></P>} />
                    <Route path="/saas/funnels" element={<P><SaasFunnels /></P>} />
                    <Route path="/saas/social" element={<P><SaasSocial /></P>} />
                    <Route path="/saas/video-ads" element={<P><SaasVideoAds /></P>} />
                    <Route path="/saas/autopilot" element={<P><SaasAutopilot /></P>} />
                    <Route path="/saas/helpdesk" element={<P><SaasHelpdesk /></P>} />
                    <Route path="/saas/conversations" element={<P><SaasConversations /></P>} />
                    <Route path="/saas/calls" element={<P><SaasCalls /></P>} />
                    <Route path="/saas/workflows" element={<P><SaasWorkflows /></P>} />
                    <Route path="/saas/bots" element={<P><BotsTemplates /></P>} />
                    <Route path="/saas/calendar" element={<P><SaasCalendar /></P>} />
                    <Route path="/saas/websites" element={<P><SaasWebsites /></P>} />
                    <Route path="/saas/websites/builder/:siteId" element={<P><SaasWebsiteBuilder /></P>} />
                    <Route path="/saas/templates" element={<P><SaasTemplates /></P>} />
                    <Route path="/saas/forms" element={<P><SaasForms /></P>} />
                    <Route path="/saas/blog" element={<P><SaasBlog /></P>} />
                    <Route path="/saas/sales" element={<P><SaasSales /></P>} />
                    <Route path="/saas/payments" element={<P><SaasPayments /></P>} />
                    <Route path="/saas/analytics" element={<P><SaasAnalytics /></P>} />
                    <Route path="/saas/reports" element={<P><SaasReports /></P>} />
                    <Route path="/saas/pdf-generator" element={<P><SaasPDFGenerator /></P>} />
                    <Route path="/saas/presentations" element={<P><SaasPresentations /></P>} />
                    <Route path="/saas/segmentation" element={<P><SaasSegmentation /></P>} />
                    <Route path="/saas/agents-marketplace" element={<P><SaasAgentsMarketplace /></P>} />
                    <Route path="/saas/contracts" element={<P><SaasContracts /></P>} />
                    <Route path="/saas/partners" element={<P><SaasPartners /></P>} />
                    <Route path="/saas/benchmark" element={<P><QualityBenchmark /></P>} />
                    <Route path="/saas/comparison" element={<P><ServicesComparison /></P>} />
                    <Route path="/saas/vs-ghl" element={<P><VsGoHighLevel /></P>} />
                    <Route path="/saas/integrations" element={<P><SaasIntegrations /></P>} />
                    <Route path="/saas/cybersecurity" element={<P><SaasCybersecurity /></P>} />
                    <Route path="/saas/api-hub" element={<P><SaasAPIHub /></P>} />
                    <Route path="/saas/admin" element={<P requireSuperAdmin><SaasAdminPanel /></P>} />
                    <Route path="/saas/agents-internal" element={<P><SaasAgentsDashboard /></P>} />
                    <Route path="/saas/payment-success" element={<P><SaasPaymentSuccess /></P>} />
                    <Route path="/saas/pricing" element={<P><SaasPricing /></P>} />
                    <Route path="/saas/billing" element={<P><SaasBilling /></P>} />
                    <Route path="/saas/settings" element={<P><SaasSettingsPage /></P>} />
                    <Route path="/saas/platform-health" element={<P requireSuperAdmin><SaasPlatformHealth /></P>} />
                    <Route path="/saas/system-logs" element={<P requireSuperAdmin><SaasSystemLogs /></P>} />
                    <Route path="/saas/onboarding" element={<P><SaasOnboarding /></P>} />
                    <Route path="/saas/global-dashboard" element={<P><SaasGlobalDashboard /></P>} />
                    <Route path="/saas/tenant-settings" element={<P><SaasTenantSettings /></P>} />
                    <Route path="/saas/qr-studio" element={<P><SaasQRService /></P>} />
                    <Route path="/saas/app-creator" element={<P><SaasAppCreator /></P>} />
                    <Route path="/saas/service/:serviceId" element={<P><SaasServicePage /></P>} />

                    {/* ═══ Agents Panel — PROTEGIDO ═══ */}
                    <Route path="/agents" element={<P><AgentsPanel /></P>} />
                    <Route path="/agents/:agentId" element={<P><AgentDetail /></P>} />
                    <Route path="/agents/:agentId/chat" element={<P><AgentChat /></P>} />

                    {/* ═══ 404 — Catch-all ═══ */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </GlobalErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
        </WorkspaceProvider>
        </RBACProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;