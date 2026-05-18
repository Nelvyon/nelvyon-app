import { useState } from "react";
import {
  Eye, Crown,
  Building2, ShoppingCart, Stethoscope, GraduationCap, Utensils,
  Briefcase, Hammer, Plane, Car, Dumbbell, Home, Scissors,
  Gem, Scale, Landmark, Cpu, Shirt, Camera, type LucideIcon,
  ChevronRight, ChevronDown, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectorDemo {
  sector: string;
  icon: LucideIcon;
  color: string;
  example: string;
  useCase: string;
}

const sectorDemos: Record<string, SectorDemo[]> = {
  crm: [
    { sector: "Tecnología", icon: Cpu, color: "text-cyan-400", example: "SaaS Startup", useCase: "Gestiona leads de producto, segmenta por plan y LTV" },
    { sector: "Salud", icon: Stethoscope, color: "text-red-400", example: "Clínica Dental", useCase: "Historial de pacientes, citas, tratamientos y seguimiento" },
    { sector: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", example: "Tienda Online", useCase: "Segmentación por compras, carrito abandonado, VIP" },
    { sector: "Hostelería", icon: Utensils, color: "text-orange-400", example: "Restaurante", useCase: "Reservas, preferencias, alergias, programa fidelidad" },
    { sector: "Consultoría", icon: Briefcase, color: "text-violet-400", example: "Consultora", useCase: "Pipeline de proyectos, propuestas, contratos, facturación" },
    { sector: "Inmobiliaria", icon: Home, color: "text-teal-400", example: "Inmobiliaria", useCase: "Propiedades, compradores, visitas, documentación" },
    { sector: "Educación", icon: GraduationCap, color: "text-blue-400", example: "Academia", useCase: "Alumnos, matrículas, pagos, seguimiento académico" },
    { sector: "Belleza", icon: Gem, color: "text-fuchsia-400", example: "Peluquería", useCase: "Clientes, servicios favoritos, citas, productos" },
    { sector: "Construcción", icon: Hammer, color: "text-amber-400", example: "Constructora", useCase: "Proyectos, presupuestos, subcontratas, plazos" },
    { sector: "Legal", icon: Scale, color: "text-gray-400", example: "Despacho", useCase: "Casos, clientes, documentos, facturación horaria" },
    { sector: "Automoción", icon: Car, color: "text-slate-400", example: "Concesionario", useCase: "Stock, leads, test drives, financiación, postventa" },
    { sector: "Fitness", icon: Dumbbell, color: "text-lime-400", example: "Gimnasio", useCase: "Socios, planes, asistencia, renovaciones" },
    { sector: "Turismo", icon: Plane, color: "text-sky-400", example: "Agencia Viajes", useCase: "Viajeros, reservas, itinerarios, pagos" },
    { sector: "Moda", icon: Shirt, color: "text-pink-400", example: "Boutique", useCase: "Clientes VIP, tallas, preferencias, colecciones" },
    { sector: "Servicios", icon: Scissors, color: "text-indigo-400", example: "Empresa Limpieza", useCase: "Clientes, servicios, horarios, facturación" },
    { sector: "Finanzas", icon: Landmark, color: "text-emerald-400", example: "Asesoría Fiscal", useCase: "Clientes, declaraciones, plazos, documentos" },
    { sector: "Fotografía", icon: Camera, color: "text-rose-400", example: "Fotógrafo", useCase: "Sesiones, galerías, entregas, facturación" },
    { sector: "Autónomos", icon: Building2, color: "text-violet-400", example: "Freelancer", useCase: "Clientes, proyectos, facturas, tiempo" },
  ],
  pipelines: [
    { sector: "Tecnología", icon: Cpu, color: "text-cyan-400", example: "SaaS B2B", useCase: "Pipeline de demos → trials → suscripciones" },
    { sector: "Inmobiliaria", icon: Home, color: "text-teal-400", example: "Inmobiliaria", useCase: "Visitas → ofertas → negociación → cierre" },
    { sector: "Consultoría", icon: Briefcase, color: "text-violet-400", example: "Consultora", useCase: "Lead → propuesta → negociación → contrato" },
    { sector: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", example: "Mayorista", useCase: "Contacto → muestra → pedido → recompra" },
    { sector: "Educación", icon: GraduationCap, color: "text-blue-400", example: "Universidad", useCase: "Interesado → info → matrícula → inscrito" },
    { sector: "Salud", icon: Stethoscope, color: "text-red-400", example: "Clínica", useCase: "Consulta → diagnóstico → tratamiento → seguimiento" },
  ],
  marketing: [
    { sector: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", example: "Tienda Online", useCase: "Welcome series, carrito abandonado, reactivación" },
    { sector: "Salud", icon: Stethoscope, color: "text-red-400", example: "Clínica", useCase: "Recordatorios citas, tips salud, promociones" },
    { sector: "Educación", icon: GraduationCap, color: "text-blue-400", example: "Academia", useCase: "Nurturing leads, info cursos, testimonios" },
    { sector: "Hostelería", icon: Utensils, color: "text-orange-400", example: "Restaurante", useCase: "Menú semanal, eventos, programa fidelidad" },
    { sector: "Fitness", icon: Dumbbell, color: "text-lime-400", example: "Gimnasio", useCase: "Tips fitness, renovaciones, nuevas clases" },
    { sector: "Moda", icon: Shirt, color: "text-pink-400", example: "Boutique", useCase: "Nuevas colecciones, ofertas VIP, lookbooks" },
  ],
  workflows: [
    { sector: "Tecnología", icon: Cpu, color: "text-cyan-400", example: "SaaS", useCase: "Onboarding → activación → upgrade → renovación" },
    { sector: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", example: "Tienda", useCase: "Pedido → pago → envío → seguimiento → review" },
    { sector: "Salud", icon: Stethoscope, color: "text-red-400", example: "Clínica", useCase: "Cita → recordatorio → consulta → receta → seguimiento" },
    { sector: "Legal", icon: Scale, color: "text-gray-400", example: "Despacho", useCase: "Caso → documentos → plazos → resolución → factura" },
    { sector: "Consultoría", icon: Briefcase, color: "text-violet-400", example: "Consultora", useCase: "Lead → propuesta → proyecto → entrega → cobro" },
    { sector: "Servicios", icon: Scissors, color: "text-indigo-400", example: "Limpieza", useCase: "Solicitud → presupuesto → servicio → factura → review" },
  ],
};

/* Fallback: generate generic demos for any service key */
function getDemos(serviceKey: string): SectorDemo[] {
  if (sectorDemos[serviceKey]) return sectorDemos[serviceKey];
  return [
    { sector: "Tecnología", icon: Cpu, color: "text-cyan-400", example: "SaaS / Startup", useCase: "Uso completo del servicio adaptado a empresas tech" },
    { sector: "Salud", icon: Stethoscope, color: "text-red-400", example: "Clínicas / Médicos", useCase: "Servicio adaptado al sector sanitario" },
    { sector: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", example: "Tiendas Online", useCase: "Optimizado para comercio electrónico" },
    { sector: "Hostelería", icon: Utensils, color: "text-orange-400", example: "Restaurantes / Bares", useCase: "Adaptado a hostelería y restauración" },
    { sector: "Educación", icon: GraduationCap, color: "text-blue-400", example: "Academias / Cursos", useCase: "Personalizado para educación" },
    { sector: "Consultoría", icon: Briefcase, color: "text-violet-400", example: "Consultoras / Coaches", useCase: "Diseñado para servicios profesionales" },
    { sector: "Inmobiliaria", icon: Home, color: "text-teal-400", example: "Inmobiliarias", useCase: "Adaptado al sector inmobiliario" },
    { sector: "Belleza", icon: Gem, color: "text-fuchsia-400", example: "Peluquerías / Spas", useCase: "Optimizado para belleza y estética" },
    { sector: "Legal", icon: Scale, color: "text-gray-400", example: "Abogados / Gestorías", useCase: "Configurado para servicios legales" },
    { sector: "Fitness", icon: Dumbbell, color: "text-lime-400", example: "Gimnasios / Entrenadores", useCase: "Adaptado a fitness y bienestar" },
    { sector: "Autónomos", icon: Building2, color: "text-violet-400", example: "Freelancers / Autónomos", useCase: "Perfecto para profesionales independientes" },
    { sector: "Construcción", icon: Hammer, color: "text-amber-400", example: "Constructoras / Reformas", useCase: "Diseñado para construcción y obras" },
  ];
}

interface InlineServiceDemoProps {
  serviceKey: string;
  serviceName: string;
}

export function InlineServiceDemo({ serviceKey, serviceName }: InlineServiceDemoProps) {
  const [expanded, setExpanded] = useState(false);
  const demos = getDemos(serviceKey);
  const visibleDemos = expanded ? demos : demos.slice(0, 6);

  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-500/[0.04] to-emerald-500/[0.04] border border-violet-500/10 p-5 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">{serviceName} — Adaptable a tu sector</h3>
          <Crown className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-bold">{demos.length}+ SECTORES</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mb-4">
        Cada sector tiene su configuración personalizada. La plataforma adapta automáticamente {serviceName} a tu tipo de negocio.
      </p>

      {/* Sector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visibleDemos.map((demo) => {
          const Icon = demo.icon;
          return (
            <div
              key={demo.sector}
              className="group p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-violet-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-violet-500/10 transition-colors")}>
                  <Icon className={cn("w-3.5 h-3.5", demo.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">{demo.sector}</p>
                  <p className="text-[9px] text-slate-600 truncate">{demo.example}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{demo.useCase}</p>
            </div>
          );
        })}
      </div>

      {/* Show More */}
      {demos.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-slate-400 font-medium transition-all"
        >
          {expanded ? (
            <>Ver menos <ChevronDown className="w-3 h-3 rotate-180" /></>
          ) : (
            <>Ver {demos.length - 6} sectores más <ChevronRight className="w-3 h-3" /></>
          )}
        </button>
      )}

      {/* Universal Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["Autónomos", "Microempresas", "Pymes", "Enterprise", "Startups", "Agencias", "Freelancers"].map((t) => (
            <span key={t} className="px-2 py-0.5 rounded bg-white/[0.04] text-[8px] text-slate-500 font-medium">{t}</span>
          ))}
        </div>
        <p className="text-[9px] text-slate-600 text-center mt-2">
          <Sparkles className="w-2.5 h-2.5 inline mr-1 text-amber-400" />
          NELVYON adapta {serviceName} a <strong className="text-white">cualquier sector y tamaño de empresa</strong>.
        </p>
      </div>
    </div>
  );
}