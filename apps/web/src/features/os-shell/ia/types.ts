export interface OsIaClientSummary {
  clientId: number;
  businessName: string;
  projectCount: number;
  openDeals: number;
  pendingTasks: number;
  summary: string;
}

export interface OsIaProjectSummary {
  projectId: number;
  name: string;
  clientName: string;
  status: string;
  outputCount: number;
  pendingOutputs: number;
  summary: string;
}

export interface OsIaDeliverySummary {
  outputId: number;
  title: string;
  qaStatus: string;
  summary: string;
}

export interface OsIaSuggestedTask {
  title: string;
  reason: string;
  clientId?: number;
  projectId?: number;
  priority: "alta" | "media" | "baja";
}

export interface OsIaBlocker {
  severity: "alta" | "media";
  label: string;
  detail: string;
  href?: string;
}

export interface OsIaInsights {
  clientSummaries: OsIaClientSummary[];
  projectSummaries: OsIaProjectSummary[];
  deliverySummaries: OsIaDeliverySummary[];
  suggestedTasks: OsIaSuggestedTask[];
  blockers: OsIaBlocker[];
  hasData: boolean;
}
