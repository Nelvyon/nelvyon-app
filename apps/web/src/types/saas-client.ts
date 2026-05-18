/** Client-safe SaaS DTOs (keep in sync with backend/saas/*Service.ts). */

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type CreateInvoiceInput = {
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: InvoiceItemInput[];
  currency: string;
  dueDate: string;
  notes?: string;
  logoUrl?: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

export type InvoiceRecord = {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string | null;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  dueDate: string;
  notes: string | null;
  logoUrl: string | null;
  status: InvoiceStatus;
  paymentToken: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paidMethod: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceStats = {
  totalInvoiced: number;
  paid: number;
  pending: number;
  overdue: number;
  averagePaymentDays: number;
};

export type ChatbotTheme = "dark" | "light";

export type ChatbotConfigInput = {
  name: string;
  greeting: string;
  systemPrompt: string;
  captureLeads: boolean;
  escalateKeywords: string[];
  primaryColor: string;
  allowBooking: boolean;
  theme?: ChatbotTheme;
};

export type ChatbotConfig = ChatbotConfigInput & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationSummary = {
  id: string;
  chatbotId: string;
  sessionId: string;
  preview: string;
  hasLead: boolean;
  escalated: boolean;
  createdAt: string;
};

export type ChatbotStats = {
  totalConversations: number;
  leadsCaptured: number;
  escalations: number;
  avgMessagesPerConversation: number;
};

export type TranscriptionContext = "meeting" | "podcast" | "interview" | "lecture" | "call";

export type AnalysisResult = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  speakers?: string[];
  sentiment: "positive" | "neutral" | "negative";
  duration_estimate: string;
  topics: string[];
};

export type TranscriptionRecord = {
  id: string;
  userId: string;
  audioUrl: string;
  language: string | null;
  context: TranscriptionContext;
  transcriptText: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  topics: string[];
  sentiment: string;
  durationEstimate: string;
  createdAt: string;
};

export type TranscriptionListItem = {
  id: string;
  context: TranscriptionContext;
  durationEstimate: string;
  preview: string;
  createdAt: string;
};

export type HeatmapPoint = {
  x: number;
  y: number;
  value: number;
};

export type SessionRow = {
  id: string;
  siteId: string;
  sessionId: string;
  userAgent: string | null;
  device: string;
  page: string | null;
  referrer: string | null;
  duration: number;
  scrollDepth: number;
  pagesViewed: number;
  hasRageClick: boolean;
  createdAt: string;
};

export type FunnelStepResult = {
  page: string;
  sessions: number;
  dropoffRate: number;
};

export type FunnelAnalysis = {
  steps: FunnelStepResult[];
  overallConversion: number;
};

export type AIAnalysisResult = {
  insights: string[];
  criticalIssues: string[];
  recommendations: string[];
  priorityScore: number;
};

export type HeatmapAlert = {
  id: string;
  siteId: string;
  userId: string;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
};

export type SiteConfig = {
  id: string;
  userId: string;
  domain: string;
  siteId: string;
  trackingScript: string;
  createdAt: string;
};
