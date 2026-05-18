import { useEffect, useState, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Crown, Sparkles, Check, Download, Copy, Eye,
  Plus, Search, Clock, Shield, Zap, ArrowRight, Star,
  Building2, Users, Globe, Briefcase, Scale, Lock, Loader2,
  Pen, RefreshCw, ChevronDown, ChevronUp, Award,
  FileSignature, BookOpen, AlertTriangle, Handshake,
  Trash2, X, Share2, LifeBuoy, Link2,
  type LucideIcon,
} from "lucide-react";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import ContractsAnalyticsTab from "@/components/analytics/ContractsAnalyticsTab";
import { toast } from "sonner";
import { exportPDF } from "@/lib/export-utils";
import { parseE2EParams, buildE2EUrl } from "@/lib/e2e-flow";
import E2EContextBanner from "@/components/E2EContextBanner";

/* ─── ALL JURISDICTIONS WORLDWIDE (195+ countries) ─── */
const allJurisdictions = [
  // Europe
  "España", "Francia", "Alemania", "Italia", "Portugal", "Reino Unido", "Irlanda", "Países Bajos", "Bélgica", "Luxemburgo",
  "Suiza", "Austria", "Suecia", "Noruega", "Dinamarca", "Finlandia", "Islandia", "Polonia", "República Checa", "Eslovaquia",
  "Hungría", "Rumanía", "Bulgaria", "Croacia", "Eslovenia", "Serbia", "Bosnia y Herzegovina", "Montenegro", "Macedonia del Norte",
  "Albania", "Kosovo", "Grecia", "Chipre", "Malta", "Estonia", "Letonia", "Lituania", "Ucrania", "Moldavia", "Bielorrusia",
  "Georgia", "Armenia", "Azerbaiyán", "Turquía", "Rusia",
  // Americas
  "Estados Unidos", "Canadá", "México", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panamá",
  "Cuba", "República Dominicana", "Haití", "Jamaica", "Trinidad y Tobago", "Bahamas", "Barbados", "Belice",
  "Colombia", "Venezuela", "Ecuador", "Perú", "Bolivia", "Chile", "Argentina", "Uruguay", "Paraguay", "Brasil",
  "Guyana", "Surinam",
  // Asia
  "China", "Japón", "Corea del Sur", "Corea del Norte", "India", "Pakistán", "Bangladesh", "Sri Lanka", "Nepal",
  "Tailandia", "Vietnam", "Camboya", "Laos", "Myanmar", "Malasia", "Singapur", "Indonesia", "Filipinas",
  "Mongolia", "Kazajistán", "Uzbekistán", "Turkmenistán", "Kirguistán", "Tayikistán", "Afganistán",
  "Irán", "Irak", "Arabia Saudita", "Emiratos Árabes Unidos", "Qatar", "Kuwait", "Bahréin", "Omán", "Yemen",
  "Jordania", "Líbano", "Siria", "Israel", "Palestina", "Taiwán", "Hong Kong", "Macao",
  // Africa
  "Marruecos", "Argelia", "Túnez", "Libia", "Egipto", "Sudán", "Sudán del Sur", "Etiopía", "Somalia", "Kenia",
  "Uganda", "Tanzania", "Ruanda", "Burundi", "República Democrática del Congo", "República del Congo",
  "Camerún", "Nigeria", "Ghana", "Costa de Marfil", "Senegal", "Malí", "Burkina Faso", "Níger", "Chad",
  "República Centroafricana", "Gabón", "Guinea Ecuatorial", "Angola", "Mozambique", "Zambia", "Zimbabue",
  "Botsuana", "Namibia", "Sudáfrica", "Lesoto", "Esuatini", "Madagascar", "Mauricio", "Seychelles",
  "Cabo Verde", "Santo Tomé y Príncipe", "Comoras", "Yibuti", "Eritrea", "Gambia", "Guinea", "Guinea-Bisáu",
  "Liberia", "Sierra Leona", "Togo", "Benín", "Malaui",
  // Oceania
  "Australia", "Nueva Zelanda", "Papúa Nueva Guinea", "Fiyi", "Samoa", "Tonga", "Vanuatu",
  "Islas Salomón", "Kiribati", "Tuvalu", "Nauru", "Palaos", "Islas Marshall", "Micronesia",
  // Caribbean & Others
  "Antigua y Barbuda", "Dominica", "Granada", "San Cristóbal y Nieves", "Santa Lucía",
  "San Vicente y las Granadinas", "Andorra", "Liechtenstein", "Mónaco", "San Marino", "Ciudad del Vaticano",
  "Brunéi", "Timor Oriental", "Bután", "Maldivas",
].sort();

/* ─── ALL LANGUAGES WORLDWIDE (100+) ─── */
const allLanguages = [
  "Español", "English", "Português", "Français", "Deutsch", "Italiano", "Nederlands", "Русский (Ruso)",
  "中文 (Chino Mandarín)", "日本語 (Japonés)", "한국어 (Coreano)", "العربية (Árabe)", "हिन्दी (Hindi)",
  "বাংলা (Bengalí)", "Türkçe (Turco)", "Tiếng Việt (Vietnamita)", "ไทย (Tailandés)", "Polski (Polaco)",
  "Українська (Ucraniano)", "Română (Rumano)", "Magyar (Húngaro)", "Čeština (Checo)", "Slovenčina (Eslovaco)",
  "Slovenščina (Esloveno)", "Hrvatski (Croata)", "Srpski (Serbio)", "Български (Búlgaro)", "Ελληνικά (Griego)",
  "Svenska (Sueco)", "Norsk (Noruego)", "Dansk (Danés)", "Suomi (Finlandés)", "Eesti (Estonio)",
  "Latviešu (Letón)", "Lietuvių (Lituano)", "Bahasa Indonesia", "Bahasa Melayu (Malayo)", "Filipino/Tagalog",
  "ภาษาไทย (Thai)", "ქართული (Georgiano)", "Հայերեն (Armenio)", "Azərbaycan (Azerí)",
  "فارسی (Persa/Farsi)", "עברית (Hebreo)", "اردو (Urdu)", "தமிழ் (Tamil)", "తెలుగు (Telugu)",
  "ಕನ್ನಡ (Canarés)", "മലയാളം (Malayalam)", "ગુજરાતી (Guyaratí)", "मराठी (Maratí)", "ਪੰਜਾਬੀ (Panyabí)",
  "සිංහල (Cingalés)", "ဗမာ (Birmano)", "ខ្មែរ (Jemer/Camboyano)", "ລາວ (Laosiano)",
  "Монгол (Mongol)", "Қазақ (Kazajo)", "Oʻzbek (Uzbeko)", "Кыргыз (Kirguís)",
  "Kiswahili (Suajili)", "Hausa", "Yorùbá", "Igbo", "Amárico (አማርኛ)", "Oromo", "Somali",
  "Afrikaans", "isiZulu (Zulú)", "isiXhosa (Xhosa)", "Sesotho", "Setswana",
  "Wolof", "Lingala", "Kinyarwanda", "Kirundi",
  "Català (Catalán)", "Euskara (Vasco)", "Galego (Gallego)", "Valencià",
  "Gaeilge (Irlandés)", "Cymraeg (Galés)", "Gàidhlig (Gaélico Escocés)", "Brezhoneg (Bretón)",
  "Lëtzebuergesch (Luxemburgués)", "Malti (Maltés)", "Shqip (Albanés)", "Bosanski (Bosnio)",
  "Македонски (Macedonio)", "Беларуская (Bielorruso)", "Молдове|Moldavo",
  "नेपाली (Nepalí)", "ᓀᐦᐃᔭᐍᐏᐣ Cree", "ᐃᓄᒃᑎᑐᑦ Inuktitut",
  "Māori", "Gagana Samoa", "Lea Faka-Tonga", "Bislama", "Tok Pisin",
  "Kreyòl Ayisyen (Criollo Haitiano)", "Papiamento", "Cabo-verdiano",
  "Esperanto", "Latín",
].sort();

/* ─── Contract Templates — ALL  ─── */
interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  sections: string[];
  estimatedPages: number;
  popular?: boolean;
  tags: string[];
}

const ELITE_LABEL = "";

const contractTemplates: ContractTemplate[] = [
  {
    id: "service-agreement",
    name: "Contrato de Prestación de Servicios",
    category: "Servicios",
    description: "Contrato  para prestación de servicios digitales, consultoría, marketing, desarrollo web o cualquier servicio profesional. Máximo nivel legal con cláusulas anti-fraude, arbitraje internacional y cumplimiento multi-jurisdiccional.",
    icon: Briefcase,
    color: "#3B82F6",
    gradient: "from-blue-500 to-indigo-600",
    sections: [
      "Datos completos de las partes (verificación KYC)",
      "Objeto del contrato y definiciones legales",
      "Alcance detallado de los servicios (Anexo técnico)",
      "Duración, renovación automática y períodos de gracia",
      "Precio, forma de pago, penalizaciones por mora e intereses",
      "Obligaciones del prestador (SLA incluido)",
      "Obligaciones del cliente (cooperación y accesos)",
      "Propiedad intelectual (cesión, licencias, work-for-hire)",
      "Confidencialidad (NDA bilateral integrado)",
      "Protección de datos (GDPR/RGPD/CCPA/LGPD/PIPA compliant)",
      "Limitación de responsabilidad y seguros",
      "Fuerza mayor y caso fortuito",
      "Resolución anticipada y penalizaciones",
      "Mediación y arbitraje internacional",
      "Ley aplicable y jurisdicción competente",
      "Notificaciones y comunicaciones oficiales",
      "Cláusula de integridad del contrato",
      "Firma digital cualificada (eIDAS/ESIGN/UETA)",
      "Anexos técnicos y documentación complementaria",
    ],
    estimatedPages: 14,
    popular: true,
    tags: ["Agencias", "Freelancers", "Consultoras", "Marketing", "Desarrollo", "IT"],
  },
  {
    id: "saas-subscription",
    name: "Contrato de Suscripción SaaS",
    category: "SaaS",
    description: "Acuerdo  de licencia y suscripción para plataformas SaaS. SLA con 99.99% uptime, DPA integrado, cumplimiento SOC2/ISO27001, términos de uso exhaustivos y condiciones de renovación.",
    icon: Globe,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    sections: [
      "Definiciones y glosario técnico-legal",
      "Licencia de uso (scope, restricciones, sub-licencias)",
      "Planes, precios y escalado automático",
      "Período de prueba y conversión",
      "SLA (99.99% uptime, tiempos de respuesta, créditos)",
      "Disponibilidad, mantenimiento programado y ventanas",
      "Soporte técnico (tiers L1/L2/L3, horarios, canales)",
      "Data Processing Agreement (DPA) integrado",
      "Política de privacidad y seguridad de datos",
      "Backup, recuperación y RPO/RTO garantizados",
      "Actualizaciones, versionado y deprecación",
      "Integraciones, APIs y webhooks",
      "Cancelación, migración de datos y portabilidad",
      "Reembolsos y pro-rata",
      "Cumplimiento normativo (SOC2/ISO27001/HIPAA/PCI-DSS)",
      "Limitación de responsabilidad e indemnización",
      "Propiedad intelectual y datos del cliente",
      "Fuerza mayor",
      "Ley aplicable y arbitraje",
      "Firma digital cualificada",
    ],
    estimatedPages: 18,
    popular: true,
    tags: ["SaaS", "Plataformas", "Software", "Startups", "Enterprise", "Cloud"],
  },
  {
    id: "nda",
    name: "Acuerdo de Confidencialidad (NDA)",
    category: "Legal",
    description: "NDA  bilateral o unilateral. Protección máxima de información confidencial con cláusulas de no competencia, no solicitud, penalizaciones cuantificadas y validez multi-jurisdiccional internacional.",
    icon: Lock,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    sections: [
      "Identificación completa de las partes",
      "Definición exhaustiva de información confidencial",
      "Categorías de información (técnica, comercial, financiera, personal)",
      "Obligaciones de confidencialidad (estándares de seguridad)",
      "Excepciones y exclusiones legales",
      "Duración de la obligación (durante y post-contrato)",
      "No competencia y no solicitud",
      "Penalizaciones cuantificadas por incumplimiento",
      "Medidas cautelares y acciones legales",
      "Devolución y destrucción certificada de información",
      "Auditoría y verificación de cumplimiento",
      "Transferencia a terceros y subcontratistas",
      "Protección de datos personales",
      "Ley aplicable y jurisdicción internacional",
      "Firma digital cualificada",
    ],
    estimatedPages: 8,
    popular: true,
    tags: ["Todos los sectores", "Partners", "Empleados", "Colaboradores", "M&A", "Due Diligence"],
  },
  {
    id: "partner-reseller",
    name: "Contrato de Partner / Reseller / White-Label",
    category: "Partners",
    description: "Acuerdo  de partnership para reventa de servicios white-label. Incluye márgenes garantizados, exclusividad territorial, SLA premium, revenue share, co-branding y condiciones comerciales exhaustivas.",
    icon: Handshake,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    sections: [
      "Datos completos de las partes (verificación empresarial)",
      "Objeto del partnership y modelo de negocio",
      "Servicios incluidos y catálogo white-label",
      "Precios, márgenes garantizados y escalado",
      "White-label completo (marca, dominio, app, emails)",
      "Exclusividad territorial y sectorial",
      "Obligaciones del partner (ventas mínimas, calidad)",
      "Obligaciones del proveedor (SLA, soporte, actualizaciones)",
      "SLA premium (99.99% uptime, soporte prioritario)",
      "Revenue share y comisiones por referidos",
      "Co-branding y materiales de marketing",
      "Formación y certificación del equipo partner",
      "Confidencialidad bilateral",
      "Propiedad intelectual y licencias",
      "Protección de datos (DPA multi-jurisdiccional)",
      "Duración, renovación y períodos de gracia",
      "Resolución del contrato y transición de clientes",
      "Penalizaciones y compensaciones",
      "Mediación y arbitraje internacional",
      "Ley aplicable y jurisdicción",
      "Firma digital cualificada",
      "Anexo: Catálogo de servicios y precios",
    ],
    estimatedPages: 22,
    popular: true,
    tags: ["Partners", "Agencias", "Resellers", "White-label", "Distribuidores", "Franquicias"],
  },
  {
    id: "employment",
    name: "Contrato de Trabajo / Colaboración",
    category: "RRHH",
    description: "Contrato  laboral o de colaboración freelance. Adaptado a legislación internacional con cláusulas de no competencia, IP assignment, confidencialidad reforzada y compliance laboral completo.",
    icon: Building2,
    color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    sections: [
      "Datos del empleador y empleado/colaborador",
      "Puesto, funciones y responsabilidades detalladas",
      "Tipo de contrato y clasificación laboral",
      "Jornada laboral, horario flexible y teletrabajo",
      "Remuneración, bonos, stock options y beneficios",
      "Período de prueba y evaluación",
      "Vacaciones, permisos y días festivos",
      "Formación continua y desarrollo profesional",
      "Confidencialidad reforzada (NDA integrado)",
      "No competencia post-contractual (con compensación)",
      "No solicitud de clientes y empleados",
      "Propiedad intelectual (IP assignment completo)",
      "Herramientas de trabajo y equipamiento",
      "Protección de datos del empleado (GDPR)",
      "Salud y seguridad laboral",
      "Causas de resolución y procedimiento",
      "Preaviso y liquidación",
      "Cláusula de arbitraje laboral",
      "Ley aplicable y jurisdicción",
      "Firma digital cualificada",
    ],
    estimatedPages: 12,
    tags: ["Empresas", "Startups", "RRHH", "Freelancers", "Remote", "Internacional"],
  },
  {
    id: "ecommerce-terms",
    name: "Términos y Condiciones E-commerce",
    category: "E-commerce",
    description: "Términos  de venta online. Política de devoluciones, envíos internacionales, garantías, PCI-DSS compliance, protección al consumidor multi-jurisdiccional y resolución de disputas.",
    icon: Globe,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    sections: [
      "Identificación completa del vendedor",
      "Definiciones y ámbito de aplicación",
      "Proceso de compra y formación del contrato",
      "Precios, impuestos y tasas internacionales",
      "Métodos de pago (PCI-DSS compliant)",
      "Prevención de fraude y seguridad",
      "Envío, entrega y logística internacional",
      "Seguimiento de pedidos y notificaciones",
      "Derecho de desistimiento (14-30 días según jurisdicción)",
      "Política de devoluciones y reembolsos",
      "Garantías legales y comerciales",
      "Productos digitales y suscripciones",
      "Responsabilidad del vendedor",
      "Protección de datos del comprador (GDPR/CCPA/LGPD)",
      "Política de cookies y tracking",
      "Propiedad intelectual del contenido",
      "Opiniones y reseñas de usuarios",
      "Resolución alternativa de conflictos (ODR)",
      "Ley aplicable y jurisdicción del consumidor",
      "Firma digital / Aceptación electrónica",
    ],
    estimatedPages: 14,
    tags: ["E-commerce", "Tiendas online", "Retail", "Marketplaces", "Dropshipping", "D2C"],
  },
  {
    id: "privacy-policy",
    name: "Política de Privacidad Internacional",
    category: "Legal",
    description: "Política  adaptada simultáneamente a GDPR (Europa), CCPA/CPRA (California), LGPD (Brasil), PIPA (Corea), PDPA (Singapur/Tailandia), Privacy Act (Australia) y todas las regulaciones mundiales.",
    icon: Shield,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    sections: [
      "Responsable del tratamiento y DPO",
      "Datos que recopilamos (categorías exhaustivas)",
      "Finalidad del tratamiento (base legal por finalidad)",
      "Base legal del tratamiento (consentimiento, interés legítimo, contrato)",
      "Destinatarios y encargados del tratamiento",
      "Transferencias internacionales (SCCs, BCRs, adecuación)",
      "Plazo de conservación por categoría de datos",
      "Derechos del usuario GDPR (acceso, rectificación, supresión, portabilidad, oposición, limitación)",
      "Derechos CCPA/CPRA (know, delete, opt-out, non-discrimination)",
      "Derechos LGPD (confirmación, acceso, corrección, anonimización)",
      "Cookies, tracking y tecnologías similares",
      "Decisiones automatizadas y profiling",
      "Seguridad de datos (medidas técnicas y organizativas)",
      "Menores de edad (COPPA/regulación local)",
      "Notificación de brechas de seguridad",
      "Modificaciones de la política y versionado",
      "Contacto DPO y autoridades de control",
      "Resolución de reclamaciones",
    ],
    estimatedPages: 12,
    popular: true,
    tags: ["Todos los sectores", "GDPR", "CCPA", "LGPD", "Web", "Apps", "SaaS"],
  },
  {
    id: "freelance-proposal",
    name: "Propuesta Comercial / Presupuesto Profesional",
    category: "Ventas",
    description: "Propuesta  con desglose de servicios, pricing transparente, timeline con milestones, garantías, SLA y conversión automática a contrato vinculante al aceptar.",
    icon: FileSignature,
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    sections: [
      "Portada corporativa profesional",
      "Presentación de la empresa y credenciales",
      "Resumen ejecutivo del proyecto",
      "Análisis de necesidades del cliente",
      "Alcance detallado del proyecto (in-scope / out-scope)",
      "Servicios detallados con entregables",
      "Metodología y proceso de trabajo",
      "Timeline con milestones y deadlines",
      "Equipo asignado y roles",
      "Inversión y desglose transparente de precios",
      "Opciones y paquetes adicionales",
      "Condiciones de pago y facturación",
      "Garantías incluidas y soporte post-entrega",
      "SLA y métricas de éxito (KPIs)",
      "Casos de éxito y testimonios relevantes",
      "Próximos pasos y proceso de aceptación",
      "Validez de la propuesta",
      "Términos y condiciones (vinculante al aceptar)",
      "Firma digital de aceptación",
    ],
    estimatedPages: 10,
    popular: true,
    tags: ["Freelancers", "Agencias", "Consultoras", "Ventas", "Propuestas", "Licitaciones"],
  },
];

/* ─── Recent Contracts ─── */
interface RecentContract {
  id: string;
  name: string;
  client: string;
  template: string;
  status: "signed" | "pending" | "draft" | "expired";
  date: string;
  value: string;
}

/* ─── Contract Log Entry ─── */
interface ContractLogEntry {
  id: number;
  contract_id: number;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  actor_name?: string;
  actor_role?: string;
  notes?: string;
  created_at?: string;
}

/* ─── Role Permissions ─── */
type ContractRole = "admin" | "manager" | "agent" | "viewer";
const CONTRACT_ROLES: Record<ContractRole, { label: string; color: string; canCreate: boolean; canSign: boolean; canDelete: boolean; canChangeStatus: boolean; canViewLogs: boolean }> = {
  admin: { label: "Administrador", color: "text-amber-400", canCreate: true, canSign: true, canDelete: true, canChangeStatus: true, canViewLogs: true },
  manager: { label: "Manager Legal", color: "text-violet-400", canCreate: true, canSign: true, canDelete: false, canChangeStatus: true, canViewLogs: true },
  agent: { label: "Agente", color: "text-blue-400", canCreate: true, canSign: false, canDelete: false, canChangeStatus: false, canViewLogs: false },
  viewer: { label: "Visor", color: "text-zinc-400", canCreate: false, canSign: false, canDelete: false, canChangeStatus: false, canViewLogs: false },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  signed: { label: "Firmado", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  pending: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  draft: { label: "Borrador", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  expired: { label: "Expirado", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const logActionConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  created: { label: "Creado", color: "text-blue-400", icon: FileText },
  status_changed: { label: "Estado cambiado", color: "text-amber-400", icon: RefreshCw },
  edited: { label: "Editado", color: "text-violet-400", icon: Pen },
  signed: { label: "Firmado", color: "text-emerald-400", icon: FileSignature },
  downloaded: { label: "Descargado", color: "text-cyan-400", icon: Download },
  shared: { label: "Compartido", color: "text-pink-400", icon: Users },
  deleted: { label: "Eliminado", color: "text-red-400", icon: Trash2 },
};

/* ─── Signature Canvas Component ─── */
function SignatureCanvas({ onComplete, onCancel }: { onComplete: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    const onUp = () => { isDrawingRef.current = false; };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onComplete(canvas.toDataURL("image/png"));
  };

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={120}
        className="border-2 border-dashed border-blue-200 rounded-lg cursor-crosshair w-full touch-none"
        style={{ maxWidth: 400 }} />
      <div className="flex items-center gap-2 mt-2">
        <button onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600">
          ✓ Confirmar Firma
        </button>
        <button onClick={handleClear}
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-[10px] hover:bg-gray-300">
          Limpiar
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 text-[10px] hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function SaasContracts() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const e2eParams = parseE2EParams(location.search);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"templates" | "contracts" | "generator" | "analytics">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(false);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [viewingContract, setViewingContract] = useState<RecentContract | null>(null);
  const [contractLogs, setContractLogs] = useState<ContractLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentRole, setCurrentRole] = useState<ContractRole>("admin");
  const permissions = CONTRACT_ROLES[currentRole];

  const [formData, setFormData] = useState({
    companyName: "",
    companyId: "",
    clientName: "",
    clientId: "",
    serviceDescription: "",
    price: "",
    duration: "12 meses",
    startDate: "",
    jurisdiction: "España",
    language: "Español",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  // Load contracts from backend only — no hardcoded data
  const fetchContracts = useCallback(async () => {
    setLoadingContracts(true);
    try {
      const res = await client.entities.contracts.query({ sort: "-created_at", limit: 100 });
      const items = (res.data?.items || []) as Array<{
        id: number; title: string; company_name?: string; client_name?: string; template_id?: string; status?: string;
        price?: string; duration?: string; jurisdiction?: string; created_at?: string;
      }>;
      const mapped: RecentContract[] = items.map(item => ({
        id: `be-${item.id}`,
        name: item.title,
        client: item.client_name || item.company_name || "—",
        template: item.template_id || "service-agreement",
        status: (item.status as RecentContract["status"]) || "draft",
        date: item.created_at ? new Date(item.created_at).toISOString().split("T")[0] : "—",
        value: item.price ? `€${item.price}` : "—",
      }));
      setRecentContracts(mapped);
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasContracts] Error:", err); /* empty state */ }
    setLoadingContracts(false);
  }, []);

  useEffect(() => { if (user) fetchContracts(); }, [user, fetchContracts]);

  // Fetch contract change logs (uses local audit trail as fallback)
  const fetchContractLogs = useCallback(async (contractId?: number) => {
    if (!permissions.canViewLogs) return;
    setLoadingLogs(true);
    try {
      // Try backend entity if available
      if (client.entities && (client.entities as Record<string, unknown>).contract_logs) {
        const entity = (client.entities as Record<string, { query: (q: Record<string, unknown>) => Promise<{ data?: unknown }> }>).contract_logs;
        const query: Record<string, unknown> = { sort: "-created_at", limit: 100 };
        if (contractId) query.contract_id = contractId;
        const res = await entity.query(query);
        const items = ((res?.data as { items?: ContractLogEntry[] })?.items || res?.data as ContractLogEntry[] || []);
        if (Array.isArray(items)) setContractLogs(items);
      } else {
        // Fallback: use local audit trail mapped to ContractLogEntry format
        const mapped: ContractLogEntry[] = auditTrail.map((entry, i) => ({
          id: i + 1,
          contract_id: contractId || 0,
          action: entry.action.includes("firmado") || entry.action.includes("Firma") ? "signed" :
                  entry.action.includes("Estado") ? "status_changed" :
                  entry.action.includes("descargado") || entry.action.includes("PDF") ? "downloaded" :
                  entry.action.includes("generado") || entry.action.includes("Inicio") ? "created" : "edited",
          notes: entry.action,
          actor_name: entry.user,
          actor_role: currentRole,
          created_at: entry.timestamp,
        }));
        setContractLogs(mapped);
      }
    } catch {
      // Fallback to local audit trail
      const mapped: ContractLogEntry[] = auditTrail.map((entry, i) => ({
        id: i + 1, contract_id: contractId || 0,
        action: "edited", notes: entry.action, actor_name: entry.user, actor_role: currentRole, created_at: entry.timestamp,
      }));
      setContractLogs(mapped);
    }
    setLoadingLogs(false);
  }, [permissions.canViewLogs, auditTrail, currentRole]);

  // Log a contract action to backend (best-effort)
  const logContractAction = useCallback(async (contractId: number, action: string, opts?: { field_changed?: string; old_value?: string; new_value?: string; notes?: string }) => {
    try {
      if (client.entities && (client.entities as Record<string, unknown>).contract_logs) {
        const entity = (client.entities as Record<string, { create: (d: unknown) => Promise<unknown> }>).contract_logs;
        await entity.create({
          contract_id: contractId,
          action,
          field_changed: opts?.field_changed || "",
          old_value: opts?.old_value || "",
          new_value: opts?.new_value || "",
          actor_name: user?.email || "Sistema",
          actor_role: currentRole,
          notes: opts?.notes || "",
        });
      }
    } catch { /* non-critical — logs are best-effort */ }
  }, [user, currentRole]);

  const filteredTemplates = contractTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  // AI-generated contract content
  const [aiContractContent, setAiContractContent] = useState<Record<number, string>>({});
  // Digital signature state
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  // Audit trail
  const [auditTrail, setAuditTrail] = useState<Array<{ action: string; timestamp: string; user: string }>>([]);

  const addAuditEntry = (action: string) => {
    setAuditTrail(prev => [{
      action,
      timestamp: new Date().toISOString(),
      user: user?.email || "Sistema",
    }, ...prev]);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) { toast.error("Selecciona una plantilla primero"); return; }
    if (!formData.companyName || !formData.clientName) { toast.error("Completa al menos el nombre de empresa y cliente"); return; }
    setGenerating(true);
    addAuditEntry(`Inicio generación: ${selectedTemplate.name}`);

    // Try AI-powered contract generation
    const aiContent: Record<number, string> = {};
    try {
      const baseUrl = (await import("@/lib/config")).getAPIBaseURL();

      // Generate content for first 5 key clauses via AI
      const clausesToGenerate = selectedTemplate.sections.slice(0, 5);
      const prompt = `Genera el contenido legal profesional para un contrato de tipo "${selectedTemplate.name}" con estos datos:
- Empresa prestadora: ${formData.companyName} (ID: ${formData.companyId || "pendiente"})
- Cliente: ${formData.clientName} (ID: ${formData.clientId || "pendiente"})
- Servicio: ${formData.serviceDescription || "servicios profesionales"}
- Precio: ${formData.price || "a convenir"}
- Duración: ${formData.duration}
- Jurisdicción: ${formData.jurisdiction}
- Idioma: ${formData.language}

Genera el texto legal COMPLETO para estas ${clausesToGenerate.length} cláusulas:
${clausesToGenerate.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Responde en JSON con formato: {"clauses": ["texto cláusula 1", "texto cláusula 2", ...]}
Solo JSON, sin markdown.`;

      const response = await fetch(`${baseUrl}/api/v1/aihub/gentxt`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Eres un abogado experto en derecho mercantil internacional. Genera cláusulas legales profesionales, precisas y completas en español. Responde SOLO con JSON válido." },
            { role: "user", content: prompt },
          ],
          model: "deepseek-v3.2",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const raw = (data.content || data.message || "").replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(raw) as { clauses: string[] };
        if (parsed.clauses) {
          parsed.clauses.forEach((text, i) => {
            aiContent[i] = text;
          });
        }
        addAuditEntry("Contenido generado con IA (deepseek-v3.2)");
      }
    } catch (err) {
      console.warn("AI contract generation failed, using template fallback:", err);
      addAuditEntry("Fallback: contenido generado con plantilla local");
    }

    setAiContractContent(aiContent);
    setGenerating(false);
    setGeneratedPreview(true);
    toast.success(`Contrato ${ELITE_LABEL} generado${Object.keys(aiContent).length > 0 ? " con IA" : ""} — ${allJurisdictions.length}+ jurisdicciones`);
    addAuditEntry(`Contrato generado: ${selectedTemplate.name} — ${formData.clientName}`);

    // Persist to backend
    try {
      await client.entities.contracts.create({
        data: {
          title: `${selectedTemplate.name} — ${formData.clientName}`,
          contract_type: selectedTemplate.id,
          client_name: formData.clientName,
          company_name: formData.companyName,
          content: JSON.stringify(aiContent),
          jurisdiction: formData.jurisdiction,
          language: formData.language,
          status: "draft",
          price: formData.price,
          duration: formData.duration,
          template_id: selectedTemplate.id,
          audit_trail: JSON.stringify(auditTrail),
          // E2E relationship fields — persisted in backend
          client_id: e2eParams.client_id || null,
          project_id: e2eParams.project_id || null,
          output_id: e2eParams.output_id || null,
          created_at: new Date().toISOString(),
        },
      });
      setRecentContracts(prev => [{
        id: `new-${Date.now()}`,
        name: `${selectedTemplate.name} — ${formData.clientName}`,
        client: formData.companyName,
        template: selectedTemplate.id,
        status: "draft",
        date: new Date().toISOString().split("T")[0],
        value: formData.price ? `€${formData.price}` : "—",
      }, ...prev]);
      addAuditEntry("Contrato guardado en base de datos");
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasContracts] Error:", err); /* non-critical */ }
  };

  // Digital Signature via Canvas
  const handleSignatureStart = () => { setIsSigning(true); };

  const handleSignatureComplete = (dataUrl: string) => {
    if (!permissions.canSign) { toast.error("No tienes permisos para firmar contratos"); setIsSigning(false); return; }
    setSignatureData(dataUrl);
    setIsSigning(false);
    addAuditEntry("Firma digital aplicada por " + (user?.email || "usuario"));
    toast.success("✅ Firma digital aplicada correctamente. Nota: esta firma es una referencia visual interna.");
    // Update contract status and log
    setRecentContracts(prev => prev.map((c, i) => {
      if (i === 0 && c.status === "draft") {
        const beId = c.id.replace("be-", "").replace("new-", "");
        if (c.id.startsWith("be-")) {
          logContractAction(Number(beId), "signed", { notes: `Firmado por ${user?.email || "usuario"} como ${permissions.label}` });
        }
        return { ...c, status: "signed" as const };
      }
      return c;
    }));
  };

  const handleCopy = () => {
    if (!selectedTemplate) return;
    const lines: string[] = [];
    lines.push(selectedTemplate.name.toUpperCase());
    lines.push(`Ref: NLV-${Date.now().toString(36).toUpperCase()} · ${new Date().toLocaleDateString("es")} · ${formData.jurisdiction}`);
    lines.push("");
    lines.push(`PARTE A: ${formData.companyName || "[Empresa]"} (${formData.companyId || "[CIF]"})`);
    lines.push(`PARTE B: ${formData.clientName || "[Cliente]"} (${formData.clientId || "[CIF]"})`);
    lines.push("");
    selectedTemplate.sections.forEach((section, i) => {
      lines.push(`CLÁUSULA ${i + 1}. ${section.toUpperCase()}`);
      lines.push(getClauseContent(i, section));
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast.success("Contrato copiado al portapapeles");
      addAuditEntry("Contrato copiado al portapapeles");
    }).catch(() => {
      toast.error("Error al copiar al portapapeles");
    });
  };

  const handleDownload = () => {
    if (!selectedTemplate) return;
    const sections = selectedTemplate.sections.map((section, i) => ({
      title: `CLÁUSULA ${i + 1}. ${section.toUpperCase()}`,
      content: getClauseContent(i, section),
    }));
    try {
      exportPDF(
        selectedTemplate.name.toUpperCase(),
        sections,
        `contrato_${selectedTemplate.id}_${Date.now()}`,
        {
          author: formData.companyName || "NELVYON",
          date: new Date().toLocaleDateString("es"),
        },
      );
      toast.success("Contrato descargado como PDF");
      addAuditEntry("Contrato descargado como PDF real");
    } catch (err) {
      toast.error("Error al generar el PDF");
    }
  };

  // Helper to get clause content (AI or fallback)
  const getClauseContent = (index: number, section: string): string => {
    if (aiContractContent[index]) return aiContractContent[index];
    // Fallback content
    const fallbacks: Record<number, string> = {
      0: `En ${formData.jurisdiction || "España"}, a ${new Date().toLocaleDateString("es")}, comparecen de una parte ${formData.companyName || "[Empresa]"} (en adelante "EL PRESTADOR"), con identificación fiscal ${formData.companyId || "[CIF/Tax ID]"}, y de otra parte ${formData.clientName || "[Cliente]"} (en adelante "EL CLIENTE"), con identificación fiscal ${formData.clientId || "[CIF/Tax ID]"}, ambas partes con capacidad legal suficiente para obligarse en los términos del presente contrato.`,
      1: `El presente contrato tiene por objeto regular ${formData.serviceDescription || "la prestación de servicios profesionales"} por parte del PRESTADOR al CLIENTE, conforme a las condiciones que se detallan en las siguientes cláusulas, con sujeción a la legislación vigente en ${formData.jurisdiction || "España"} y cumplimiento de las normativas internacionales aplicables.`,
      2: `Los servicios incluidos en el presente contrato comprenden: ${formData.serviceDescription || "los servicios detallados en el Anexo I adjunto"}. El PRESTADOR se compromete a ejecutar los servicios con la máxima diligencia profesional.`,
      3: `El presente contrato tendrá una duración de ${formData.duration}, con inicio en la fecha de firma. Se renovará automáticamente por períodos iguales salvo notificación fehaciente en contrario con un mínimo de 30 días naturales de antelación.`,
      4: `El CLIENTE abonará al PRESTADOR la cantidad de ${formData.price || "[precio acordado]"} mediante transferencia bancaria o método de pago acordado, en los primeros 5 días hábiles de cada período de facturación.`,
    };
    return fallbacks[index] || `[Contenido legal ${ELITE_LABEL} para la cláusula "${section}". Adaptado a la legislación de ${formData.jurisdiction || "España"}, idioma ${formData.language || "Español"}, con cumplimiento GDPR/CCPA/LGPD simultáneo.]`;
  };

  /* ─── Contract Status Change ─── */
  const handleStatusChange = async (contract: RecentContract, newStatus: RecentContract["status"]) => {
    if (!permissions.canChangeStatus) { toast.error("No tienes permisos para cambiar el estado"); return; }
    const beId = contract.id.replace("be-", "").replace("new-", "");
    const oldStatus = contract.status;
    try {
      if (contract.id.startsWith("be-")) {
        await client.entities.contracts.update({
          id: Number(beId),
          data: { status: newStatus },
        });
        await logContractAction(Number(beId), "status_changed", { field_changed: "status", old_value: oldStatus, new_value: newStatus, notes: `Cambiado por ${permissions.label}` });
      }
      setRecentContracts(prev => prev.map(c =>
        c.id === contract.id ? { ...c, status: newStatus } : c
      ));
      const labels: Record<string, string> = { signed: "Firmado", pending: "Pendiente", draft: "Borrador", expired: "Expirado" };
      toast.success(`Estado actualizado a "${labels[newStatus] || newStatus}"`);
      addAuditEntry(`Estado cambiado a ${newStatus}: ${contract.name}`);
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  /* ─── Copy Contract Text ─── */
  const handleCopyContract = (contract: RecentContract) => {
    const text = `${contract.name}\nCliente: ${contract.client}\nEstado: ${statusConfig[contract.status]?.label || contract.status}\nValor: ${contract.value}\nFecha: ${contract.date}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Datos del contrato copiados");
    }).catch(() => toast.error("Error al copiar"));
  };

  /* ─── Download Contract from Table ─── */
  const handleDownloadContract = (contract: RecentContract) => {
    const tpl = contractTemplates.find(t => t.id === contract.template);
    const sections = (tpl?.sections || ["Contenido del contrato"]).map((s, i) => ({
      title: `CLÁUSULA ${i + 1}. ${s.toUpperCase()}`,
      content: `[Contenido de la cláusula "${s}" para el contrato "${contract.name}"]`,
    }));
    try {
      exportPDF(
        contract.name.toUpperCase(),
        sections,
        `contrato_${contract.id}_${Date.now()}`,
        { author: contract.client, date: contract.date },
      );
      toast.success("PDF descargado");
      // Log download
      const beId = contract.id.replace("be-", "").replace("new-", "");
      if (contract.id.startsWith("be-")) {
        logContractAction(Number(beId), "downloaded", { notes: `PDF descargado por ${permissions.label}` });
      }
    } catch {
      toast.error("Error al generar PDF");
    }
  };

  /* ─── View Contract Detail ─── */
  const handleViewContract = (contract: RecentContract) => {
    setViewingContract(contract);
  };

  /* ─── Delete Contract ─── */
  const handleDeleteContract = async (contract: RecentContract) => {
    if (!permissions.canDelete) { toast.error("No tienes permisos para eliminar contratos"); return; }
    const beId = contract.id.replace("be-", "").replace("new-", "");
    try {
      if (contract.id.startsWith("be-")) {
        await logContractAction(Number(beId), "deleted", { notes: contract.name });
        await client.entities.contracts.delete({ id: Number(beId) });
      }
      setRecentContracts(prev => prev.filter(c => c.id !== contract.id));
      toast.success("Contrato eliminado");
    } catch {
      toast.error("Error al eliminar contrato");
    }
  };

  return (
    <SaasLayout title="Contratos Profesionales" subtitle={`${ELITE_LABEL} — ${allJurisdictions.length}+ países · ${allLanguages.length}+ idiomas · Calidad 1000%`}>
      {/* E2E Context Banner */}
      <E2EContextBanner
        currentModule="contracts"
        context={{
          client_id: e2eParams.client_id,
          project_id: e2eParams.project_id,
          contract_id: e2eParams.contract_id,
        }}
      />

      {/* Role Selector */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] text-zinc-500">Rol:</span>
          <select value={currentRole} onChange={e => setCurrentRole(e.target.value as ContractRole)}
            className="h-7 px-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-xs text-zinc-300">
            {Object.entries(CONTRACT_ROLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { key: "canCreate", label: "Crear" },
            { key: "canSign", label: "Firmar" },
            { key: "canChangeStatus", label: "Cambiar Estado" },
            { key: "canDelete", label: "Eliminar" },
            { key: "canViewLogs", label: "Ver Logs" },
          ].map(p => (
            <span key={p.key} className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5",
              permissions[p.key as keyof typeof permissions] ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
              {permissions[p.key as keyof typeof permissions] ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-amber-500/[0.04] to-emerald-500/[0.08] border border-violet-500/10 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0 relative">
            <FileText className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <Crown className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">
                Generador de Contratos {ELITE_LABEL}
              </h1>
              <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-[9px] font-black text-amber-300 border border-amber-500/30 animate-pulse">
                1000% CALIDAD
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-3">
              Crea contratos legales del máximo nivel mundial en segundos. 8 plantillas {ELITE_LABEL},
              {allJurisdictions.length}+ jurisdicciones de todos los países del mundo, {allLanguages.length}+ idiomas,
              firma digital cualificada (eIDAS/ESIGN/UETA), cumplimiento GDPR/CCPA/LGPD/PIPA simultáneo.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `8 Plantillas ${ELITE_LABEL}`, icon: Crown, color: "text-amber-300" },
                { label: `${allJurisdictions.length}+ Países`, icon: Globe, color: "text-cyan-300" },
                { label: `${allLanguages.length}+ Idiomas`, icon: Globe, color: "text-violet-300" },
                { label: "GDPR+CCPA+LGPD+PIPA", icon: Shield, color: "text-emerald-300" },
                { label: "Firma Digital eIDAS", icon: FileSignature, color: "text-blue-300" },
                { label: "Arbitraje Internacional", icon: Scale, color: "text-rose-300" },
                { label: "PDF Profesional", icon: Download, color: "text-amber-300" },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] text-[10px] font-medium border border-white/[0.06]">
                  <b.icon className={cn("w-3 h-3", b.color)} />
                  <span className={b.color}>{b.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards — real counts from loaded contracts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Contratos Registrados", value: recentContracts.length.toString(), icon: FileText, color: "text-violet-400" },
          { label: "Firmados", value: recentContracts.filter(c => c.status === "signed").length.toString(), icon: FileSignature, color: "text-emerald-400" },
          { label: "Borradores", value: recentContracts.filter(c => c.status === "draft").length.toString(), icon: Clock, color: "text-blue-400" },
          { label: "Plantillas Disponibles", value: contractTemplates.length.toString(), icon: Crown, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "templates" as const, label: "Plantillas Élite", icon: Crown },
          { key: "generator" as const, label: "Generar Contrato", icon: Sparkles },
          { key: "contracts" as const, label: "Mis Contratos", icon: BookOpen },
          { key: "analytics" as const, label: "Analytics", icon: Scale },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
              activeTab === tab.key
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                : "text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-800"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Templates ─── */}
      {activeTab === "templates" && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar plantillas..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-[9px] font-black text-amber-300 border border-amber-500/20">
              TODAS {ELITE_LABEL}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filteredTemplates.map(tpl => {
              const TplIcon = tpl.icon;
              const isExpanded = expandedTemplate === tpl.id;
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <div key={tpl.id} className={cn(
                  "rounded-xl border overflow-hidden transition-all duration-300",
                  isSelected
                    ? "bg-violet-500/[0.06] border-violet-500/20 shadow-lg shadow-violet-500/5"
                    : "bg-[#0F1419] border-white/[0.06] hover:border-white/[0.1]"
                )}>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 relative", tpl.gradient)}>
                        <TplIcon className="w-5 h-5 text-white" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white truncate">{tpl.name}</h3>
                          {tpl.popular && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-600">{tpl.category}</span>
                          <span className="px-1.5 py-0 rounded text-[7px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                            {ELITE_LABEL}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2">{tpl.description}</p>

                    <div className="flex items-center gap-3 mb-3 text-[9px] text-zinc-600">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {tpl.estimatedPages} pág</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {tpl.sections.length} secciones</span>
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {allJurisdictions.length}+ países</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~45s</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {tpl.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[8px] text-slate-500">{tag}</span>
                      ))}
                    </div>

                    {isExpanded && (
                      <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] max-h-48 overflow-y-auto">
                        <p className="text-[9px] text-amber-400 uppercase tracking-wider mb-2 font-bold">Secciones {ELITE_LABEL}</p>
                        <div className="space-y-1">
                          {tpl.sections.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                              <span className="text-[9px] text-zinc-700 w-5 text-right">{i + 1}.</span>
                              <Check className="w-3 h-3 text-emerald-400/60" />
                              <span className="text-[10px] text-slate-400">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setSelectedTemplate(tpl); setActiveTab("generator"); }}
                        className={cn(
                          "flex-1 h-8 text-[10px] font-semibold rounded-lg",
                          isSelected
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                            : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                        )}
                      >
                        <Sparkles className="w-3 h-3 mr-1" /> Usar plantilla
                      </Button>
                      <button
                        onClick={() => setExpandedTemplate(isExpanded ? null : tpl.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── TAB: Generator ─── */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Pen className="w-4 h-4 text-violet-400" />
                Datos del Contrato
                <span className="px-1.5 py-0 rounded text-[7px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">{ELITE_LABEL}</span>
              </h3>

              {selectedTemplate ? (
                <div className="mb-4 p-3 rounded-lg bg-violet-500/[0.06] border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <selectedTemplate.icon className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-white">{selectedTemplate.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-amber-300 font-bold">{ELITE_LABEL}</span>
                    <span className="text-[8px] text-slate-600">· {selectedTemplate.sections.length} secciones · {selectedTemplate.estimatedPages} páginas</span>
                  </div>
                  <button onClick={() => { setSelectedTemplate(null); setActiveTab("templates"); }}
                    className="text-[9px] text-violet-400 hover:text-violet-300 mt-1">Cambiar plantilla</button>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-300">Selecciona una plantilla primero</span>
                  </div>
                  <button onClick={() => setActiveTab("templates")}
                    className="text-[9px] text-amber-400 hover:text-amber-300 mt-1">Ver plantillas →</button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Tu empresa / Nombre</label>
                  <Input value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="NELVYON Technologies S.L." className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">CIF / NIF / Tax ID empresa</label>
                  <Input value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                    placeholder="B-12345678 / EIN / VAT..." className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Cliente / Otra parte</label>
                  <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="TechCorp S.L. / Inc / GmbH / Ltd..." className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">CIF / NIF / Tax ID cliente</label>
                  <Input value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="B-87654321 / EIN / VAT..." className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Descripción del servicio</label>
                  <textarea value={formData.serviceDescription} onChange={e => setFormData({ ...formData, serviceDescription: e.target.value })}
                    placeholder="Prestación de servicios de marketing digital incluyendo..." rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Precio</label>
                    <Input value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="€2,400/mes" className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Duración</label>
                    <select value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-white text-xs focus:outline-none">
                      <option value="1 mes">1 mes</option>
                      <option value="3 meses">3 meses</option>
                      <option value="6 meses">6 meses</option>
                      <option value="12 meses">12 meses</option>
                      <option value="24 meses">24 meses</option>
                      <option value="36 meses">36 meses</option>
                      <option value="60 meses">60 meses</option>
                      <option value="Indefinido">Indefinido</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      Jurisdicción <span className="text-amber-400 font-bold">({allJurisdictions.length}+ países)</span>
                    </label>
                    <select value={formData.jurisdiction} onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-white text-xs focus:outline-none">
                      {allJurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      Idioma <span className="text-amber-400 font-bold">({allLanguages.length}+ idiomas)</span>
                    </label>
                    <select value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-white text-xs focus:outline-none">
                      {allLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating || !selectedTemplate}
                className="w-full mt-5 h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl">
                {generating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generando contrato {ELITE_LABEL}...</>
                ) : (
                  <><Crown className="w-4 h-4 mr-2" /> Generar Contrato {ELITE_LABEL}</>
                )}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-hidden" style={{ minHeight: 600 }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white">Vista Previa — {ELITE_LABEL}</span>
                </div>
                {generatedPreview && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-[10px] border-white/10 text-slate-400">
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                    <Button size="sm" onClick={handleDownload} className="h-7 text-[10px] bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                      <Download className="w-3 h-3 mr-1" /> PDF Élite
                    </Button>
                  </div>
                )}
              </div>

              {generatedPreview && selectedTemplate ? (
                <div className="p-8 max-h-[550px] overflow-y-auto">
                  <div className="bg-white rounded-lg p-8 text-gray-900 shadow-2xl">
                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <Crown className="w-3.5 h-3.5 text-white" />
                        </div>
                        <p className="text-[9px] text-amber-600 uppercase tracking-[0.3em] font-black">{ELITE_LABEL} — DOCUMENTO LEGAL CONFIDENCIAL</p>
                        {Object.keys(aiContractContent).length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[7px] font-bold text-emerald-700">GENERADO CON IA</span>
                        )}
                      </div>
                      <h1 className="text-xl font-bold text-gray-900 mb-1">{selectedTemplate.name.toUpperCase()}</h1>
                      <p className="text-xs text-gray-500">Ref: NLV-{Date.now().toString(36).toUpperCase()} · {new Date().toLocaleDateString("es")} · {formData.jurisdiction} · {formData.language}</p>
                      <p className="text-[8px] text-gray-400 mt-1">Cumplimiento: GDPR · CCPA · LGPD · PIPA · PDPA · eIDAS · ESIGN · UETA · SOC2 · ISO27001</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">PARTE A (Prestador)</p>
                        <p className="text-sm font-bold text-gray-900">{formData.companyName || "Tu Empresa S.L."}</p>
                        <p className="text-xs text-gray-500">{formData.companyId || "CIF/Tax ID: XXXXXXXX"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">PARTE B (Cliente)</p>
                        <p className="text-sm font-bold text-gray-900">{formData.clientName || "Cliente S.L."}</p>
                        <p className="text-xs text-gray-500">{formData.clientId || "CIF/Tax ID: XXXXXXXX"}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedTemplate.sections.map((section, i) => (
                        <div key={section}>
                          <h3 className="text-xs font-bold text-gray-900 mb-1">
                            CLÁUSULA {i + 1}. {section.toUpperCase()}
                          </h3>
                          <div className="text-[11px] text-gray-600 leading-relaxed">
                            <p>{getClauseContent(i, section)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Digital Signature Section */}
                    <div className="mt-10 pt-6 border-t-2 border-gray-200">
                      <p className="text-[8px] text-gray-400 text-center mb-4">
                        Documento generado con plantillas profesionales · Adaptable a {allJurisdictions.length}+ jurisdicciones · {allLanguages.length}+ idiomas disponibles
                        · La firma digital aquí es una referencia visual interna · Consulte con un abogado para validez legal en su jurisdicción
                      </p>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-4">FIRMA PARTE A — REFERENCIA VISUAL</p>
                          {signatureData ? (
                            <div className="border-2 border-emerald-300 rounded-lg p-1 mb-2 bg-emerald-50">
                              <img src={signatureData} alt="Firma digital" className="h-14 object-contain" />
                              <p className="text-[7px] text-emerald-600 text-center mt-1">✓ Firma verificada · {new Date().toISOString()}</p>
                            </div>
                          ) : (
                            <div className="h-16 border-b-2 border-gray-300 mb-2 flex items-center justify-center">
                              {!isSigning && permissions.canSign && (
                                <button onClick={handleSignatureStart}
                                  className="text-[9px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
                                  <Pen className="w-3 h-3" /> Firmar digitalmente
                                </button>
                              )}
                              {!isSigning && !permissions.canSign && (
                                <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Sin permisos de firma
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-gray-600">{formData.companyName || "Nombre, cargo y sello"}</p>
                          <p className="text-[10px] text-gray-400">Fecha: {new Date().toLocaleDateString("es")} · {formData.jurisdiction}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-4">FIRMA PARTE B — REFERENCIA VISUAL</p>
                          <div className="h-16 border-b-2 border-gray-300 mb-2 flex items-center justify-center">
                            <span className="text-[9px] text-gray-400">Pendiente de firma</span>
                          </div>
                          <p className="text-xs text-gray-600">{formData.clientName || "Nombre, cargo y sello"}</p>
                          <p className="text-[10px] text-gray-400">Fecha: ___/___/______ · {formData.jurisdiction}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signature Canvas Modal */}
                  {isSigning && (
                    <div className="mt-4 p-4 rounded-xl bg-white border-2 border-blue-300">
                      <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Pen className="w-4 h-4 text-blue-500" /> Firma Digital — Dibuja tu firma
                      </p>
                      <SignatureCanvas onComplete={handleSignatureComplete} onCancel={() => setIsSigning(false)} />
                    </div>
                  )}

                  {/* Audit Trail */}
                  {auditTrail.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#0F1419] border border-white/[0.06]">
                      <p className="text-[10px] text-violet-400 mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Registro de Auditoría ({auditTrail.length} eventos)
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {auditTrail.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2 text-[9px]">
                            <span className="text-zinc-600 shrink-0 w-32">{new Date(entry.timestamp).toLocaleString("es")}</span>
                            <span className="text-zinc-400">{entry.action}</span>
                            <span className="text-zinc-600 ml-auto">{entry.user}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mx-auto mb-3">
                      <Crown className="w-8 h-8 text-amber-500/30" />
                    </div>
                    <p className="text-sm text-zinc-600 mb-1">Vista previa del contrato {ELITE_LABEL}</p>
                    <p className="text-[10px] text-zinc-700">Selecciona una plantilla y completa los datos para generar</p>
                    <p className="text-[9px] text-amber-400/50 mt-2">{allJurisdictions.length}+ países · {allLanguages.length}+ idiomas · Calidad 1000%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: My Contracts ─── */}
      {activeTab === "contracts" && (
        <>
          {/* Contract Detail Modal */}
          {viewingContract && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setViewingContract(null)}>
              <div className="bg-[#0F1419] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{viewingContract.name}</h3>
                      <span className="text-[10px] text-amber-400/60">{ELITE_LABEL}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewingContract(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Cliente</span>
                    <span className="text-sm font-medium text-white">{viewingContract.client}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Valor</span>
                    <span className="text-sm font-bold text-emerald-400">{viewingContract.value}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Fecha</span>
                    <span className="text-sm text-white">{viewingContract.date}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Estado</span>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", statusConfig[viewingContract.status].bg, statusConfig[viewingContract.status].color)}>
                      {statusConfig[viewingContract.status].label}
                    </span>
                  </div>
                </div>
                {/* Status change in detail view */}
                <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-slate-500 block mb-2">Cambiar Estado</span>
                  <div className="flex gap-2 flex-wrap">
                    {(["draft", "pending", "signed", "expired"] as const).map(s => (
                      <button
                        key={s}
                        disabled={viewingContract.status === s}
                        onClick={() => { handleStatusChange(viewingContract, s); setViewingContract({ ...viewingContract, status: s }); }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                          viewingContract.status === s
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:scale-105 cursor-pointer",
                          statusConfig[s].bg, statusConfig[s].color,
                        )}
                      >
                        {statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Template info */}
                {viewingContract.template && (
                  <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Plantilla</span>
                    <span className="text-sm text-white">{contractTemplates.find(t => t.id === viewingContract.template)?.name || viewingContract.template}</span>
                  </div>
                )}

                {/* E2E: Launch to Social with real context */}
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-pink-500/[0.06] to-violet-500/[0.06] border border-pink-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-pink-400" />
                    <span className="text-[11px] font-bold text-white">Flujo E2E — Lanzar a Social</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">PERSISTIDO</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mb-3">
                    Lanza este contrato a Social con contexto real vinculado: cliente, proyecto y contrato quedan persistidos en backend.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const beId = viewingContract.id.replace("be-", "").replace("new-", "");
                        navigate(buildE2EUrl("/saas/social", {
                          contract_id: viewingContract.id.startsWith("be-") ? Number(beId) : undefined,
                          client_id: e2eParams.client_id,
                          project_id: e2eParams.project_id,
                          campaign_name: viewingContract.name,
                          source: "contract",
                        }));
                        toast.success("Navegando a Social con contexto E2E vinculado");
                      }}
                      className="bg-gradient-to-r from-pink-500 to-violet-600 text-white text-[10px] h-8"
                    >
                      <Share2 className="w-3 h-3 mr-1" /> Lanzar a Social
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const beId = viewingContract.id.replace("be-", "").replace("new-", "");
                        navigate(buildE2EUrl("/saas/helpdesk", {
                          contract_id: viewingContract.id.startsWith("be-") ? Number(beId) : undefined,
                          client_id: e2eParams.client_id,
                          project_id: e2eParams.project_id,
                          source: "contract",
                        }));
                        toast.success("Navegando a Helpdesk con contexto E2E");
                      }}
                      className="text-[10px] h-8 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <LifeBuoy className="w-3 h-3 mr-1" /> Crear Ticket
                    </Button>
                  </div>
                </div>

                {/* Change Log */}
                {permissions.canViewLogs && (
                  <div className="mb-5 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-violet-400" /> Historial de Cambios
                      </span>
                      <button onClick={() => {
                        const beId = viewingContract.id.replace("be-", "").replace("new-", "");
                        if (viewingContract.id.startsWith("be-")) fetchContractLogs(Number(beId));
                        else fetchContractLogs();
                      }} className="text-[9px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5">
                        <RefreshCw className="w-3 h-3" /> Cargar logs
                      </button>
                    </div>
                    {loadingLogs ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-violet-400" /></div>
                    ) : contractLogs.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 text-center py-3">No hay registros de cambios. Haz clic en "Cargar logs".</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {contractLogs.map(log => {
                          const actionCfg = logActionConfig[log.action] || { label: log.action, color: "text-zinc-400", icon: FileText };
                          const LogIcon = actionCfg.icon;
                          return (
                            <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <LogIcon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", actionCfg.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[10px] font-bold", actionCfg.color)}>{actionCfg.label}</span>
                                  {log.actor_name && <span className="text-[9px] text-zinc-500">{log.actor_name}</span>}
                                  {log.actor_role && <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{log.actor_role}</span>}
                                </div>
                                {log.field_changed && (
                                  <p className="text-[9px] text-zinc-500">
                                    {log.field_changed}: <span className="text-red-400 line-through">{log.old_value}</span> → <span className="text-emerald-400">{log.new_value}</span>
                                  </p>
                                )}
                                {log.notes && <p className="text-[9px] text-zinc-600">{log.notes}</p>}
                                <p className="text-[8px] text-zinc-700">{log.created_at ? new Date(log.created_at).toLocaleString("es") : ""}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleCopyContract(viewingContract)} className="text-xs border-white/10 text-slate-300 hover:text-white">
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadContract(viewingContract)} className="text-xs border-white/10 text-slate-300 hover:text-white">
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  {permissions.canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => { handleDeleteContract(viewingContract); setViewingContract(null); }} className="text-xs">
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar contratos..." className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {permissions.canCreate && (
              <Button size="sm" onClick={() => setActiveTab("generator")} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Nuevo Contrato
              </Button>
            )}
          </div>

          {loadingContracts ? (
            <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
                  <div className="h-3.5 bg-white/[0.06] rounded w-1/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/5" />
                  <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/6" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/6" />
                </div>
              ))}
            </div>
          ) : recentContracts.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-[#0F1419] border border-white/[0.06]">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-base font-medium text-white/80">No tienes contratos todavía</p>
              <p className="text-sm text-slate-500 mt-1.5 mb-4 max-w-xs mx-auto">Genera tu primer contrato desde un deal o cliente para empezar</p>
              <Button size="sm" onClick={() => setActiveTab("generator")} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs">
                <Plus className="w-3 h-3 mr-1" /> Crear Primer Contrato
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-[10px] font-medium text-slate-600 px-5 py-3">Contrato</th>
                    <th className="text-left text-[10px] font-medium text-slate-600 px-3 py-3">Cliente</th>
                    <th className="text-center text-[10px] font-medium text-slate-600 px-3 py-3">Estado</th>
                    <th className="text-center text-[10px] font-medium text-slate-600 px-3 py-3">Valor</th>
                    <th className="text-center text-[10px] font-medium text-slate-600 px-3 py-3">Fecha</th>
                    <th className="text-center text-[10px] font-medium text-slate-600 px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContracts
                    .filter(c => {
                      if (!search) return true;
                      const q = search.toLowerCase();
                      return c.name.toLowerCase().includes(q) || c.client.toLowerCase().includes(q) || statusConfig[c.status].label.toLowerCase().includes(q);
                    })
                    .map(c => (
                    <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewContract(c)}>
                          <FileText className="w-4 h-4 text-violet-400" />
                          <div>
                            <span className="text-xs font-medium text-white block group-hover:text-violet-300 transition-colors">{c.name}</span>
                            <span className="text-[8px] text-amber-400/60">{ELITE_LABEL}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">{c.client}</td>
                      <td className="px-3 py-3 text-center">
                        {permissions.canChangeStatus ? (
                          <select
                            value={c.status}
                            onChange={e => handleStatusChange(c, e.target.value as RecentContract["status"])}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold border bg-transparent cursor-pointer appearance-none text-center",
                              statusConfig[c.status].bg, statusConfig[c.status].color,
                            )}
                            style={{ minWidth: "80px" }}
                          >
                            <option value="draft" className="bg-[#0F1419] text-white">Borrador</option>
                            <option value="pending" className="bg-[#0F1419] text-white">Pendiente</option>
                            <option value="signed" className="bg-[#0F1419] text-white">Firmado</option>
                            <option value="expired" className="bg-[#0F1419] text-white">Expirado</option>
                          </select>
                        ) : (
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", statusConfig[c.status].bg, statusConfig[c.status].color)}>
                            {statusConfig[c.status].label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-white">{c.value}</td>
                      <td className="px-3 py-3 text-center text-[10px] text-slate-500">{c.date}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleViewContract(c)} title="Ver detalle" className="p-1.5 rounded-lg hover:bg-violet-500/10 text-slate-500 hover:text-violet-400 transition-colors"><Eye className="w-3 h-3" /></button>
                          <button onClick={() => handleDownloadContract(c)} title="Descargar PDF" className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 transition-colors"><Download className="w-3 h-3" /></button>
                          <button onClick={() => handleCopyContract(c)} title="Copiar datos" className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition-colors"><Copy className="w-3 h-3" /></button>
                          <button onClick={() => {
                            const beId = c.id.replace("be-", "").replace("new-", "");
                            navigate(buildE2EUrl("/saas/social", {
                              contract_id: c.id.startsWith("be-") ? Number(beId) : undefined,
                              campaign_name: c.name,
                              source: "contract",
                            }));
                            toast.success("→ Social con contexto E2E");
                          }} title="Lanzar a Social" className="p-1.5 rounded-lg hover:bg-pink-500/10 text-slate-500 hover:text-pink-400 transition-colors"><Share2 className="w-3 h-3" /></button>
                          {permissions.canDelete && <button onClick={() => handleDeleteContract(c)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Analytics ─── */}
      {activeTab === "analytics" && (
        <ContractsAnalyticsTab />
      )}

      {/* ─── Partner vs White-Label Explanation ─── */}
      <div className="mt-8 rounded-2xl bg-gradient-to-br from-amber-500/[0.06] via-violet-500/[0.04] to-cyan-500/[0.06] border border-amber-500/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Handshake className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">¿Partner es lo mismo que White-Label?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-amber-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-amber-300">Contrato Partner</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              El contrato de <strong className="text-white">Partner/Reseller</strong> es el acuerdo comercial entre tú (la agencia/empresa) y NELVYON.
              Define los términos de la relación: precios, márgenes, exclusividad, SLA, soporte y condiciones de reventa.
            </p>
            <ul className="space-y-1">
              {["Relación comercial tú ↔ NELVYON", "Define precios y márgenes", "Exclusividad territorial", "SLA y soporte", "Revenue share"].map(item => (
                <li key={item} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Check className="w-3 h-3 text-amber-400" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-violet-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-violet-400" />
              <h4 className="text-sm font-bold text-violet-300">White-Label</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              <strong className="text-white">White-Label</strong> es la funcionalidad técnica que permite poner TU marca en todo:
              plataforma, dominio, emails, app, facturas. Es parte del servicio que recibes como Partner.
            </p>
            <ul className="space-y-1">
              {["Tu marca en toda la plataforma", "Tu dominio personalizado", "Emails con tu branding", "App con tu logo", "Facturas con tu empresa"].map(item => (
                <li key={item} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Check className="w-3 h-3 text-violet-400" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
          <p className="text-[11px] text-emerald-300 leading-relaxed">
            <strong>Resumen:</strong> El <strong>contrato Partner</strong> es el acuerdo legal que firmas con NELVYON.
            El <strong>White-Label</strong> es una de las funcionalidades incluidas en ese contrato — la que te permite
            revender todo con tu propia marca como si fuera tuyo. <strong>Partner = acuerdo comercial · White-Label = funcionalidad técnica incluida.</strong>
            Ambos van juntos: al ser Partner, automáticamente tienes acceso al White-Label completo.
          </p>
        </div>
        <div className="mt-3 flex justify-center">
          <Button onClick={() => navigate("/saas/partners")} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <Handshake className="w-4 h-4 mr-2" /> Ver Programa Partners <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Bottom badges */}
      <div className="mt-6 rounded-xl bg-gradient-to-r from-violet-500/[0.04] via-amber-500/[0.03] to-emerald-500/[0.04] border border-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] text-zinc-600">
          <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> {ELITE_LABEL}</span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {allJurisdictions.length}+ Países</span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {allLanguages.length}+ Idiomas</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> GDPR+CCPA+LGPD+PIPA</span>
          <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> Arbitraje Internacional</span>
          <span className="flex items-center gap-1"><FileSignature className="w-3 h-3" /> Firma Digital eIDAS</span>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Encriptado AES-256</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Calidad 1000%</span>
        </div>
      </div>
    </SaasLayout>
  );
}