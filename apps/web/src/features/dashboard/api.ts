import { apiClient } from "@/core/api";
import type { LandingBlock } from "@/features/builders/types";

type List<T> = { items: T[]; total?: number };

export const dashboardCrmApi = {
  contacts: (q?: string) =>
    apiClient.get<List<Record<string, unknown>>>(`/api/crm/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
      tenantScoped: true,
    }),
  contact: (id: string) => apiClient.get<Record<string, unknown>>(`/api/crm/contacts/${id}`, { tenantScoped: true }),
  createContact: (body: Record<string, unknown>) =>
    apiClient.post("/api/crm/contacts", { tenantScoped: true, body }),
  deals: () => apiClient.get<List<Record<string, unknown>>>("/api/crm/deals", { tenantScoped: true }),
  pipeline: () => apiClient.get<Record<string, unknown>>("/api/crm/pipeline", { tenantScoped: true }),
  activities: () => apiClient.get<List<Record<string, unknown>>>("/api/crm/activities", { tenantScoped: true }),
  stats: () => apiClient.get<Record<string, unknown>>("/api/crm/stats", { tenantScoped: true }),
  stages: () => apiClient.get<{ stages?: string[] }>("/api/crm/stages", { tenantScoped: true }),
  moveDeal: (id: string, stage: string) =>
    apiClient.post(`/api/crm/deals/${id}/move-stage`, { tenantScoped: true, body: { stage } }),
  createActivity: (body: Record<string, unknown>) =>
    apiClient.post("/api/crm/activities", { tenantScoped: true, body }),
};

export const dashboardCampaignsApi = {
  list: () =>
    apiClient.get<List<Record<string, unknown>>>("/api/v1/entities/nelvyon_campaigns", { tenantScoped: true }),
  get: (id: number) =>
    apiClient.get<Record<string, unknown>>(`/api/v1/entities/nelvyon_campaigns/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post("/api/v1/entities/nelvyon_campaigns", { tenantScoped: true, body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`/api/v1/entities/nelvyon_campaigns/${id}`, { tenantScoped: true, body }),
};

export const dashboardWorkflowsApi = {
  list: () => apiClient.get<List<Record<string, unknown>>>("/api/v1/entities/workflows", { tenantScoped: true }),
  get: (id: number) => apiClient.get<Record<string, unknown>>(`/api/v1/entities/workflows/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post("/api/v1/entities/workflows", { tenantScoped: true, body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`/api/v1/entities/workflows/${id}`, { tenantScoped: true, body }),
};

export const dashboardHelpdeskApi = {
  stats: () => apiClient.get<{ open_count?: number }>("/api/helpdesk/stats", { tenantScoped: true }),
  tickets: (params?: string) =>
    apiClient.get<List<Record<string, unknown>>>(`/api/helpdesk/tickets${params ? `?${params}` : ""}`, {
      tenantScoped: true,
    }),
  ticket: (id: number) => apiClient.get<Record<string, unknown>>(`/api/helpdesk/tickets/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post("/api/helpdesk/tickets", { tenantScoped: true, body }),
  reply: (id: number, content: string) =>
    apiClient.post(`/api/helpdesk/tickets/${id}/reply`, { tenantScoped: true, body: { content } }),
  resolve: (id: number) => apiClient.patch(`/api/helpdesk/tickets/${id}/resolve`, { tenantScoped: true, body: {} }),
};

export const dashboardContractsApi = {
  list: () => apiClient.get<List<Record<string, unknown>>>("/api/v1/entities/contracts", { tenantScoped: true }),
  get: (id: number) => apiClient.get<Record<string, unknown>>(`/api/v1/entities/contracts/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post("/api/v1/entities/contracts", { tenantScoped: true, body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`/api/v1/entities/contracts/${id}`, { tenantScoped: true, body }),
  sendForSignature: (id: number, email: string, title?: string) =>
    apiClient.post("/api/contracts/send", {
      tenantScoped: true,
      body: {
        document_path: `/tmp/contract-${id}.pdf`,
        subject: `Firma: ${title ?? "Contrato"}`,
        message: "Por favor firme el contrato adjunto.",
        signers: [{ email, name: email.split("@")[0] }],
      },
    }),
  downloadPdf: async (id: number) => {
    const c = await apiClient.get<Record<string, unknown>>(`/api/v1/entities/contracts/${id}`, { tenantScoped: true });
    const text = String(c.content ?? c.title ?? "Contrato");
    return new Blob([text], { type: "application/pdf" });
  },
};

export const dashboardInvoicesApi = {
  stats: () => apiClient.get<Record<string, unknown>>("/api/invoices/stats", { tenantScoped: true }),
  list: () => apiClient.get<List<Record<string, unknown>>>("/api/invoices", { tenantScoped: true }),
  get: (id: number) => apiClient.get<Record<string, unknown>>(`/api/invoices/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) => apiClient.post("/api/invoices", { tenantScoped: true, body }),
  update: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`/api/invoices/${id}`, { tenantScoped: true, body }),
  send: (id: number) => apiClient.post(`/api/invoices/${id}/send`, { tenantScoped: true, body: {} }),
  pdf: (id: number) => apiClient.getBlob(`/api/invoices/${id}/pdf`, { tenantScoped: true }),
};

export const dashboardCalendarApi = {
  events: (start: string, end: string) =>
    apiClient.get<List<Record<string, unknown>>>(
      `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { tenantScoped: true },
    ),
  create: (body: Record<string, unknown>) => apiClient.post("/api/calendar/events", { tenantScoped: true, body }),
  sync: () => apiClient.post("/api/calendar/sync", { tenantScoped: true, body: {} }),
};

export const dashboardBookingsApi = {
  list: () => apiClient.get<List<Record<string, unknown>>>("/api/bookings", { tenantScoped: true }),
  create: (body: Record<string, unknown>) => apiClient.post("/api/bookings", { tenantScoped: true, body }),
  confirm: (id: number) => apiClient.put(`/api/bookings/${id}/confirm`, { tenantScoped: true, body: {} }),
  cancel: (id: number) => apiClient.put(`/api/bookings/${id}/cancel`, { tenantScoped: true, body: {} }),
};

export const dashboardSeoApi = {
  keywordOverview: (keyword: string) =>
    apiClient.post("/api/seo/keyword-overview", { tenantScoped: true, body: { keyword } }),
  domainOverview: (domain: string) =>
    apiClient.post("/api/seo/domain-overview", { tenantScoped: true, body: { domain } }),
  keywordIdeas: (keyword: string) =>
    apiClient.post("/api/seo/keyword-ideas", { tenantScoped: true, body: { keyword } }),
};

export const dashboardAiApi = {
  agents: () => apiClient.get<{ agents?: unknown[] }>("/api/ai/agents", { tenantScoped: true }),
  chatSimple: (message: string, history: { role: string; content: string }[] = []) =>
    apiClient.post<{ reply?: string; content?: string }>("/api/ai/chat/simple", {
      tenantScoped: true,
      body: { message, history, agent_type: "content_agent" },
    }),
  generateImage: (prompt: string) =>
    apiClient.post<{ url?: string; image_url?: string }>("/api/dalle/generate", {
      tenantScoped: true,
      body: { prompt },
    }),
  imageHistory: () => apiClient.get<{ items?: unknown[] }>("/api/dalle/history", { tenantScoped: true }),
  voiceSynth: (text: string) =>
    apiClient.post<{ audio_base64?: string }>("/api/voice/tts-base64", { tenantScoped: true, body: { text } }),
};

export const dashboardAffiliatesApi = {
  register: () => apiClient.post("/api/affiliates/register", { tenantScoped: true, body: {} }),
  stats: () => apiClient.get<Record<string, unknown>>("/api/affiliates/stats", { tenantScoped: true }),
  payouts: () => apiClient.get<{ payouts?: unknown[] }>("/api/affiliates/payouts", { tenantScoped: true }),
};

export const dashboardStorageApi = {
  listObjects: (bucket: string, prefix = "") =>
    apiClient.get<{ objects?: Record<string, unknown>[] }>(
      `/api/v1/storage/list-objects?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`,
      { tenantScoped: true },
    ),
  upload: (bucket: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", bucket);
    return apiClient.postMultipart("/api/v1/storage/upload", fd, { tenantScoped: true });
  },
  delete: (bucket: string, key: string) =>
    apiClient.delete(`/api/v1/storage/delete-object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`, {
      tenantScoped: true,
    }),
};

export const dashboardReportsApi = {
  crm: (start: string, end: string) =>
    apiClient.get(`/api/reports/crm?start_date=${start}&end_date=${end}`, { tenantScoped: true }),
  campaigns: (start: string, end: string) =>
    apiClient.get(`/api/reports/analytics?start_date=${start}&end_date=${end}`, { tenantScoped: true }),
  seo: (start: string, end: string) =>
    apiClient.get(`/api/reports/seo?start_date=${start}&end_date=${end}`, { tenantScoped: true }),
  helpdesk: (_start: string, _end: string) =>
    apiClient.get("/api/helpdesk/stats", { tenantScoped: true }),
  store: (start: string, end: string) =>
    apiClient.get(`/api/reports/full?start_date=${start}&end_date=${end}`, { tenantScoped: true }),
};

export const dashboardSmsApi = {
  stats: () => apiClient.get<Record<string, unknown>>("/api/sms/stats", { tenantScoped: true }),
  listCampaigns: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/sms/campaigns", { tenantScoped: true }),
  getCampaign: (id: string) => apiClient.get<Record<string, unknown>>(`/api/sms/campaigns/${id}`, { tenantScoped: true }),
  createCampaign: (body: Record<string, unknown>) =>
    apiClient.post("/api/sms/campaigns", { tenantScoped: true, body }),
  sendCampaign: (id: string, contact_ids: string[]) =>
    apiClient.post(`/api/sms/campaigns/${id}/send`, { tenantScoped: true, body: { contact_ids } }),
  send: (to_number: string, message: string) =>
    apiClient.post("/api/sms/send", { tenantScoped: true, body: { to_number, message } }),
};

export const dashboardVoiceCommandsApi = {
  history: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/voice-commands/history", { tenantScoped: true }),
  transcribe: (file: File) => {
    const fd = new FormData();
    fd.append("audio", file, file.name || "voice-command.webm");
    return apiClient.postMultipart<{
      transcript?: string;
      action?: Record<string, unknown>;
      response?: string;
      status?: string;
    }>("/api/voice-commands/transcribe", fd, { tenantScoped: true });
  },
};

export const dashboardSocialMonitoringApi = {
  dashboard: (refresh = false) =>
    apiClient.get<Record<string, unknown>>(`/api/social-monitoring/dashboard${refresh ? "?refresh=true" : ""}`, {
      tenantScoped: true,
    }),
  alerts: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/social-monitoring/alerts", { tenantScoped: true }),
  createAlert: (body: { keyword: string; platforms: string[]; notify_email?: string }) =>
    apiClient.post("/api/social-monitoring/alerts", { tenantScoped: true, body }),
  deleteAlert: (id: string) => apiClient.delete(`/api/social-monitoring/alerts/${id}`, { tenantScoped: true }),
  mentions: (params?: { alert_id?: string; sentiment?: string; platform?: string; since?: string }) => {
    const q = new URLSearchParams();
    if (params?.alert_id) q.set("alert_id", params.alert_id);
    if (params?.sentiment) q.set("sentiment", params.sentiment);
    if (params?.platform) q.set("platform", params.platform);
    if (params?.since) q.set("since", params.since);
    const qs = q.toString();
    return apiClient.get<{ items: Record<string, unknown>[] }>(
      `/api/social-monitoring/mentions${qs ? `?${qs}` : ""}`,
      { tenantScoped: true },
    );
  },
  handleMention: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/social-monitoring/mentions/${id}/handle`, {
      tenantScoped: true,
      body: {},
    }),
};

export const dashboardChatbotApi = {
  list: () =>
    apiClient.get<{ items: Record<string, unknown>[]; global_stats?: Record<string, unknown> }>(
      "/api/chatbot/",
      { tenantScoped: true },
    ),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/chatbot/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/chatbot/", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/chatbot/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete(`/api/chatbot/${id}`, { tenantScoped: true }),
  conversations: (id: string) =>
    apiClient.get<{ items: Record<string, unknown>[] }>(`/api/chatbot/${id}/conversations`, { tenantScoped: true }),
  conversation: (id: string, sessionId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/chatbot/${id}/conversations/${sessionId}`, { tenantScoped: true }),
  stats: (id: string) => apiClient.get<Record<string, unknown>>(`/api/chatbot/${id}/stats`, { tenantScoped: true }),
};

const WIDGET_CDN = "https://nelvyon-app-production.up.railway.app/static/widget.js";

export function chatbotEmbedSnippet(embedToken: string): string {
  return `<script src="${WIDGET_CDN}" data-token="${embedToken}"></script>`;
}

export const dashboardLmsApi = {
  list: () =>
    apiClient.get<{ items: Record<string, unknown>[]; workspace_stats?: Record<string, unknown> }>(
      "/api/lms/courses",
      { tenantScoped: true },
    ),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/lms/courses/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/lms/courses", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/lms/courses/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete(`/api/lms/courses/${id}`, { tenantScoped: true }),
  publish: (id: string) => apiClient.post<Record<string, unknown>>(`/api/lms/courses/${id}/publish`, { tenantScoped: true, body: {} }),
  stats: (id: string) => apiClient.get<Record<string, unknown>>(`/api/lms/courses/${id}/stats`, { tenantScoped: true }),
  enrollments: (id: string) =>
    apiClient.get<{ items: Record<string, unknown>[] }>(`/api/lms/courses/${id}/enrollments`, { tenantScoped: true }),
  addModule: (courseId: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/lms/courses/${courseId}/modules`, { tenantScoped: true, body }),
  addLesson: (moduleId: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/lms/modules/${moduleId}/lessons`, { tenantScoped: true, body }),
};

export const publicLmsApi = {
  catalog: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/lms/public/courses"),
  course: (id: string) => apiClient.get<Record<string, unknown>>(`/api/lms/public/courses/${id}`),
  enroll: (courseId: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/lms/courses/${courseId}/enroll`, { body }),
  progress: (courseId: string, email: string) =>
    apiClient.get<Record<string, unknown>>(`/api/lms/courses/${courseId}/progress/${encodeURIComponent(email)}`),
  completeLesson: (enrollmentId: string, lessonId: string) =>
    apiClient.post<Record<string, unknown>>(`/api/lms/progress/${enrollmentId}/lesson/${lessonId}`, { body: {} }),
  certificate: (enrollmentId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/lms/enrollments/${enrollmentId}/certificate`),
};

export const dashboardAbTestingApi = {
  list: () =>
    apiClient.get<{ items: Record<string, unknown>[] }>("/api/ab/experiments", { tenantScoped: true }),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/ab/experiments/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/ab/experiments", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/ab/experiments/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete(`/api/ab/experiments/${id}`, { tenantScoped: true }),
  start: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/ab/experiments/${id}/start`, { tenantScoped: true, body: {} }),
  pause: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/ab/experiments/${id}/pause`, { tenantScoped: true, body: {} }),
  end: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/ab/experiments/${id}/end`, { tenantScoped: true, body: {} }),
  results: (id: string) =>
    apiClient.get<Record<string, unknown>>(`/api/ab/experiments/${id}/results`, { tenantScoped: true }),
  declareWinner: (id: string, variantId: string) =>
    apiClient.post<Record<string, unknown>>(`/api/ab/experiments/${id}/winner`, {
      tenantScoped: true,
      body: { variant_id: variantId },
    }),
};

export const dashboardLoyaltyApi = {
  summary: () => apiClient.get<Record<string, unknown>>("/api/loyalty/summary", { tenantScoped: true }),
  list: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/loyalty/programs", { tenantScoped: true }),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/loyalty/programs/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/loyalty/programs", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/loyalty/programs/${id}`, { tenantScoped: true, body }),
  award: (id: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/loyalty/programs/${id}/award`, { tenantScoped: true, body }),
  redeem: (id: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/loyalty/programs/${id}/redeem`, { tenantScoped: true, body }),
  stats: (id: string) =>
    apiClient.get<Record<string, unknown>>(`/api/loyalty/programs/${id}/stats`, { tenantScoped: true }),
  leaderboard: (id: string) =>
    apiClient.get<{ items: Record<string, unknown>[] }>(`/api/loyalty/programs/${id}/leaderboard`, {
      tenantScoped: true,
    }),
};

export const dashboardWebinarsApi = {
  list: () =>
    apiClient.get<{ items: Record<string, unknown>[]; summary?: Record<string, unknown> }>(
      "/api/webinars",
      { tenantScoped: true },
    ),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/webinars/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/webinars", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/webinars/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete(`/api/webinars/${id}`, { tenantScoped: true }),
  publish: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/${id}/publish`, { tenantScoped: true, body: {} }),
  start: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/${id}/start`, { tenantScoped: true, body: {} }),
  end: (id: string, recording_url?: string) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/${id}/end`, {
      tenantScoped: true,
      body: { recording_url },
    }),
  reminder: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/${id}/reminder`, { tenantScoped: true, body: {} }),
  stats: (id: string) =>
    apiClient.get<Record<string, unknown>>(`/api/webinars/${id}/stats`, { tenantScoped: true }),
};

export const publicWebinarsApi = {
  list: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/webinars/public/list"),
  get: (slug: string) => apiClient.get<Record<string, unknown>>(`/api/webinars/public/${slug}`),
  register: (id: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/${id}/register`, { body }),
  chat: (slug: string, since?: string) =>
    apiClient.get<{ items: Record<string, unknown>[] }>(
      `/api/webinars/public/${slug}/chat${since ? `?since=${encodeURIComponent(since)}` : ""}`,
    ),
  sendChat: (slug: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/public/${slug}/chat`, { body }),
  join: (slug: string, email: string) =>
    apiClient.post<Record<string, unknown>>(`/api/webinars/public/${slug}/join`, { body: { email } }),
};

export const dashboardCdpApi = {
  stats: () => apiClient.get<Record<string, unknown>>("/api/cdp/stats", { tenantScoped: true }),
  profiles: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/cdp/profiles", { tenantScoped: true }),
  profile: (userId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/cdp/profiles/${encodeURIComponent(userId)}`, { tenantScoped: true }),
  events: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/cdp/events", { tenantScoped: true }),
  segments: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/cdp/segments", { tenantScoped: true }),
  createSegment: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/cdp/segments", { tenantScoped: true, body }),
  evaluateSegment: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/cdp/segments/${id}/evaluate`, { tenantScoped: true, body: {} }),
  syncSegment: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/cdp/segments/${id}/sync-crm`, { tenantScoped: true, body: {} }),
};

export const dashboardDialerApi = {
  stats: () => apiClient.get<Record<string, unknown>>("/api/dialer/stats", { tenantScoped: true }),
  history: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/dialer/calls", { tenantScoped: true }),
  call: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/dialer/call", { tenantScoped: true, body }),
  end: (sid: string) =>
    apiClient.post<Record<string, unknown>>(`/api/dialer/call/${sid}/end`, { tenantScoped: true, body: {} }),
  status: (sid: string) =>
    apiClient.get<Record<string, unknown>>(`/api/dialer/call/${sid}/status`, { tenantScoped: true }),
  transcribe: (sid: string) =>
    apiClient.post<Record<string, unknown>>(`/api/dialer/call/${sid}/transcribe`, { tenantScoped: true, body: {} }),
  log: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/dialer/calls/log", { tenantScoped: true, body }),
};

export const dashboardQrApi = {
  list: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/qr/list", { tenantScoped: true }),
  generate: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/qr/generate", { tenantScoped: true, body }),
  createDynamic: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/qr/dynamic", { tenantScoped: true, body }),
  updateDynamic: (id: string, destination_url: string) =>
    apiClient.put<Record<string, unknown>>(`/api/qr/dynamic/${id}`, {
      tenantScoped: true,
      body: { destination_url },
    }),
  stats: (id: string) => apiClient.get<Record<string, unknown>>(`/api/qr/${id}/stats`, { tenantScoped: true }),
};

export const dashboardFormsApi = {
  list: () => apiClient.get<{ items: Record<string, unknown>[] }>("/api/forms", { tenantScoped: true }),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/api/forms/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>("/api/forms", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<Record<string, unknown>>(`/api/forms/${id}`, { tenantScoped: true, body }),
  delete: (id: string) => apiClient.delete(`/api/forms/${id}`, { tenantScoped: true }),
  publish: (id: string) =>
    apiClient.post<Record<string, unknown>>(`/api/forms/${id}/publish`, { tenantScoped: true, body: {} }),
  responses: (id: string) =>
    apiClient.get<{ items: Record<string, unknown>[] }>(`/api/forms/${id}/responses`, { tenantScoped: true }),
  stats: (id: string) => apiClient.get<Record<string, unknown>>(`/api/forms/${id}/stats`, { tenantScoped: true }),
};

export const publicFormsApi = {
  get: (slug: string) => apiClient.get<Record<string, unknown>>(`/api/forms/public/${slug}`),
  submit: (id: string, body: Record<string, unknown>) =>
    apiClient.post<Record<string, unknown>>(`/api/forms/${id}/submit`, { body }),
};

export const dashboardSettingsApi = {
  apiKeys: () => apiClient.get<{ api_keys?: Record<string, unknown>[] }>("/api/developer/api-keys", { tenantScoped: true }),
  createApiKey: (name: string, scopes: string[]) =>
    apiClient.post("/api/developer/api-keys", { tenantScoped: true, body: { name, scopes } }),
  revokeApiKey: (id: string) => apiClient.delete(`/api/developer/api-keys/${id}`, { tenantScoped: true }),
  gdprRequests: () => apiClient.get<{ items?: unknown[] }>("/api/gdpr/deletions", { tenantScoped: true }),
  pushVapidKey: () => apiClient.get<{ publicKey?: string }>("/api/push/vapid-public-key", { tenantScoped: true }),
};

export function parseCampaignBlocks(raw: unknown): LandingBlock[] {
  if (Array.isArray(raw)) return raw as LandingBlock[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as LandingBlock[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
