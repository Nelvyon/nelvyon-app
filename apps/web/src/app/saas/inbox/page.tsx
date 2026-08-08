"use client";

/**
 * /saas/inbox sobre las pantallas `email-inbox` y `email-read` de la plantilla
 * oficial W3CRM (`src/app/(email)/email-inbox/page.jsx` y `email-read/page.jsx`).
 *
 * Marcado y clases de la plantilla, tal cual: `container-fluid p-0` >
 * `row gx-0` > `card mb-0 h-auto` > `card-body py-0 pe-0`; panel izquierdo
 * `email-left-box dlab-scroll` con `mail-list rounded` y `list-group-item`;
 * panel derecho `email-right-box` con `Tab.Container`, `toolbar`, `nav-pills`,
 * `mail-tools`, `email-list` > `message` > `message-single` / `col-mail
 * col-mail-2` (`hader`, `subject`, `date`) y la paginacion
 * `dataTables_paginate paging_simple_numbers`.
 *
 * Dentro va la logica REAL de NELVYON sin cambios: los 11 endpoints, vistas de
 * conversaciones e hilos, filtros de canal y SLA, busqueda, agente IA con sus
 * skills, sugerencia de respuesta, envio, asignacion y cierre.
 */
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Nav, Tab } from "react-bootstrap";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

type Channel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "chat";
type Priority = "low" | "normal" | "high" | "urgent";

interface Conversation {
  id: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channel: Channel;
  status: string;
  priority: Priority;
  assignedTo: string | null;
  threadId: string | null;
  subject: string | null;
  firstResponseAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiMessage {
  id: string;
  direction: "inbound" | "outbound";
  channel: string | null;
  body: string;
  status: string;
  createdAt: string;
}

interface Thread {
  threadId: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channels: Channel[];
  conversationCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasBreached: boolean;
  earliestSlaDue: string | null;
}

interface TeamMember { id: string; name: string | null; email: string; role: string; status: string; }

const CH: Record<Channel, { label: string; icono: string }> = {
  email: { label: "Email", icono: "fa-regular fa-envelope" },
  sms: { label: "SMS", icono: "fa-regular fa-comment" },
  whatsapp: { label: "WhatsApp", icono: "fa-brands fa-whatsapp" },
  instagram: { label: "Instagram", icono: "fa-brands fa-instagram" },
  facebook: { label: "Facebook", icono: "fa-brands fa-facebook" },
  chat: { label: "Chat", icono: "fa-regular fa-comments" },
};

/** Tonos de badge de W3CRM para la prioridad. */
const PRIORITY_BADGE: Record<Priority, string> = {
  low: "badge-secondary",
  normal: "badge-primary",
  high: "badge-warning",
  urgent: "badge-danger",
};

const REGISTROS_POR_PAGINA = 15;

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "ahora";
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Mismo criterio de SLA que la version anterior, con badges de la plantilla. */
function slaTone(conv: Conversation): string {
  if (conv.slaBreached) return "badge-danger";
  if (!conv.slaDueAt) return "badge-secondary";
  const diff = new Date(conv.slaDueAt).getTime() - Date.now();
  if (diff < 0) return "badge-danger";
  if (diff < 30 * 60_000) return "badge-warning";
  return "badge-success";
}

function slaLabel(conv: Conversation): string {
  if (conv.slaBreached) return "SLA vencido";
  if (!conv.slaDueAt) return "";
  const diff = new Date(conv.slaDueAt).getTime() - Date.now();
  if (diff < 0) return "SLA vencido";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `SLA ${mins}m`;
  return `SLA ${Math.floor(mins / 60)}h`;
}

export default function SaasInboxPage() {
  const [view, setView] = useState<"conversations" | "threads">("conversations");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyInfo, setReplyInfo] = useState<{ dispatched: boolean; error?: string } | null>(null);
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");
  const [filterSla, setFilterSla] = useState(false);
  const [search, setSearch] = useState("");

  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentAuto, setAgentAuto] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [skills, setSkills] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // KPI counters
  const totalOpen = convs.filter(c => c.status === "open").length;
  const totalAtRisk = convs.filter(c => c.status === "open" && (!c.firstResponseAt) && c.slaDueAt && new Date(c.slaDueAt).getTime() - Date.now() < 30 * 60_000).length;
  const totalBreached = convs.filter(c => c.slaBreached).length;

  const loadConvs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterSla ? "/api/saas/inbox?sla=at_risk" : "/api/saas/inbox";
      const [convsRes, membersRes] = await Promise.all([
        fetch(url),
        fetch("/api/saas/team"),
      ]);
      if (!convsRes.ok) throw new Error(`Error ${convsRes.status}`);
      const d = await convsRes.json() as { conversations?: Conversation[] };
      setConvs(d.conversations ?? []);
      if (membersRes.ok) {
        const md = await membersRes.json() as { members?: TeamMember[] };
        setMembers(md.members ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [filterSla]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/inbox?view=threads");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json() as { threads?: Thread[] };
      setThreads(d.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [agentRes, skillsRes] = await Promise.all([
          fetch("/api/saas/inbox/agent"),
          fetch("/api/saas/agent/skills"),
        ]);
        if (agentRes.ok) {
          const d = (await agentRes.json()) as { settings?: { enabled?: boolean; autoReplyEnabled?: boolean } };
          setAgentEnabled(!!d.settings?.enabled);
          setAgentAuto(!!d.settings?.autoReplyEnabled);
        }
        if (skillsRes.ok) {
          const sd = (await skillsRes.json()) as { skills?: Array<{ id: string; name: string; description: string }> };
          setSkills(sd.skills ?? []);
        }
      } catch { /* optional */ }
    })();
  }, []);

  useEffect(() => {
    if (view === "conversations") void loadConvs();
    else void loadThreads();
  }, [view, loadConvs, loadThreads]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setCurrentPage(1); }, [view, filterChannel, filterSla, search]);

  async function selectConv(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    setReplyInfo(null);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/saas/inbox/${conv.id}/messages`);
      if (res.ok) {
        const d = await res.json() as { messages?: ApiMessage[] };
        setMessages(d.messages ?? []);
      }
    } finally {
      setLoadingMsgs(false);
    }
    // mark read locally
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
  }

  async function suggestAiReply() {
    if (!selected) return;
    setAgentLoading(true);
    setAiHint(null);
    try {
      const res = await fetch(`/api/saas/inbox/${selected.id}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setAiHint(err.error ?? "Activa el agente en Ajustes");
        return;
      }
      const d = (await res.json()) as { suggestion?: string; skillName?: string; mock?: boolean };
      if (d.suggestion) {
        setReply(d.suggestion);
        setAiHint(`✦ ${d.skillName ?? "Agente"}${d.mock ? " (modo ahorro)" : ""}`);
      }
    } finally {
      setAgentLoading(false);
    }
  }

  async function toggleAgent(enabled: boolean) {
    setAgentEnabled(enabled);
    await fetch("/api/saas/inbox/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, autoReplyEnabled: agentAuto }),
    }).catch(() => null);
  }

  async function toggleAgentAuto(autoReplyEnabled: boolean) {
    setAgentAuto(autoReplyEnabled);
    await fetch("/api/saas/inbox/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: agentEnabled, autoReplyEnabled }),
    }).catch(() => null);
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    const body = reply.trim();
    setReply("");
    setReplyInfo(null);
    // optimistic
    const optMsg: ApiMessage = {
      id: `opt-${Date.now()}`, direction: "outbound", channel: selected.channel,
      body, status: "sent", createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);
    try {
      const res = await fetch(`/api/saas/inbox/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({})) as { channel_dispatched?: boolean; channel_error?: string };
      setReplyInfo({ dispatched: data.channel_dispatched ?? false, error: data.channel_error ?? undefined });
    } catch { /* optimistic already applied */ }
  }

  async function closeConv(id: string) {
    await fetch(`/api/saas/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setConvs(prev => prev.map(c => c.id === id ? { ...c, status: "closed" } : c));
    if (selected?.id === id) setSelected(s => s ? { ...s, status: "closed" } : s);
  }

  async function assignMember(memberId: string | null) {
    if (!selected) return;
    const res = await fetch(`/api/saas/inbox/${selected.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId }),
    });
    if (res.ok) {
      const d = await res.json() as { conversation?: Conversation };
      if (d.conversation) {
        setConvs(prev => prev.map(c => c.id === selected.id ? d.conversation! : c));
        setSelected(d.conversation);
      }
    }
  }

  const filtered = convs.filter(c => {
    if (filterChannel !== "all" && c.channel !== filterChannel) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.contactName?.toLowerCase().includes(q) && !c.lastMessage?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const displayName = (c: Conversation) => c.contactName ?? c.contactEmail ?? c.contactPhone ?? "Desconocido";

  // Paginacion de la plantilla (recordsPage / prePage / changeCPage / nextPage).
  const listado: Array<Conversation | Thread> = view === "conversations" ? filtered : threads;
  const lastIndex = currentPage * REGISTROS_POR_PAGINA;
  const firstIndex = lastIndex - REGISTROS_POR_PAGINA;
  const records = listado.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(listado.length / REGISTROS_POR_PAGINA));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function changeCPage(id: number) { setCurrentPage(id); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Bandeja unificada" parentTitle="SaaS" pageTitle="Bandeja unificada" />
      <Fragment>
        <div className="container-fluid p-0">
          <div className="row gx-0">
            <div className="col-lg-12">
              <div className="card mb-0 h-auto">
                <div className="card-body py-0 pe-0">
                  <div className="row gx-0">
                    <div className="col-xl-2 col-xxl-3 col-lg-3">
                      <div className="email-left-box dlab-scroll pt-3 ps-0">
                        <div className="p-0">
                          <Link
                            href="#"
                            scroll={false}
                            className={`btn text-white btn-block ${filterSla ? "active" : ""}`}
                            onClick={(e) => { e.preventDefault(); setFilterSla(v => !v); }}
                          >
                            <i className="fa-solid fa-bolt me-2"></i>
                            {filterSla ? "Ver todo" : "Solo SLA en riesgo"}
                          </Link>
                        </div>
                        <div className="mail-list rounded">
                          <Link
                            href="#"
                            scroll={false}
                            className={`list-group-item ${view === "conversations" && filterChannel === "all" ? "active" : ""}`}
                            onClick={(e) => { e.preventDefault(); setView("conversations"); setFilterChannel("all"); }}
                          >
                            <i className="fa-regular fa-envelope align-middle"></i>
                            Conversaciones
                            <span className="badge badge-purple badge-sm float-end rounded">{totalOpen}</span>
                          </Link>
                          <Link
                            href="#"
                            scroll={false}
                            className={`list-group-item ${view === "threads" ? "active" : ""}`}
                            onClick={(e) => { e.preventDefault(); setView("threads"); }}
                          >
                            <i className="fa-regular fa-comments align-middle"></i>
                            Hilos por contacto
                          </Link>
                          {(Object.keys(CH) as Channel[]).map((ch) => (
                            <Link
                              key={ch}
                              href="#"
                              scroll={false}
                              className={`list-group-item ${view === "conversations" && filterChannel === ch ? "active" : ""}`}
                              onClick={(e) => { e.preventDefault(); setView("conversations"); setFilterChannel(ch); }}
                            >
                              <i className={`${CH[ch].icono} align-middle`}></i>
                              {" "}{CH[ch].label}
                            </Link>
                          ))}
                        </div>
                        <div className="mail-list rounded overflow-hidden mt-4">
                          <div className="intro-title d-flex justify-content-between my-0">
                            <h5>Agente IA</h5>
                          </div>
                          <div className="list-group-item">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="agente-activo"
                                checked={agentEnabled}
                                onChange={(e) => void toggleAgent(e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor="agente-activo">Activado</label>
                            </div>
                          </div>
                          <div className="list-group-item">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="agente-auto"
                                checked={agentAuto}
                                onChange={(e) => void toggleAgentAuto(e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor="agente-auto">Respuesta automática</label>
                            </div>
                          </div>
                          <Link
                            href="#"
                            scroll={false}
                            className="list-group-item change"
                            onClick={(e) => { e.preventDefault(); setSkillsOpen(v => !v); }}
                          >
                            Skills ({skills.length})
                          </Link>
                          {skillsOpen && skills.map((s) => (
                            <span className="list-group-item" key={s.id}>
                              <strong>{s.name}</strong>
                              <span className="d-block text-muted fs-13">{s.description}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-10 col-xxl-9 col-lg-9">
                      <div className="email-right-box">
                        <Tab.Container defaultActiveKey="Bandeja">
                          <div role="toolbar" className="toolbar ms-1 ms-sm-0">
                            <div className="saprat">
                              <div className="d-flex align-items-center">
                                <Nav as="ul" className="nav nav-pills" role="tablist">
                                  <Nav.Item as="li" className="nav-item btn-group" role="presentation">
                                    <Nav.Link as="button" type="button" className="btn effect mx-2 nav-link" eventKey="Bandeja">
                                      Abiertas {totalOpen}
                                    </Nav.Link>
                                  </Nav.Item>
                                  <Nav.Item as="li" className="nav-item btn-group" role="presentation">
                                    <Nav.Link as="button" type="button" className="btn effect mx-2 nav-link" eventKey="Riesgo">
                                      En riesgo {totalAtRisk}
                                    </Nav.Link>
                                  </Nav.Item>
                                  <Nav.Item as="li" className="nav-item btn-group" role="presentation">
                                    <Nav.Link as="button" type="button" className="btn effect mx-2 nav-link" eventKey="Vencidas">
                                      SLA vencido {totalBreached}
                                    </Nav.Link>
                                  </Nav.Item>
                                </Nav>
                              </div>
                              <div className="mail-tools d-flex align-items-center">
                                <input
                                  className="form-control me-2"
                                  style={{ minWidth: 200 }}
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  placeholder="Buscar…"
                                  aria-label="Buscar en la bandeja"
                                />
                              </div>
                            </div>
                          </div>

                          <Tab.Content>
                            {error && <div className="alert alert-danger m-3">{error}</div>}
                            {loading ? (
                              <div className="d-flex align-items-center justify-content-center py-5" role="status">
                                <div className="spinner-border text-primary me-3" aria-hidden="true" />
                                <span className="text-muted">Cargando…</span>
                              </div>
                            ) : listado.length === 0 ? (
                              <div className="text-center py-5">
                                <h5 className="mb-1">Sin conversaciones</h5>
                                <p className="mb-0 text-muted fs-14">Cuando lleguen mensajes aparecerán aquí.</p>
                              </div>
                            ) : (
                              <div className="email-list">
                                {view === "conversations"
                                  ? (records as Conversation[]).map((c) => (
                                    <div className="message" key={c.id}>
                                      <div>
                                        <div className="d-flex message-single">
                                          <div className="ps-1 align-self-center">
                                            <span className={`badge light border-0 ${PRIORITY_BADGE[c.priority]}`}>
                                              {c.priority}
                                            </span>
                                          </div>
                                          <div className="ms-2">
                                            <i className={`${CH[c.channel].icono} align-middle`} title={CH[c.channel].label}></i>
                                          </div>
                                        </div>
                                        <Link
                                          href="#"
                                          scroll={false}
                                          className="col-mail col-mail-2"
                                          onClick={(e) => { e.preventDefault(); void selectConv(c); }}
                                        >
                                          <div className="hader">
                                            {displayName(c)}
                                            {c.unreadCount > 0 && (
                                              <span className="badge badge-purple badge-sm ms-2 rounded">{c.unreadCount}</span>
                                            )}
                                          </div>
                                          <div className="subject">
                                            {c.subject ?? CH[c.channel].label}
                                            <span> {c.lastMessage ?? ""}</span>
                                          </div>
                                          <div className="date">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</div>
                                        </Link>
                                        <div className="icon d-flex align-items-center">
                                          {slaLabel(c) && (
                                            <span className={`badge light border-0 ${slaTone(c)} me-2`}>{slaLabel(c)}</span>
                                          )}
                                          {c.status === "open" && (
                                            <Link
                                              href="#"
                                              scroll={false}
                                              className="ms-2"
                                              title="Cerrar conversación"
                                              onClick={(e) => { e.preventDefault(); void closeConv(c.id); }}
                                            >
                                              <i className="fa-regular fa-circle-check"></i>
                                            </Link>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                  : (records as Thread[]).map((t) => (
                                    <div className="message" key={t.threadId}>
                                      <div>
                                        <div className="d-flex message-single">
                                          <div className="ps-1 align-self-center">
                                            <span className="badge light border-0 badge-primary">{t.conversationCount}</span>
                                          </div>
                                        </div>
                                        <span className="col-mail col-mail-2">
                                          <div className="hader">{t.contactName ?? t.contactEmail ?? t.contactPhone ?? "Desconocido"}</div>
                                          <div className="subject">
                                            {t.channels.map((ch) => CH[ch].label).join(" · ")}
                                            <span> {t.lastMessage ?? ""}</span>
                                          </div>
                                          <div className="date">{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ""}</div>
                                        </span>
                                        <div className="icon">
                                          {t.hasBreached && <span className="badge light border-0 badge-danger">SLA vencido</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </Tab.Content>

                          {/* `gx-0` (unico anadido a la plantilla): el `card-body pe-0`
                              no absorbe el gutter negativo de esta `row` y sobresalian
                              12px por la derecha en todos los anchos. */}
                          <div className="row gx-0">
                            <div className="col-12 ps-3">
                              <div className="d-sm-flex text-center justify-content-between align-items-center">
                                <div className="dataTables_info">
                                  Mostrando {listado.length === 0 ? 0 : firstIndex + 1} a {Math.min(lastIndex, listado.length)} de {listado.length}
                                </div>
                                <div
                                  className="dataTables_paginate paging_simple_numbers justify-content-center"
                                  id="inbox_paginate"
                                >
                                  <Link
                                    className={`paginate_button previous ${currentPage === 1 ? "disabled" : ""}`}
                                    href="#" scroll={false}
                                    onClick={(e) => { e.preventDefault(); prePage(); }}
                                  >
                                    <i className="fa-solid fa-angle-left" />
                                  </Link>
                                  <span>
                                    {number.map((n) => (
                                      <Link
                                        href="#" scroll={false} key={n}
                                        className={`paginate_button ${currentPage === n ? "current" : ""} `}
                                        onClick={(e) => { e.preventDefault(); changeCPage(n); }}
                                      >
                                        {n}
                                      </Link>
                                    ))}
                                  </span>
                                  <Link
                                    className={`paginate_button next ${currentPage === npage ? "disabled" : ""}`}
                                    href="#" scroll={false}
                                    onClick={(e) => { e.preventDefault(); nextPage(); }}
                                  >
                                    <i className="fa-solid fa-angle-right" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Tab.Container>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lectura del hilo — pantalla `email-read` de W3CRM
            (`app/(email)/email-read/page.jsx`): `card h-auto` > `card-body` >
            `row gx-0` > `email-right-box` con `toolbar`/`saprat`/`mail-tools`,
            `right-box-padding border-start p-0` > `read-wapper dz-scroll` >
            `read-content` con `media`, `read-content-body` y el `textarea` +
            boton `text-end`. */}
        {selected && (
          <div className="container-fluid p-0">
            <div className="row gx-0">
              <div className="col-xl-12">
                <div className="card h-auto">
                  <div className="card-body">
                    <div className="row gx-0">
                      <div className="col-12">
                        <div className="email-right-box">
                          <div role="toolbar" className="toolbar ms-1 ms-sm-0">
                            <div className="saprat ps-3">
                              <div className="mail-tools ms-0 d-flex align-items-center">
                                <select
                                  className="form-control me-2"
                                  style={{ maxWidth: 220 }}
                                  value={selected.assignedTo ?? ""}
                                  onChange={(e) => void assignMember(e.target.value || null)}
                                  aria-label="Asignar a"
                                >
                                  <option value="">Sin asignar</option>
                                  {members.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                                  ))}
                                </select>
                                {selected.status === "open" && (
                                  <Link
                                    href="#" scroll={false}
                                    className="btn btn-primary px-3 light me-2"
                                    title="Cerrar conversación"
                                    onClick={(e) => { e.preventDefault(); void closeConv(selected.id); }}
                                  >
                                    <i className="fa-regular fa-circle-check"></i>
                                  </Link>
                                )}
                                <Link
                                  href="#" scroll={false}
                                  className="btn btn-primary px-3 light"
                                  title="Cerrar panel"
                                  onClick={(e) => { e.preventDefault(); setSelected(null); }}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </Link>
                              </div>
                            </div>
                          </div>
                          <div className="row gx-0">
                            <div className="col-12">
                              <div className="right-box-padding border-start p-0">
                                <div className="read-wapper dz-scroll" id="read-content">
                                  <div className="read-content">
                                    <div className="media pt-3 d-sm-flex d-block justify-content-between">
                                      <div className="clearfix mb-3 d-flex">
                                        <div className="media-body me-2">
                                          <h5 className="text-primary mb-0 mt-1">{displayName(selected)}</h5>
                                          <p className="mb-0">
                                            {CH[selected.channel].label}
                                            {selected.lastMessageAt ? ` · ${timeAgo(selected.lastMessageAt)}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="clearfix mb-3">
                                        <span className={`badge light border-0 ${PRIORITY_BADGE[selected.priority]} me-2`}>
                                          {selected.priority}
                                        </span>
                                        {slaLabel(selected) && (
                                          <span className={`badge light border-0 ${slaTone(selected)}`}>{slaLabel(selected)}</span>
                                        )}
                                      </div>
                                    </div>
                                    <hr />
                                    <div className="media mb-2 mt-3">
                                      <div className="media-body">
                                        <h5 className="my-1 text-primary">{selected.subject ?? CH[selected.channel].label}</h5>
                                        <p className="read-content-email">
                                          {selected.contactEmail ?? selected.contactPhone ?? ""}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="read-content-body">
                                      {loadingMsgs ? (
                                        <div className="d-flex align-items-center" role="status">
                                          <div className="spinner-border text-primary me-3" aria-hidden="true" />
                                          <span className="text-muted">Cargando mensajes…</span>
                                        </div>
                                      ) : (
                                        messages.map((m) => (
                                          <div key={m.id} className="media mb-2">
                                            <div className="media-body">
                                              <span className="float-end">{fmtTime(m.createdAt)}</span>
                                              <p className="mb-1">{m.body}</p>
                                              <span className="text-muted fs-13">
                                                {m.direction === "outbound" ? "Enviado" : "Recibido"} · {m.status}
                                              </span>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                      <div ref={messagesEndRef} />
                                      <hr />
                                    </div>
                                    {aiHint && <p className="text-primary fs-13 mb-2">{aiHint}</p>}
                                    {replyInfo && (
                                      <p className={`fs-13 mb-2 ${replyInfo.dispatched ? "text-success" : "text-danger"}`}>
                                        {replyInfo.dispatched
                                          ? "Enviado por el canal"
                                          : `No enviado${replyInfo.error ? `: ${replyInfo.error}` : ""}`}
                                      </p>
                                    )}
                                    <div className="mb-3 pt-3">
                                      <textarea
                                        name="write-email"
                                        id="write-email"
                                        rows={5}
                                        className="form-control"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        placeholder="Escribe una respuesta…"
                                        aria-label="Respuesta"
                                      />
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <button
                                      className="btn btn-primary light me-2"
                                      type="button"
                                      disabled={agentLoading}
                                      onClick={() => void suggestAiReply()}
                                    >
                                      {agentLoading ? "Sugiriendo…" : "Sugerir con IA"}
                                    </button>
                                    <button
                                      className="btn btn-primary"
                                      type="button"
                                      disabled={!reply.trim()}
                                      onClick={() => void sendReply()}
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Fragment>
    </SaasW3crmShell>
  );
}
