import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL, LlmClient } from "../os-agents/LlmClient";

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

export type ChatResult = {
  response: string;
  capturedLead?: { name?: string; email?: string };
  shouldEscalate?: boolean;
};

export type CapturedLead = {
  name?: string;
  email?: string;
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

export type ChatbotServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

const CHAT_TEMPERATURE = 0.7;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function readConfigJson(raw: unknown): {
  captureLeads: boolean;
  escalateKeywords: string[];
  allowBooking: boolean;
  theme: ChatbotTheme;
} {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const captureLeads = o.captureLeads === true;
  const allowBooking = o.allowBooking === true;
  const theme = o.theme === "light" ? "light" : "dark";
  const escalateKeywords = Array.isArray(o.escalateKeywords)
    ? o.escalateKeywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
    : [];
  return { captureLeads, escalateKeywords, allowBooking, theme };
}

function mapConfigRow(r: {
  id: string;
  user_id: string;
  name: string;
  greeting: string;
  system_prompt: string;
  config: unknown;
  primary_color: string;
  created_at: Date | string;
  updated_at: Date | string;
}): ChatbotConfig {
  const c = readConfigJson(r.config);
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    greeting: r.greeting,
    systemPrompt: r.system_prompt,
    captureLeads: c.captureLeads,
    escalateKeywords: c.escalateKeywords,
    primaryColor: r.primary_color,
    allowBooking: c.allowBooking,
    theme: c.theme,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function extractEmail(text: string): string | undefined {
  const m = EMAIL_RE.exec(text);
  return m ? m[0] : undefined;
}

function keywordEscalate(message: string, keywords: string[]): boolean {
  const low = message.toLowerCase();
  return keywords.some((k) => k.length > 0 && low.includes(k));
}

function parseChatJson(raw: string): { reply: string; capturedLead?: CapturedLead | null; shouldEscalate?: boolean } {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { reply: raw.trim() || "…" };
  }
  const o = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const reply =
    typeof o.reply === "string"
      ? o.reply
      : typeof o.response === "string"
        ? o.response
        : String(o.text ?? "…");
  let capturedLead: CapturedLead | undefined;
  if (o.capturedLead && typeof o.capturedLead === "object") {
    const cl = o.capturedLead as Record<string, unknown>;
    capturedLead = {
      name: typeof cl.name === "string" ? cl.name : undefined,
      email: typeof cl.email === "string" ? cl.email : undefined,
    };
  }
  const shouldEscalate = o.shouldEscalate === true;
  return { reply, capturedLead, shouldEscalate };
}

function lastPreview(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "";
  const t = last.content.trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function messagesJson(messages: ChatMessage[]): string {
  return JSON.stringify(messages);
}

export class ChatbotService {
  constructor(private readonly deps: ChatbotServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async createChatbot(userId: string, config: ChatbotConfigInput): Promise<ChatbotConfig> {
    const jsonb = {
      captureLeads: config.captureLeads,
      escalateKeywords: config.escalateKeywords,
      allowBooking: config.allowBooking,
      theme: config.theme ?? "dark",
    };
    const rows = await this.db.query<Parameters<typeof mapConfigRow>[0]>(
      `INSERT INTO chatbot_configs (user_id, name, greeting, system_prompt, config, primary_color, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         name = EXCLUDED.name,
         greeting = EXCLUDED.greeting,
         system_prompt = EXCLUDED.system_prompt,
         config = EXCLUDED.config,
         primary_color = EXCLUDED.primary_color,
         updated_at = NOW()
       RETURNING id::text, user_id::text, name, greeting, system_prompt, config, primary_color, created_at, updated_at`,
      [
        userId,
        config.name.trim(),
        config.greeting.trim(),
        config.systemPrompt.trim(),
        JSON.stringify(jsonb),
        config.primaryColor.trim() || "#6366f1",
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("createChatbot: no row");
    return mapConfigRow(r);
  }

  async getChatbot(userId: string): Promise<ChatbotConfig | null> {
    const rows = await this.db.query<Parameters<typeof mapConfigRow>[0]>(
      `SELECT id::text, user_id::text, name, greeting, system_prompt, config, primary_color, created_at, updated_at
       FROM chatbot_configs
       WHERE user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    return r ? mapConfigRow(r) : null;
  }

  async getChatbotById(chatbotId: string): Promise<ChatbotConfig | null> {
    const rows = await this.db.query<Parameters<typeof mapConfigRow>[0]>(
      `SELECT id::text, user_id::text, name, greeting, system_prompt, config, primary_color, created_at, updated_at
       FROM chatbot_configs
       WHERE id = $1::uuid
       LIMIT 1`,
      [chatbotId],
    );
    const r = rows[0];
    return r ? mapConfigRow(r) : null;
  }

  async chat(
    chatbotId: string,
    sessionId: string,
    message: string,
    history: ChatMessage[],
  ): Promise<ChatResult> {
    void sessionId;
    const bot = await this.getChatbotById(chatbotId);
    if (!bot) {
      throw new Error("chat: chatbot no encontrado");
    }

    const { captureLeads, escalateKeywords, allowBooking } = bot;
    const historyText = history
      .slice(-12)
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
      .join("\n");

    const prompt = `Eres el asistente web "${bot.name}".
Saludo configurado: ${bot.greeting}
Instrucciones del negocio:
${bot.systemPrompt}
${allowBooking ? "Puedes ofrecer agendar una cita si el visitante lo pide." : ""}
${captureLeads ? "Si el usuario comparte nombre o email, inclúyelos en capturedLead." : ""}
Palabras clave que activan escalación a humano (si el usuario las usa o pide hablar con persona): ${escalateKeywords.join(", ") || "(ninguna)"}

Historial reciente:
${historyText || "(vacío)"}

Nuevo mensaje del usuario:
${message}

Responde SOLO con JSON válido:
{
  "reply": "texto de respuesta al visitante",
  "capturedLead": null o { "name": "...", "email": "..." },
  "shouldEscalate": true/false si debe pasar a humano
}`;

    const raw = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: CHAT_TEMPERATURE,
    });

    const parsed = parseChatJson(raw);
    let response = parsed.reply || "…";
    let capturedLead = parsed.capturedLead;
    let shouldEscalate = parsed.shouldEscalate === true;

    if (keywordEscalate(message, escalateKeywords)) {
      shouldEscalate = true;
    }

    if (captureLeads) {
      const email = extractEmail(message) ?? (capturedLead?.email && EMAIL_RE.test(capturedLead.email) ? capturedLead.email : undefined);
      if (email) {
        capturedLead = { ...capturedLead, email };
      }
    } else {
      capturedLead = undefined;
    }

    const out: ChatResult = { response };
    if (capturedLead && (capturedLead.email || capturedLead.name)) {
      out.capturedLead = capturedLead;
    }
    if (shouldEscalate) out.shouldEscalate = true;
    return out;
  }

  async saveConversation(
    chatbotId: string,
    sessionId: string,
    messages: ChatMessage[],
    extras?: { capturedLead?: CapturedLead; shouldEscalate?: boolean },
  ): Promise<void> {
    const bot = await this.getChatbotById(chatbotId);
    let mergedLead: CapturedLead | null =
      extras?.capturedLead && (extras.capturedLead.email || extras.capturedLead.name)
        ? { ...extras.capturedLead }
        : null;

    if (bot?.captureLeads) {
      for (const m of messages) {
        if (m.role !== "user") continue;
        const email = extractEmail(m.content);
        if (email) mergedLead = { ...mergedLead, email };
      }
    }

    let escalated = extras?.shouldEscalate === true;
    if (bot) {
      for (const m of messages) {
        if (m.role === "user" && keywordEscalate(m.content, bot.escalateKeywords)) escalated = true;
      }
    }

    const leadJson = mergedLead && (mergedLead.email || mergedLead.name) ? JSON.stringify(mergedLead) : null;

    await this.db.query(
      `INSERT INTO chatbot_conversations (chatbot_id, session_id, messages, captured_lead, escalated)
       VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5)
       ON CONFLICT (chatbot_id, session_id) DO UPDATE SET
         messages = EXCLUDED.messages,
         captured_lead = CASE
           WHEN EXCLUDED.captured_lead IS NOT NULL THEN EXCLUDED.captured_lead
           ELSE chatbot_conversations.captured_lead
         END,
         escalated = chatbot_conversations.escalated OR EXCLUDED.escalated`,
      [chatbotId, sessionId, messagesJson(messages), leadJson, escalated],
    );
  }

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await this.db.query<{
      id: string;
      chatbot_id: string;
      session_id: string;
      messages: ChatMessage[];
      captured_lead: unknown;
      escalated: boolean;
      created_at: Date | string;
    }>(
      `SELECT c.id::text, c.chatbot_id::text, c.session_id, c.messages, c.captured_lead, c.escalated, c.created_at
       FROM chatbot_conversations c
       INNER JOIN chatbot_configs cfg ON cfg.id = c.chatbot_id
       WHERE cfg.user_id = $1::uuid
       ORDER BY c.created_at DESC
       LIMIT 200`,
      [userId],
    );

    return rows.map((r) => {
      const msgs = Array.isArray(r.messages) ? r.messages : [];
      const hasLead = r.captured_lead != null && typeof r.captured_lead === "object" && Object.keys(r.captured_lead as object).length > 0;
      return {
        id: r.id,
        chatbotId: r.chatbot_id,
        sessionId: r.session_id,
        preview: lastPreview(msgs as ChatMessage[]),
        hasLead,
        escalated: r.escalated,
        createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
      };
    });
  }

  async getStats(userId: string): Promise<ChatbotStats> {
    const agg = await this.db.query<{
      total: string;
      leads: string;
      esc: string;
      msg_sum: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (
           WHERE captured_lead IS NOT NULL AND captured_lead <> '{}'::jsonb
         )::text AS leads,
         COUNT(*) FILTER (WHERE escalated = true)::text AS esc,
         COALESCE(SUM(jsonb_array_length(messages)), 0)::text AS msg_sum
       FROM chatbot_conversations c
       INNER JOIN chatbot_configs cfg ON cfg.id = c.chatbot_id
       WHERE cfg.user_id = $1::uuid`,
      [userId],
    );
    const a = agg[0] ?? { total: "0", leads: "0", esc: "0", msg_sum: "0" };
    const total = Number(a.total) || 0;
    const msgSum = Number(a.msg_sum) || 0;
    return {
      totalConversations: total,
      leadsCaptured: Number(a.leads) || 0,
      escalations: Number(a.esc) || 0,
      avgMessagesPerConversation: total > 0 ? msgSum / total : 0,
    };
  }

  async generateEmbedCode(chatbotId: string, appOrigin: string): Promise<string> {
    const origin = appOrigin.replace(/\/$/, "");
    const bot = await this.getChatbotById(chatbotId);
    const color = bot?.primaryColor?.trim() || "#6366f1";
    return `<!-- Nelvyon Chatbot -->
<div id="nelvyon-chatbot-mount" data-chatbot-id="${chatbotId}"></div>
<script>
(function(){
  var id="${chatbotId}";
  var origin="${origin}";
  var accent="${color.replace(/"/g, "")}";
  var sid=sessionStorage.getItem("nelvyon_sid")||(crypto.randomUUID&&crypto.randomUUID())||("s"+Date.now());
  sessionStorage.setItem("nelvyon_sid",sid);
  var root=document.getElementById("nelvyon-chatbot-mount");
  if(!root)return;
  var btn=document.createElement("button");
  btn.textContent="Chat";
  btn.setAttribute("aria-label","Abrir chat");
  Object.assign(btn.style,{position:"fixed",bottom:"20px",right:"20px",zIndex:"99999",padding:"12px 16px",borderRadius:"9999px",border:"none",cursor:"pointer",fontWeight:"600",background:accent,color:"#fff",boxShadow:"0 4px 24px rgba(0,0,0,.25)"});
  var panel=document.createElement("div");
  Object.assign(panel.style,{display:"none",position:"fixed",bottom:"80px",right:"20px",width:"min(380px,92vw)",height:"480px",zIndex:"99998",background:"#0f172a",color:"#e2e8f0",borderRadius:"12px",boxShadow:"0 8px 40px rgba(0,0,0,.4)",flexDirection:"column",overflow:"hidden",border:"1px solid #334155"});
  var log=document.createElement("div");
  Object.assign(log.style,{flex:"1",overflowY:"auto",padding:"12px",fontSize:"14px",lineHeight:"1.4"});
  var inputRow=document.createElement("div");
  Object.assign(inputRow.style,{display:"flex",gap:"8px",padding:"10px",borderTop:"1px solid #334155"});
  var inp=document.createElement("input");
  inp.type="text";
  inp.placeholder="Escribe un mensaje…";
  Object.assign(inp.style,{flex:"1",padding:"8px 10px",borderRadius:"8px",border:"1px solid #475569",background:"#1e293b",color:"#f8fafc"});
  var send=document.createElement("button");
  send.textContent="Enviar";
  Object.assign(send.style,{padding:"8px 12px",borderRadius:"8px",border:"none",background:accent,color:"#fff",cursor:"pointer"});
  var hist=[];
  function append(role,text){
    var d=document.createElement("div");
    d.textContent=(role==="user"?"Tú: ":"Bot: ")+text;
    d.style.marginBottom="8px";
    log.appendChild(d);
    log.scrollTop=log.scrollHeight;
  }
  btn.onclick=function(){
    panel.style.display=panel.style.display==="none"?"flex":"none";
  };
  function post(msg){
    if(!msg.trim())return;
    append("user",msg);
    hist.push({role:"user",content:msg});
    fetch(origin+"/api/saas/chatbot/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chatbotId:id,sessionId:sid,message:msg,history:hist.slice(0,-1)})})
      .then(function(r){return r.json();})
      .then(function(data){
        var reply=data.response||"";
        append("assistant",reply);
        hist.push({role:"assistant",content:reply});
      })
      .catch(function(){append("assistant","Error de conexión.");});
  }
  send.onclick=function(){post(inp.value);inp.value="";}
  inp.addEventListener("keydown",function(e){if(e.key==="Enter"){post(inp.value);inp.value="";}});
  inputRow.appendChild(inp);inputRow.appendChild(send);
  panel.appendChild(log);panel.appendChild(inputRow);
  document.body.appendChild(btn);document.body.appendChild(panel);
})();
</script>`;
  }
}

let cachedChatbotService: ChatbotService | undefined;

export function getChatbotService(): ChatbotService {
  if (!cachedChatbotService) cachedChatbotService = new ChatbotService();
  return cachedChatbotService;
}

export function resetChatbotServiceForTests(): void {
  cachedChatbotService = undefined;
}
