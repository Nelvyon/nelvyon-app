import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Save, Eye, Loader2, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Globe, Palette, Type, Image, Layout,
  Settings, Rocket, Search, Monitor, Smartphone, Tablet, X,
  Check, Sparkles, Shield, Zap, Star, Users, Mail, Phone,
  MapPin, Clock, Heart, Target, Award, Code, ExternalLink,
  Copy, RefreshCw,
} from "lucide-react";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface Section {
  id: string;
  type: string;
  label: string;
  data: Record<string, string>;
  visible: boolean;
}

interface SiteData {
  id: number;
  name: string;
  domain: string;
  template: string;
  status: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

interface PageData {
  id?: number;
  sections: Section[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATES
   ═══════════════════════════════════════════════════════════════ */
const TEMPLATES: Record<string, { name: string; color: string; gradient: string; sections: Section[] }> = {
  business: {
    name: "Negocio Profesional",
    color: "text-blue-400",
    gradient: "from-blue-600 to-indigo-700",
    sections: [
      { id: "hero-1", type: "hero", label: "Hero Principal", visible: true, data: { title: "Impulsa Tu Negocio al Siguiente Nivel", subtitle: "Soluciones profesionales que transforman tu empresa. Más de 500 clientes confían en nosotros.", cta: "Empezar Ahora", ctaSecondary: "Ver Demo", bg: "#0F172A" } },
      { id: "features-1", type: "features", label: "Características", visible: true, data: { title: "¿Por Qué Elegirnos?", subtitle: "Todo lo que necesitas para crecer", f1_title: "Rápido y Eficiente", f1_desc: "Resultados en tiempo récord con tecnología de vanguardia", f2_title: "Soporte 24/7", f2_desc: "Equipo dedicado disponible cuando lo necesites", f3_title: "Seguridad Total", f3_desc: "Protección avanzada para tu negocio y datos" } },
      { id: "about-1", type: "about", label: "Sobre Nosotros", visible: true, data: { title: "Sobre Nosotros", description: "Somos un equipo apasionado con más de 10 años de experiencia ayudando a empresas a crecer. Nuestra misión es democratizar la tecnología empresarial.", stat1: "500+", stat1_label: "Clientes", stat2: "99.9%", stat2_label: "Uptime", stat3: "24/7", stat3_label: "Soporte" } },
      { id: "testimonials-1", type: "testimonials", label: "Testimonios", visible: true, data: { title: "Lo Que Dicen Nuestros Clientes", t1_name: "María García", t1_role: "CEO, TechStart", t1_text: "Increíble servicio. Transformaron completamente nuestra presencia digital.", t2_name: "Carlos López", t2_role: "Director, InnovaPlus", t2_text: "El mejor equipo con el que hemos trabajado. Resultados excepcionales.", t3_name: "Ana Martínez", t3_role: "Fundadora, CreativeHub", t3_text: "Superaron todas nuestras expectativas. 100% recomendado." } },
      { id: "pricing-1", type: "pricing", label: "Precios", visible: true, data: { title: "Planes y Precios", subtitle: "Elige el plan perfecto para tu negocio", p1_name: "Starter", p1_price: "€29/mes", p1_features: "5 usuarios, 10GB, Email soporte", p2_name: "Professional", p2_price: "€79/mes", p2_features: "25 usuarios, 100GB, Soporte prioritario, API", p3_name: "Enterprise", p3_price: "€199/mes", p3_features: "Ilimitado, 1TB, Soporte 24/7, API, White-label" } },
      { id: "contact-1", type: "contact", label: "Contacto", visible: true, data: { title: "Contáctanos", subtitle: "Estamos aquí para ayudarte", email: "info@tunegocio.com", phone: "+34 900 123 456", address: "Madrid, España" } },
      { id: "footer-1", type: "footer", label: "Footer", visible: true, data: { company: "Tu Empresa S.L.", tagline: "Transformando negocios desde 2015", copyright: "© 2026 Tu Empresa. Todos los derechos reservados." } },
    ],
  },
  portfolio: {
    name: "Portfolio Creativo",
    color: "text-violet-400",
    gradient: "from-violet-600 to-purple-700",
    sections: [
      { id: "hero-1", type: "hero", label: "Hero Principal", visible: true, data: { title: "Diseño que Inspira, Resultados que Impactan", subtitle: "Portfolio de diseño digital, branding y experiencias web únicas.", cta: "Ver Proyectos", ctaSecondary: "Contactar", bg: "#1A0A2E" } },
      { id: "features-1", type: "features", label: "Servicios", visible: true, data: { title: "Servicios", subtitle: "Soluciones creativas completas", f1_title: "Diseño Web", f1_desc: "Sitios web modernos y responsivos que convierten", f2_title: "Branding", f2_desc: "Identidad visual que refleja tu esencia", f3_title: "UI/UX Design", f3_desc: "Experiencias de usuario intuitivas y memorables" } },
      { id: "about-1", type: "about", label: "Sobre Mí", visible: true, data: { title: "Sobre Mí", description: "Diseñador digital con 8 años de experiencia creando experiencias visuales únicas. Especializado en branding, web design y UI/UX.", stat1: "150+", stat1_label: "Proyectos", stat2: "50+", stat2_label: "Clientes", stat3: "8", stat3_label: "Años" } },
      { id: "testimonials-1", type: "testimonials", label: "Testimonios", visible: true, data: { title: "Clientes Satisfechos", t1_name: "Laura Sánchez", t1_role: "Directora Creativa", t1_text: "Un talento excepcional. Capturó perfectamente nuestra visión.", t2_name: "Pedro Ruiz", t2_role: "CEO, StartupX", t2_text: "El diseño web superó todas nuestras expectativas.", t3_name: "Elena Torres", t3_role: "Marketing Manager", t3_text: "Profesional, creativo y con un ojo increíble para el detalle." } },
      { id: "contact-1", type: "contact", label: "Contacto", visible: true, data: { title: "Trabajemos Juntos", subtitle: "¿Tienes un proyecto en mente? Hablemos.", email: "hola@miportfolio.com", phone: "+34 600 123 456", address: "Barcelona, España" } },
      { id: "footer-1", type: "footer", label: "Footer", visible: true, data: { company: "Studio Creativo", tagline: "Diseño con propósito", copyright: "© 2026 Studio Creativo. Todos los derechos reservados." } },
    ],
  },
  saas: {
    name: "SaaS / Startup",
    color: "text-cyan-400",
    gradient: "from-cyan-600 to-teal-700",
    sections: [
      { id: "hero-1", type: "hero", label: "Hero Principal", visible: true, data: { title: "La Plataforma Todo-en-Uno para Tu Negocio", subtitle: "Automatiza, escala y crece con nuestra solución SaaS. Prueba gratis 14 días.", cta: "Prueba Gratis", ctaSecondary: "Ver Pricing", bg: "#0A1628" } },
      { id: "features-1", type: "features", label: "Características", visible: true, data: { title: "Funcionalidades Potentes", subtitle: "Todo lo que necesitas en una sola plataforma", f1_title: "Automatización", f1_desc: "Automatiza tareas repetitivas y ahorra horas cada semana", f2_title: "Analytics", f2_desc: "Dashboards en tiempo real con métricas que importan", f3_title: "Integraciones", f3_desc: "Conecta con +100 herramientas que ya usas" } },
      { id: "pricing-1", type: "pricing", label: "Precios", visible: true, data: { title: "Precios Simples y Transparentes", subtitle: "Sin sorpresas. Cancela cuando quieras.", p1_name: "Free", p1_price: "€0/mes", p1_features: "1 usuario, 100 contactos, Email", p2_name: "Pro", p2_price: "€49/mes", p2_features: "10 usuarios, 10K contactos, API, Soporte", p3_name: "Scale", p3_price: "€149/mes", p3_features: "Ilimitado, 100K contactos, API, Soporte 24/7, SSO" } },
      { id: "testimonials-1", type: "testimonials", label: "Testimonios", visible: true, data: { title: "Empresas que Confían en Nosotros", t1_name: "Roberto Díaz", t1_role: "CTO, ScaleUp", t1_text: "Redujimos costes operativos un 40% en 3 meses.", t2_name: "Isabel Moreno", t2_role: "COO, GrowthCo", t2_text: "La mejor inversión tecnológica que hemos hecho.", t3_name: "Miguel Ángel", t3_role: "Founder, DataFlow", t3_text: "Integraciones perfectas. Migración sin dolor." } },
      { id: "contact-1", type: "contact", label: "Contacto", visible: true, data: { title: "¿Listo para Empezar?", subtitle: "Habla con nuestro equipo de ventas", email: "sales@tusaas.com", phone: "+34 900 456 789", address: "Madrid, España" } },
      { id: "footer-1", type: "footer", label: "Footer", visible: true, data: { company: "TuSaaS Platform", tagline: "Automatiza. Escala. Crece.", copyright: "© 2026 TuSaaS. Todos los derechos reservados." } },
    ],
  },
  restaurant: {
    name: "Restaurante / Local",
    color: "text-amber-400",
    gradient: "from-amber-600 to-orange-700",
    sections: [
      { id: "hero-1", type: "hero", label: "Hero Principal", visible: true, data: { title: "Sabores que Enamoran", subtitle: "Cocina mediterránea de autor en el corazón de la ciudad. Reserva tu mesa hoy.", cta: "Reservar Mesa", ctaSecondary: "Ver Menú", bg: "#1A0F00" } },
      { id: "features-1", type: "features", label: "Especialidades", visible: true, data: { title: "Nuestras Especialidades", subtitle: "Ingredientes frescos, recetas con alma", f1_title: "Cocina de Mercado", f1_desc: "Ingredientes frescos del mercado local cada día", f2_title: "Carta de Vinos", f2_desc: "Selección de más de 200 referencias nacionales", f3_title: "Terraza Privada", f3_desc: "Espacio exclusivo para eventos y celebraciones" } },
      { id: "about-1", type: "about", label: "Nuestra Historia", visible: true, data: { title: "Nuestra Historia", description: "Desde 2010, ofrecemos una experiencia gastronómica única combinando tradición mediterránea con técnicas modernas. Cada plato cuenta una historia.", stat1: "15", stat1_label: "Años", stat2: "4.8★", stat2_label: "Google", stat3: "50K+", stat3_label: "Clientes" } },
      { id: "contact-1", type: "contact", label: "Reservas", visible: true, data: { title: "Reserva Tu Mesa", subtitle: "Abierto de martes a domingo", email: "reservas@restaurante.com", phone: "+34 912 345 678", address: "Calle Mayor 15, Madrid" } },
      { id: "footer-1", type: "footer", label: "Footer", visible: true, data: { company: "Restaurante La Mesa", tagline: "Cocina con alma desde 2010", copyright: "© 2026 Restaurante La Mesa. Todos los derechos reservados." } },
    ],
  },
  ecommerce: {
    name: "E-Commerce / Tienda",
    color: "text-emerald-400",
    gradient: "from-emerald-600 to-green-700",
    sections: [
      { id: "hero-1", type: "hero", label: "Hero Principal", visible: true, data: { title: "Tu Tienda Online, Tu Estilo", subtitle: "Productos exclusivos con envío gratis en pedidos +€50. Descubre las novedades.", cta: "Comprar Ahora", ctaSecondary: "Novedades", bg: "#0A1A12" } },
      { id: "features-1", type: "features", label: "Ventajas", visible: true, data: { title: "¿Por Qué Comprar Aquí?", subtitle: "La mejor experiencia de compra online", f1_title: "Envío Gratis", f1_desc: "En pedidos superiores a €50, envío gratuito a toda España", f2_title: "Devolución Fácil", f2_desc: "30 días para devolver sin preguntas", f3_title: "Pago Seguro", f3_desc: "Todas las tarjetas, PayPal, Bizum y más" } },
      { id: "testimonials-1", type: "testimonials", label: "Opiniones", visible: true, data: { title: "Opiniones de Clientes", t1_name: "Sofía Herrera", t1_role: "Cliente frecuente", t1_text: "Calidad increíble y envío rapidísimo. Mi tienda favorita.", t2_name: "David Ruiz", t2_role: "Comprador verificado", t2_text: "Excelente atención al cliente y productos premium.", t3_name: "Carmen López", t3_role: "Cliente desde 2022", t3_text: "Siempre encuentro lo que busco. Recomendado 100%." } },
      { id: "contact-1", type: "contact", label: "Contacto", visible: true, data: { title: "¿Necesitas Ayuda?", subtitle: "Nuestro equipo está aquí para ti", email: "soporte@tienda.com", phone: "+34 900 111 222", address: "Valencia, España" } },
      { id: "footer-1", type: "footer", label: "Footer", visible: true, data: { company: "Mi Tienda Online", tagline: "Calidad, estilo y confianza", copyright: "© 2026 Mi Tienda Online. Todos los derechos reservados." } },
    ],
  },
};

const SECTION_TYPES = [
  { type: "hero", label: "Hero / Banner", icon: Layout },
  { type: "features", label: "Características", icon: Star },
  { type: "about", label: "Sobre Nosotros", icon: Users },
  { type: "testimonials", label: "Testimonios", icon: Heart },
  { type: "pricing", label: "Precios", icon: Target },
  { type: "contact", label: "Contacto", icon: Mail },
  { type: "footer", label: "Footer", icon: Code },
];

const DEFAULT_SECTION_DATA: Record<string, Record<string, string>> = {
  hero: { title: "Tu Título Aquí", subtitle: "Descripción de tu negocio o servicio principal.", cta: "Empezar", ctaSecondary: "Saber Más", bg: "#0F172A" },
  features: { title: "Características", subtitle: "Lo que nos hace diferentes", f1_title: "Feature 1", f1_desc: "Descripción", f2_title: "Feature 2", f2_desc: "Descripción", f3_title: "Feature 3", f3_desc: "Descripción" },
  about: { title: "Sobre Nosotros", description: "Tu historia aquí...", stat1: "100+", stat1_label: "Clientes", stat2: "99%", stat2_label: "Satisfacción", stat3: "24/7", stat3_label: "Soporte" },
  testimonials: { title: "Testimonios", t1_name: "Nombre", t1_role: "Cargo", t1_text: "Testimonio...", t2_name: "Nombre", t2_role: "Cargo", t2_text: "Testimonio...", t3_name: "Nombre", t3_role: "Cargo", t3_text: "Testimonio..." },
  pricing: { title: "Precios", subtitle: "Planes para todos", p1_name: "Basic", p1_price: "€19/mes", p1_features: "Feature 1, Feature 2", p2_name: "Pro", p2_price: "€49/mes", p2_features: "Todo en Basic + más", p3_name: "Enterprise", p3_price: "€99/mes", p3_features: "Todo ilimitado" },
  contact: { title: "Contacto", subtitle: "Escríbenos", email: "info@ejemplo.com", phone: "+34 600 000 000", address: "Tu Ciudad" },
  footer: { company: "Tu Empresa", tagline: "Tu eslogan aquí", copyright: "© 2026 Tu Empresa" },
};

/* ═══════════════════════════════════════════════════════════════
   PREVIEW RENDERERS
   ═══════════════════════════════════════════════════════════════ */
function PreviewHero({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-16 px-6 text-center" style={{ background: `linear-gradient(135deg, ${data.bg || "#0F172A"}, #1E293B)` }}>
      <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{data.title}</h1>
      <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">{data.subtitle}</p>
      <div className="flex items-center justify-center gap-3">
        <span className="px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-bold">{data.cta}</span>
        {data.ctaSecondary && <span className="px-5 py-2.5 rounded-lg border border-white/20 text-white text-sm font-medium">{data.ctaSecondary}</span>}
      </div>
    </div>
  );
}

function PreviewFeatures({ data }: { data: Record<string, string> }) {
  const icons = [Zap, Shield, Sparkles];
  return (
    <div className="py-12 px-6 bg-[#0F1419]">
      <h2 className="text-2xl font-bold text-white text-center mb-2">{data.title}</h2>
      <p className="text-xs text-slate-400 text-center mb-8">{data.subtitle}</p>
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[1, 2, 3].map(i => {
          const Icon = icons[i - 1];
          return (
            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{data[`f${i}_title`]}</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">{data[`f${i}_desc`]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewAbout({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-12 px-6 bg-[#0A0E13]">
      <h2 className="text-2xl font-bold text-white text-center mb-4">{data.title}</h2>
      <p className="text-xs text-slate-400 text-center max-w-xl mx-auto mb-8 leading-relaxed">{data.description}</p>
      <div className="flex items-center justify-center gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center">
            <p className="text-2xl font-black text-white">{data[`stat${i}`]}</p>
            <p className="text-[10px] text-slate-500">{data[`stat${i}_label`]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewTestimonials({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-12 px-6 bg-[#0F1419]">
      <h2 className="text-2xl font-bold text-white text-center mb-8">{data.title}</h2>
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
            <p className="text-[10px] text-slate-300 leading-relaxed mb-3 italic">"{data[`t${i}_text`]}"</p>
            <p className="text-xs font-bold text-white">{data[`t${i}_name`]}</p>
            <p className="text-[9px] text-slate-500">{data[`t${i}_role`]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPricing({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-12 px-6 bg-[#0A0E13]">
      <h2 className="text-2xl font-bold text-white text-center mb-2">{data.title}</h2>
      <p className="text-xs text-slate-400 text-center mb-8">{data.subtitle}</p>
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className={cn("p-5 rounded-xl border text-center", i === 2 ? "bg-blue-500/[0.06] border-blue-500/20 ring-1 ring-blue-500/20" : "bg-white/[0.02] border-white/[0.06]")}>
            {i === 2 && <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mb-2 inline-block">POPULAR</span>}
            <h3 className="text-sm font-bold text-white mb-1">{data[`p${i}_name`]}</h3>
            <p className="text-2xl font-black text-white mb-3">{data[`p${i}_price`]}</p>
            <div className="space-y-1">
              {(data[`p${i}_features`] || "").split(",").map((f, idx) => (
                <p key={idx} className="text-[10px] text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" />{f.trim()}</p>
              ))}
            </div>
            <span className={cn("mt-4 inline-block px-4 py-1.5 rounded-lg text-xs font-bold", i === 2 ? "bg-blue-600 text-white" : "bg-white/[0.06] text-white")}>Elegir Plan</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContact({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-12 px-6 bg-[#0F1419]">
      <h2 className="text-2xl font-bold text-white text-center mb-2">{data.title}</h2>
      <p className="text-xs text-slate-400 text-center mb-8">{data.subtitle}</p>
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Mail className="w-4 h-4 text-blue-400" /><span className="text-xs text-white">{data.email}</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Phone className="w-4 h-4 text-emerald-400" /><span className="text-xs text-white">{data.phone}</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <MapPin className="w-4 h-4 text-amber-400" /><span className="text-xs text-white">{data.address}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-9 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
          <div className="h-9 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
        </div>
        <div className="h-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
        <span className="inline-block w-full text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Enviar Mensaje</span>
      </div>
    </div>
  );
}

function PreviewFooter({ data }: { data: Record<string, string> }) {
  return (
    <div className="py-8 px-6 bg-[#060A0F] border-t border-white/[0.04]">
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-1">{data.company}</p>
        <p className="text-[10px] text-slate-500 mb-3">{data.tagline}</p>
        <div className="flex items-center justify-center gap-3 mb-3">
          {["Twitter", "LinkedIn", "Instagram"].map(s => (
            <span key={s} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-[8px] text-slate-500">{s[0]}</span>
          ))}
        </div>
        <p className="text-[9px] text-slate-600">{data.copyright}</p>
      </div>
    </div>
  );
}

const SECTION_RENDERERS: Record<string, React.FC<{ data: Record<string, string> }>> = {
  hero: PreviewHero,
  features: PreviewFeatures,
  about: PreviewAbout,
  testimonials: PreviewTestimonials,
  pricing: PreviewPricing,
  contact: PreviewContact,
  footer: PreviewFooter,
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function SaasWebsiteBuilder() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [site, setSite] = useState<SiteData | null>(null);
  const [page, setPage] = useState<PageData>({ sections: [], seo_title: "", seo_description: "", seo_keywords: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activePanel, setActivePanel] = useState<"sections" | "seo" | "add">("sections");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [pageId, setPageId] = useState<number | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /* ── Load site data ── */
  const loadSite = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const siteRes = await client.entities.website_items.getById({ id: siteId });
      const siteData = siteRes.data as Record<string, unknown>;
      setSite({
        id: siteData.id as number,
        name: (siteData.name as string) || "",
        domain: (siteData.domain as string) || "",
        template: (siteData.template as string) || "",
        status: (siteData.status as string) || "draft",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
      });

      // Try to load existing page
      const pagesRes = await client.entities.website_pages.query({
        query: JSON.stringify({ website_id: Number(siteId) }),
        limit: 1,
      });
      const pages = (pagesRes.data?.items as Record<string, unknown>[]) || [];
      if (pages.length > 0) {
        const p = pages[0];
        const sectionsJson = (p.sections_json as string) || "[]";
        let sections: Section[] = [];
        try { sections = JSON.parse(sectionsJson); } catch { sections = []; }
        setPage({
          sections,
          seo_title: (p.seo_title as string) || "",
          seo_description: (p.seo_description as string) || "",
          seo_keywords: (p.seo_keywords as string) || "",
        });
        setPageId(p.id as number);
      } else {
        // No page yet — show template selector
        setShowTemplateSelector(true);
      }
    } catch {
      toast.error("Error cargando sitio web");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { if (user && siteId) loadSite(); }, [user, siteId, loadSite]);

  /* ── Apply template ── */
  const applyTemplate = (key: string) => {
    const tmpl = TEMPLATES[key];
    if (!tmpl) return;
    setPage(prev => ({
      ...prev,
      sections: tmpl.sections.map(s => ({ ...s, id: `${s.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
      seo_title: site?.name || "",
      seo_description: tmpl.sections[0]?.data.subtitle || "",
    }));
    setShowTemplateSelector(false);
    toast.success(`Plantilla "${tmpl.name}" aplicada`);
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        website_id: Number(siteId),
        page_name: "home",
        slug: "/",
        sections_json: JSON.stringify(page.sections),
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        seo_keywords: page.seo_keywords,
        is_published: false,
        sort_order: 0,
      };

      if (pageId) {
        await client.entities.website_pages.update({ id: String(pageId), data: payload });
      } else {
        const res = await client.entities.website_pages.create(payload);
        if (res.data?.id) setPageId(res.data.id as number);
      }
      toast.success("Sitio guardado correctamente");
    } catch {
      toast.error("Error guardando sitio");
    } finally {
      setSaving(false);
    }
  };

  /* ── Publish ── */
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await handleSave();
      await client.entities.website_items.update({
        id: String(siteId),
        data: {
          status: "published",
          seo_score: Math.min(100, 70 + (page.seo_title ? 10 : 0) + (page.seo_description ? 10 : 0) + (page.seo_keywords ? 10 : 0)),
          pages_count: 1,
          performance_score: 92,
        },
      });
      if (site) setSite({ ...site, status: "published" });
      toast.success("¡Sitio publicado exitosamente!");
    } catch {
      toast.error("Error publicando sitio");
    } finally {
      setPublishing(false);
    }
  };

  /* ── Section operations ── */
  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= page.sections.length) return;
    const arr = [...page.sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setPage(p => ({ ...p, sections: arr }));
  };

  const toggleSection = (id: string) => {
    setPage(p => ({
      ...p,
      sections: p.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s),
    }));
  };

  const deleteSection = (id: string) => {
    setPage(p => ({ ...p, sections: p.sections.filter(s => s.id !== id) }));
    if (editingSection === id) setEditingSection(null);
    toast.success("Sección eliminada");
  };

  const addSection = (type: string) => {
    const newSection: Section = {
      id: `${type}-${Date.now()}`,
      type,
      label: SECTION_TYPES.find(s => s.type === type)?.label || type,
      visible: true,
      data: { ...(DEFAULT_SECTION_DATA[type] || {}) },
    };
    setPage(p => ({ ...p, sections: [...p.sections, newSection] }));
    setActivePanel("sections");
    setEditingSection(newSection.id);
    toast.success("Sección añadida");
  };

  const updateSectionData = (sectionId: string, key: string, value: string) => {
    setPage(p => ({
      ...p,
      sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, data: { ...s.data, [key]: value } } : s
      ),
    }));
  };

  const previewWidth = previewMode === "desktop" ? "100%" : previewMode === "tablet" ? "768px" : "375px";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  /* ── Template Selector ── */
  if (showTemplateSelector) {
    return (
      <div className="min-h-screen bg-[#09090B] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" onClick={() => navigate("/saas/websites")} className="text-zinc-400 h-8">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Elige una Plantilla</h1>
              <p className="text-xs text-zinc-500">Selecciona una plantilla profesional para empezar a construir tu sitio web</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
              <button key={key} onClick={() => applyTemplate(key)}
                className="text-left rounded-xl border border-white/[0.06] bg-[#0F1419] hover:border-cyan-500/20 transition-all overflow-hidden group">
                <div className={cn("h-32 bg-gradient-to-br flex items-center justify-center", tmpl.gradient)}>
                  <Globe className="w-10 h-10 text-white/30 group-hover:text-white/50 transition-colors" />
                </div>
                <div className="p-4">
                  <h3 className={cn("text-sm font-bold mb-1", tmpl.color)}>{tmpl.name}</h3>
                  <p className="text-[10px] text-zinc-500">{tmpl.sections.length} secciones incluidas</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.sections.map(s => (
                      <span key={s.id} className="px-1.5 py-0.5 rounded text-[8px] bg-white/[0.04] text-zinc-500">{s.label}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => { setShowTemplateSelector(false); }} className="border-white/10 text-zinc-400">
              Empezar en Blanco
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Builder ── */
  const editingSec = page.sections.find(s => s.id === editingSection);

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      {/* ── Top Bar ── */}
      <div className="h-12 bg-[#0A0E13] border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/saas/websites")} className="text-zinc-400 h-7 px-2">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">{site?.name || "Website Builder"}</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold",
              site?.status === "published" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            )}>{site?.status === "published" ? "PUBLICADO" : "BORRADOR"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview mode toggles */}
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            {([
              { mode: "desktop" as const, icon: Monitor },
              { mode: "tablet" as const, icon: Tablet },
              { mode: "mobile" as const, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setPreviewMode(mode)}
                className={cn("p-1.5 rounded-md transition-colors", previewMode === mode ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-white")}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <Button size="sm" variant="outline" onClick={() => setShowTemplateSelector(true)} className="border-white/10 text-zinc-400 h-7 text-[10px]">
            <Palette className="w-3 h-3 mr-1" /> Plantillas
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500 text-white h-7 text-[10px]">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white h-7 text-[10px]">
            {publishing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Rocket className="w-3 h-3 mr-1" />} Publicar
          </Button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel (Sections / SEO / Add) ── */}
        <div className="w-72 bg-[#0A0E13] border-r border-white/[0.06] flex flex-col shrink-0">
          {/* Panel Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {([
              { key: "sections" as const, label: "Secciones", icon: Layout },
              { key: "seo" as const, label: "SEO", icon: Search },
              { key: "add" as const, label: "Añadir", icon: Plus },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActivePanel(tab.key)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors border-b-2",
                  activePanel === tab.key ? "text-cyan-400 border-cyan-400" : "text-zinc-500 border-transparent hover:text-white"
                )}>
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* Sections List */}
            {activePanel === "sections" && (
              <div className="space-y-1.5">
                {page.sections.length === 0 ? (
                  <div className="text-center py-10">
                    <Layout className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-[10px] text-zinc-600 mb-2">Sin secciones</p>
                    <Button size="sm" onClick={() => setActivePanel("add")} className="bg-cyan-600 text-white text-[10px] h-7">
                      <Plus className="w-3 h-3 mr-1" /> Añadir Sección
                    </Button>
                  </div>
                ) : page.sections.map((section, idx) => {
                  const SType = SECTION_TYPES.find(s => s.type === section.type);
                  const Icon = SType?.icon || Layout;
                  return (
                    <div key={section.id}
                      className={cn("flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                        editingSection === section.id ? "bg-cyan-500/[0.06] border-cyan-500/20" : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]",
                        !section.visible && "opacity-40"
                      )}
                      onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}>
                      <GripVertical className="w-3 h-3 text-zinc-600 shrink-0 cursor-grab" />
                      <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] font-medium text-white flex-1 truncate">{section.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, -1); }} className="p-0.5 text-zinc-600 hover:text-white"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 1); }} className="p-0.5 text-zinc-600 hover:text-white"><ChevronDown className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} className={cn("p-0.5", section.visible ? "text-emerald-400" : "text-zinc-600")}>
                          <Eye className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="p-0.5 text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SEO Panel */}
            {activePanel === "seo" && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">SEO Automático</span>
                  </div>
                  <p className="text-[9px] text-zinc-500">Completa estos campos para mejorar tu posicionamiento en Google</p>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-1 block">Título SEO</label>
                  <Input value={page.seo_title} onChange={e => setPage(p => ({ ...p, seo_title: e.target.value }))}
                    placeholder="Título para Google (60 chars)" maxLength={60}
                    className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  <p className="text-[8px] text-zinc-600 mt-0.5">{page.seo_title.length}/60 caracteres</p>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-1 block">Meta Descripción</label>
                  <textarea value={page.seo_description} onChange={e => setPage(p => ({ ...p, seo_description: e.target.value }))}
                    placeholder="Descripción para Google (160 chars)" maxLength={160} rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
                  <p className="text-[8px] text-zinc-600 mt-0.5">{page.seo_description.length}/160 caracteres</p>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-1 block">Palabras Clave</label>
                  <Input value={page.seo_keywords} onChange={e => setPage(p => ({ ...p, seo_keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                    className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>

                {/* SEO Preview */}
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-2 block">Vista Previa en Google</label>
                  <div className="p-3 rounded-lg bg-white border">
                    <p className="text-sm text-blue-700 font-medium truncate">{page.seo_title || site?.name || "Título de tu sitio"}</p>
                    <p className="text-[10px] text-green-700 truncate">{site?.domain || "tusitio.nelvyon.com"}</p>
                    <p className="text-[10px] text-gray-600 line-clamp-2">{page.seo_description || "Descripción de tu sitio web..."}</p>
                  </div>
                </div>

                {/* SEO Score */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white">SEO Score</span>
                    <span className="text-sm font-black text-emerald-400">
                      {Math.min(100, 40 + (page.seo_title ? 20 : 0) + (page.seo_description ? 20 : 0) + (page.seo_keywords ? 20 : 0))}/100
                    </span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: "Título SEO", done: !!page.seo_title },
                      { label: "Meta Descripción", done: !!page.seo_description },
                      { label: "Palabras Clave", done: !!page.seo_keywords },
                      { label: "SSL Activo", done: true },
                      { label: "Responsive", done: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.done ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                        <span className={cn("text-[9px]", item.done ? "text-zinc-400" : "text-red-400")}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add Section Panel */}
            {activePanel === "add" && (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 mb-2">Haz clic para añadir una sección</p>
                {SECTION_TYPES.map(st => (
                  <button key={st.type} onClick={() => addSection(st.type)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <st.icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{st.label}</p>
                      <p className="text-[9px] text-zinc-600">Sección de {st.label.toLowerCase()}</p>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-600 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Center: Live Preview ── */}
        <div className="flex-1 bg-[#111318] overflow-y-auto flex justify-center p-4">
          <div ref={previewRef} className="transition-all duration-300 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0A0E13] shadow-2xl"
            style={{ width: previewWidth, maxWidth: "100%" }}>
            {/* Browser chrome */}
            <div className="h-8 bg-[#1A1E25] border-b border-white/[0.06] flex items-center px-3 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-md px-2 py-1">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[9px] text-zinc-400 truncate">{site?.domain || "tusitio.nelvyon.com"}</span>
                </div>
              </div>
            </div>

            {/* Page content */}
            {page.sections.filter(s => s.visible).length === 0 ? (
              <div className="py-20 text-center">
                <Layout className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 mb-2">Tu sitio web está vacío</p>
                <p className="text-xs text-zinc-600 mb-4">Elige una plantilla o añade secciones manualmente</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => setShowTemplateSelector(true)} className="bg-cyan-600 text-white text-[10px] h-7">
                    <Palette className="w-3 h-3 mr-1" /> Elegir Plantilla
                  </Button>
                  <Button size="sm" onClick={() => setActivePanel("add")} variant="outline" className="border-white/10 text-zinc-400 text-[10px] h-7">
                    <Plus className="w-3 h-3 mr-1" /> Añadir Sección
                  </Button>
                </div>
              </div>
            ) : (
              page.sections.filter(s => s.visible).map(section => {
                const Renderer = SECTION_RENDERERS[section.type];
                if (!Renderer) return null;
                return (
                  <div key={section.id}
                    onClick={() => { setEditingSection(section.id); setActivePanel("sections"); }}
                    className={cn("relative cursor-pointer transition-all",
                      editingSection === section.id && "ring-2 ring-cyan-500/40 ring-inset"
                    )}>
                    {editingSection === section.id && (
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-cyan-600 rounded-md px-2 py-0.5">
                        <span className="text-[8px] font-bold text-white">{section.label}</span>
                      </div>
                    )}
                    <Renderer data={section.data} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Section Editor ── */}
        {editingSec && (
          <div className="w-72 bg-[#0A0E13] border-l border-white/[0.06] flex flex-col shrink-0">
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-white">{editingSec.label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)} className="h-6 w-6 p-0 text-zinc-400">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Object.entries(editingSec.data).map(([key, value]) => {
                const isLong = value.length > 60 || key === "description" || key.includes("text") || key.includes("features");
                const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={key}>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">{label}</label>
                    {isLong ? (
                      <textarea value={value} onChange={e => updateSectionData(editingSec.id, key, e.target.value)}
                        rows={3} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-white resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
                    ) : key === "bg" ? (
                      <div className="flex items-center gap-2">
                        <input type="color" value={value} onChange={e => updateSectionData(editingSec.id, key, e.target.value)}
                          className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
                        <Input value={value} onChange={e => updateSectionData(editingSec.id, key, e.target.value)}
                          className="bg-white/5 border-white/10 text-white text-[11px] h-8 flex-1" />
                      </div>
                    ) : (
                      <Input value={value} onChange={e => updateSectionData(editingSec.id, key, e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-[11px] h-8" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}