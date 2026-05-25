export interface NelvyonSDKOptions {
  apiKey: string;
  workspaceId?: number | string;
  baseUrl?: string;
}

export interface ContactPayload {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ChatbotMessagePayload {
  chatbot_id: string;
  session_id?: string;
  message: string;
  visitor_info?: Record<string, unknown>;
}

export interface NelvyonSDKInstance {
  contacts: {
    create(payload: ContactPayload): Promise<{ contact: Record<string, unknown> }>;
    list(params?: { skip?: number; limit?: number; status?: string }): Promise<{
      items: Record<string, unknown>[];
      total: number;
    }>;
  };
  campaigns: {
    send(campaignId: number): Promise<Record<string, unknown>>;
  };
  chatbot: {
    message(payload: ChatbotMessagePayload): Promise<Record<string, unknown>>;
  };
  forms: {
    submit(
      formId: string,
      responses?: Record<string, unknown>,
      visitorInfo?: Record<string, unknown>,
    ): Promise<Record<string, unknown>>;
  };
  events: {
    track(event: string, properties?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  analytics: {
    summary(): Promise<Record<string, unknown>>;
  };
  workflows: {
    trigger(triggerType: string, triggerData?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
}

declare global {
  interface Window {
    NelvyonSDK: (opts: NelvyonSDKOptions) => NelvyonSDKInstance;
  }
}

export {};
