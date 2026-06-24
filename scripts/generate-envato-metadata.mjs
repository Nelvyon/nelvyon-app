import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

const SECTORS = {
  dental: {
    headlines: ["Clínica Dental Moderna","Tu Sonrisa en Manos Expertas","Tratamientos sin Dolor","Tecnología Dental Avanzada","Implantes y Ortodoncia Premium","Clínica Odontológica Familiar","Tu Dentista de Confianza","Estética Dental de Vanguardia","Especialistas en Blanqueamiento","Endodoncia sin Molestias","Periodoncia Avanzada","Prótesis Dentales Perfectas","Clínica Dental 24 Horas","Urgencias Dentales en {{city}}","Diagnóstico Digital 3D","Cirugía Oral Especializada","Sedación Consciente","Clínica Dental Eco-Friendly","Atención Pediátrica Dental","Brackets Invisibles","Carillas de Porcelana","Diseño de Sonrisa Digital","Check-Up Dental Completo","Dental con Financiación","Plan de Salud Dental Familiar","Dental Estudio {{city}}","SmilePro Clínica","DentalCare Premium","OrthoFix Dental","Implant Center {{city}}","Clínica Sonrisa Perfecta","Tu Dentista Online","Perio & Implants {{city}}","OralHealth Studio","Dental Express {{city}}","WhiteSmile Clínica","Bracketon Ortodoncia","DentaFirst {{city}}","ClearBraces {{city}}","Royal Dental {{city}}","SmileMakers Clínica","Dental 360 {{city}}","BrightTeeth Clínica","PerfectSmile {{city}}","DentalArt Studio","OrthoWorld {{city}}","DentalPlus Clínica","SmileUp {{city}}","HealthSmile Dental","Dental Premium {{city}}"],
    cta: "Pedir cita",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres reservar cita dental?",
  },
  legal: {
    headlines: ["Abogados Especialistas","Defensa Legal con Resultados","Tu Despacho de Confianza","Asesoría Jurídica Integral","Derecho Laboral y Civil","Abogados de Empresa","Consulta Legal Gratuita","Protección Jurídica 360","Especialistas en Divorcios","Derecho Penal Avanzado","Abogados Mercantiles","Derecho Inmobiliario","Herencias y Testamentos","Derecho de Familia","Propiedad Intelectual","Compliance y RGPD","Abogados Internacionales","Derecho Tributario","Mediación y Arbitraje","Abogados Startup","LexPrime Abogados","LegalFirst {{city}}","JurisGroup Abogados","Lex & Partners {{city}}","Bufete Jurídico {{city}}","Despacho Legal {{city}}","Martínez Legal {{city}}","Abogados Premium {{city}}","LexCorp {{city}}","JurisNet Abogados","Law Group {{city}}","Bufete Internacional","Abogados 24/7","Legal Express {{city}}","LexAdvance {{city}}","Consulta Online","LexMinds Abogados","Derecho Total {{city}}","AbogadoPro {{city}}","LexForce Abogados","Justilex {{city}}","LegalPro Network","Bufete Elite {{city}}","LexPartners {{city}}","AbogaFácil {{city}}","Derecho Claro {{city}}","JurisMax Abogados","Lex360 {{city}}","AbogadoYa {{city}}","Bufete {{city}}"],
    cta: "Consultar ahora",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Tienes alguna consulta legal?",
  },
  fitness: {
    headlines: ["Tu Transformación Comienza Aquí","Gimnasio de Alto Rendimiento","Clases Dirigidas Todo el Día","Entrenamiento Personal Elite","Box y CrossFit Premium","Yoga y Pilates Studio","Gym con Piscina","Fitness 24 Horas","Spinning y Cardio","Musculación y Nutrición","FitPro Gym {{city}}","PowerZone Fitness","IronBody Gym {{city}}","FlexFit Studio","UrbanGym {{city}}","BestShape Fitness","TopFit {{city}}","GymXL {{city}}","FitClub Premium","ActiveBody {{city}}","FitnessPro {{city}}","MegaGym {{city}}","FitWorks {{city}}","PureGym {{city}}","GymElite {{city}}","BodyPower {{city}}","FitCenter {{city}}","SportPlus {{city}}","GymFirst {{city}}","FitZone {{city}}","MaxFit {{city}}","ProGym {{city}}","GymStar {{city}}","FitLife {{city}}","GymPro {{city}}","BurnFit {{city}}","CoreGym {{city}}","MusclePeak {{city}}","FitHouse {{city}}","ActiveGym {{city}}","FitMax {{city}}","GymUp {{city}}","FitNow {{city}}","GymCore {{city}}","FitExcel {{city}}","GymForce {{city}}","FitHub {{city}}","GymPlus {{city}}","FitWave {{city}}","GymPower {{city}}"],
    cta: "Prueba gratis 7 días",
    greeting: "Hola, soy el asistente de {{business_name}}. Prueba nuestras clases gratis esta semana.",
  },
  beauty: {
    headlines: ["Belleza que Habla por Ti","Tratamientos Estéticos de Lujo","Medicina Estética Avanzada","Láser y Fotodepilación","Botox y Rellenos Premium","Mesoterapia Corporal","Clínica de Nutrición Estética","Micropigmentación Avanzada","Tratamientos Reductores","Clínica Anti-Aging","BeautyMed {{city}}","LuxeEsthetics {{city}}","GlowClinic {{city}}","BeautyPro {{city}}","EsteticaPlus {{city}}","Skin & Beauty {{city}}","BeautyCare {{city}}","LaserBeauty {{city}}","EsteticaElite {{city}}","GlowUp {{city}}","SkinPro {{city}}","BeautyFirst {{city}}","EstheticWorld {{city}}","GlowCenter {{city}}","BeautyStudio {{city}}","SkinLab {{city}}","BeautyMedic {{city}}","EsteticaNova {{city}}","BeautyMax {{city}}","SkinCare {{city}}","BeautyArt {{city}}","GlowMed {{city}}","EsteticaPro {{city}}","BeautyZone {{city}}","SkinGlow {{city}}","BeautyPlus {{city}}","EsteticaXL {{city}}","GlowClinic Plus {{city}}","BeautyForce {{city}}","SkinFirst {{city}}","BeautyCore {{city}}","GlowPro {{city}}","EsteticaUp {{city}}","BeautyElite {{city}}","SkinMax {{city}}","BeautyHub {{city}}","GlowStar {{city}}","EsteticaArt {{city}}","BeautyNow {{city}}","SkinPower {{city}}"],
    cta: "Valoración gratuita",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Qué tratamiento estético te interesa?",
  },
  restaurant: {
    headlines: ["Sabor Auténtico","La Cocina de Toda la Vida","Tu Mesa Favorita","Gastronomía de Mercado","Cocina de Autor","Menú Degustación Premium","Terraza con Vistas","Restaurante Familiar","Brunch & Lunch {{city}}","El Mejor Sushi de {{city}}","La Encina {{city}}","Taberna del Mar {{city}}","El Rincón Gourmet","Bistró Moderno {{city}}","Casa de Comidas {{city}}","El Mercado {{city}}","La Bodega Restaurante","Terraza Verde {{city}}","Chef Table {{city}}","Cocina de Fusión {{city}}","Asador Premium {{city}}","La Tasca {{city}}","Restaurante XO {{city}}","Cocina Abierta {{city}}","El Fogón {{city}}","Mare {{city}}","La Huerta {{city}}","Bistró 360 {{city}}","El Muelle {{city}}","La Taberna {{city}}","Buena Vista Restaurant","La Terraza del Chef","El Jardín Gastronómico","Cocina km0 {{city}}","Mesa & Mantel {{city}}","La Cantina {{city}}","El Patio {{city}}","Restaurante Nativo","Menú del Día {{city}}","La Finca Restaurant","El Corredor del Sabor","Mesa Grande {{city}}","La Esquina {{city}}","Restaurante Auténtico","El Zaguán {{city}}","Sabores de {{city}}","La Paella de {{city}}","Cocina de {{city}}","El Asador {{city}}","La Barca {{city}}"],
    cta: "Reservar mesa",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres reservar una mesa?",
  },
  real_estate: {
    headlines: ["Tu Piso Ideal en {{city}}","Vende más Rápido","Inmobiliaria de Confianza","Tasación Gratuita en 24h","Pisos, Chalets y Locales","Alquiler con Garantía","Tu Agente Inmobiliario","Compra sin Sorpresas","Inversión Inmobiliaria","Obra Nueva en {{city}}","Horizon {{city}}","Pisos Prime {{city}}","HomeFinder {{city}}","RealEstate Pro {{city}}","PisoYa {{city}}","CasaFácil {{city}}","InmoElite {{city}}","PropBuy {{city}}","CasaPlus {{city}}","InmoGroup {{city}}","RealPro {{city}}","HomePlus {{city}}","InmoMax {{city}}","CasaFirst {{city}}","PropElite {{city}}","HomeStar {{city}}","InmoNet {{city}}","CasaPro {{city}}","RealFirst {{city}}","HomeMax {{city}}","InmoCorp {{city}}","CasaElite {{city}}","PropMax {{city}}","HomeGroup {{city}}","InmoStar {{city}}","CasaNet {{city}}","RealMax {{city}}","HomeCorp {{city}}","InmoFirst {{city}}","CasaGroup {{city}}","PropNet {{city}}","HomePro {{city}}","InmoPrime {{city}}","CasaStar {{city}}","RealGroup {{city}}","HomeNet {{city}}","InmoPlus {{city}}","CasaMax {{city}}","PropPrime {{city}}","HomePrime {{city}}"],
    cta: "Pedir tasación",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Buscas comprar, vender o alquilar?",
  },
  ecommerce: {
    headlines: ["Envío en 24h Garantizado","Tienda Online de Confianza","Los Mejores Precios Online","Calidad Premium sin Intermediarios","Devolución Gratis 30 Días","Compra Segura con Garantía","Envío Gratis desde 50€","Outlet Premium Online","Novedades Cada Semana","Atención al Cliente 24/7","ShopPlus Online","MegaShop {{city}}","BuyNow Store","QuickShop Online","ShopElite {{city}}","FastBuy Store","ShopPro Online","MegaBuy {{city}}","QuickStore Online","BuyElite {{city}}","ShopMax Online","FastStore {{city}}","BuyPro Online","MegaStore Plus","QuickBuy Online","ShopFirst {{city}}","BuyMax Online","FastElite Store","ShopStar Online","MegaFirst {{city}}","QuickElite Store","BuyFirst Online","ShopCore {{city}}","FastMax Store","BuyCore Online","MegaElite {{city}}","QuickCore Store","ShopForce Online","BuyForce {{city}}","FastCore Store","ShopHub Online","BuyHub {{city}}","FastHub Store","MegaHub Online","QuickHub {{city}}","BuyWave Store","ShopWave Online","FastWave {{city}}","MegaWave Store","ShopPower Online"],
    cta: "Comprar ahora",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Qué producto buscas hoy?",
  },
  solar: {
    headlines: ["Ahorra hasta 70% en Luz","Instalación Solar Profesional","Autoconsumo Llave en Mano","Sin Permanencia","Estudio Gratuito en 48h","Paneles de Alta Eficiencia","Instalación y Mantenimiento","Energía Limpia y Ahorro","Subvenciones Tramitadas","Instalador Certificado {{city}}","SolarPro {{city}}","EnergiaSolar {{city}}","SunPower {{city}}","SolarElite {{city}}","SunFirst {{city}}","SolarMax {{city}}","EnerSol {{city}}","SunPro {{city}}","SolarFirst {{city}}","SunMax {{city}}","SolarHub {{city}}","SunHub {{city}}","SolarCore {{city}}","SunCore {{city}}","SolarNet {{city}}","SunNet {{city}}","SolarStar {{city}}","SunStar {{city}}","SolarPlus {{city}}","SunPlus {{city}}","SolarGroup {{city}}","SunGroup {{city}}","SolarForce {{city}}","SunForce {{city}}","SolarWave {{city}}","SunWave {{city}}","SolarPrime {{city}}","SunPrime {{city}}","SolarUp {{city}}","SunUp {{city}}","SolarNow {{city}}","SunNow {{city}}","SolarYa {{city}}","SunYa {{city}}","Solar360 {{city}}","Sun360 {{city}}","SolarXL {{city}}","SunXL {{city}}","SolarGo {{city}}","SunGo {{city}}"],
    cta: "Estudio gratuito",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres un estudio solar gratuito?",
  },
  coaching: {
    headlines: ["Desbloquea Tu Potencial","Programa de Alto Rendimiento","Coaching de Negocios","Mentoría para Emprendedores","Lidera con Propósito","Sesión Estratégica Gratuita","Transforma Tu Empresa en 90 Días","Coaching Ejecutivo Premium","Tu Mentor de Confianza","Método Probado","CoachPro {{city}}","MentorElite {{city}}","CoachFirst {{city}}","MentorMax {{city}}","CoachPlus {{city}}","MentorPro {{city}}","CoachMax {{city}}","MentorFirst {{city}}","CoachElite {{city}}","MentorPlus {{city}}","CoachHub {{city}}","MentorHub {{city}}","CoachCore {{city}}","MentorCore {{city}}","CoachNet {{city}}","MentorNet {{city}}","CoachStar {{city}}","MentorStar {{city}}","CoachForce {{city}}","MentorForce {{city}}","CoachWave {{city}}","MentorWave {{city}}","CoachGroup {{city}}","MentorGroup {{city}}","CoachPrime {{city}}","MentorPrime {{city}}","CoachUp {{city}}","MentorUp {{city}}","CoachNow {{city}}","MentorNow {{city}}","CoachYa {{city}}","MentorYa {{city}}","Coach360 {{city}}","Mentor360 {{city}}","CoachXL {{city}}","MentorXL {{city}}","CoachGo {{city}}","MentorGo {{city}}","CoachLive {{city}}","MentorLive {{city}}"],
    cta: "Sesión gratuita",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres una sesión de descubrimiento gratuita?",
  },
  saas_b2b: {
    headlines: ["Software que Hace Crecer tu Negocio","Trial 14 Días sin Tarjeta","Automatiza tu Proceso Comercial","ROI Positivo en 30 Días","Integra con tus Herramientas","Soporte Dedicado y Onboarding","Dashboard Ejecutivo en Tiempo Real","API Abierta y Extensible","Plan Starter Gratuito","SaaS B2B Favorito","SaaSPro Platform","B2BFirst Software","CloudBiz {{city}}","SaaSElite Platform","B2BMax Software","AppBiz {{city}}","SaaSFirst Platform","B2BPro Software","CloudPro {{city}}","SaaSMax Platform","B2BHub Software","AppHub {{city}}","SaaSHub Platform","B2BCore Software","CloudCore {{city}}","SaaSCore Platform","B2BNet Software","AppNet {{city}}","SaaSNet Platform","B2BStar Software","CloudStar {{city}}","SaaSStar Platform","B2BForce Software","AppForce {{city}}","SaaSForce Platform","B2BWave Software","CloudWave {{city}}","SaaSWave Platform","B2BGroup Software","AppGroup {{city}}","SaaSGroup Platform","B2BPrime Software","CloudPrime {{city}}","SaaSPrime Platform","B2BUp Software","AppUp {{city}}","SaaSUp Platform","B2BNow Software","CloudNow {{city}}","SaaSNow Platform"],
    cta: "Empezar trial gratis",
    greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres ver una demo personalizada?",
  },
};

const entries = [];
for (const [sectorId, data] of Object.entries(SECTORS)) {
  for (let i = 0; i < 50; i++) {
    const headline = data.headlines[i % data.headlines.length];
    entries.push({
      id: `${sectorId}-${String(i + 1).padStart(3, "0")}`,
      sector: sectorId,
      source: "synthetic",
      headline,
      meta_title: `${headline} | {{business_name}}`,
      cta_label: data.cta,
      chatbot_greeting: data.greeting,
      downloaded_at: null,
      envato_id: null,
    });
  }
}

const outPath = join(__dir, "../backend/data/envato-seeds-metadata.json");
writeFileSync(outPath, JSON.stringify(entries, null, 2));
console.log(`Generated ${entries.length} entries → ${outPath}`);
