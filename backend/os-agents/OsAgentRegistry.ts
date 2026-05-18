import type { OsPremiumServiceId } from "./constants";
import { OS_PREMIUM_SERVICE_IDS } from "./constants";
import type { BaseOsAgent } from "./BaseOsAgent";
import { instantiateSectorOsAgent, isSectorServiceId } from "./sectorOsRegistry";
import { AdsPremiumAgent } from "./agents/AdsPremiumAgent";
import { AdvisorEmpresarialPremiumAgent } from "./agents/AdvisorEmpresarialPremiumAgent";
import { BrandingPremiumAgent } from "./agents/BrandingPremiumAgent";
import { BotsPremiumAgent } from "./agents/BotsPremiumAgent";
import { ComunicacionesPremiumAgent } from "./agents/ComunicacionesPremiumAgent";
import { ConsultoriaAutomatizacionPremiumAgent } from "./agents/ConsultoriaAutomatizacionPremiumAgent";
import { ContenidoCopywritingPremiumAgent } from "./agents/ContenidoCopywritingPremiumAgent";
import { DisenoGraficoPremiumAgent } from "./agents/DisenoGraficoPremiumAgent";
import { EcommercePremiumAgent } from "./agents/EcommercePremiumAgent";
import { EmailMarketingPremiumAgent } from "./agents/EmailMarketingPremiumAgent";
import { FunnelPremiumAgent } from "./agents/FunnelPremiumAgent";
import { LandingPremiumAgent } from "./agents/LandingPremiumAgent";
import { FormacionCapacitacionPremiumAgent } from "./agents/FormacionCapacitacionPremiumAgent";
import { FotografiaProductoPremiumAgent } from "./agents/FotografiaProductoPremiumAgent";
import { InfluencerMarketingPremiumAgent } from "./agents/InfluencerMarketingPremiumAgent";
import { IntegracionesApisPremiumAgent } from "./agents/IntegracionesApisPremiumAgent";
import { MantenimientoWebPremiumAgent } from "./agents/MantenimientoWebPremiumAgent";
import { PersonalDigitalPremiumAgent } from "./agents/PersonalDigitalPremiumAgent";
import { ReputacionOrmPremiumAgent } from "./agents/ReputacionOrmPremiumAgent";
import { SeoPremiumAgent } from "./agents/SeoPremiumAgent";
import { SocialMediaPremiumAgent } from "./agents/SocialMediaPremiumAgent";
import { TresDInmersivoPremiumAgent } from "./agents/TresDInmersivoPremiumAgent";
import { VideoMultimediaPremiumAgent } from "./agents/VideoMultimediaPremiumAgent";
import { VozPremiumAgent } from "./agents/VozPremiumAgent";
import { WebPremiumAgent } from "./agents/WebPremiumAgent";

type AgentFactory = () => BaseOsAgent;

/**
 * Mapa estático serviceId → fábrica de agente (24 servicios OS premium — todos reales).
 */
export const OS_AGENT_REGISTRY: Record<OsPremiumServiceId, AgentFactory> = {
  web_premium: () => new WebPremiumAgent(),
  ecommerce_premium: () => new EcommercePremiumAgent(),
  seo_premium: () => new SeoPremiumAgent(),
  ads_premium: () => new AdsPremiumAgent(),
  branding_premium: () => new BrandingPremiumAgent(),
  voz_premium: () => new VozPremiumAgent(),
  bots_premium: () => new BotsPremiumAgent(),
  personal_digital_premium: () => new PersonalDigitalPremiumAgent(),
  advisor_empresarial_premium: () => new AdvisorEmpresarialPremiumAgent(),
  canales_comunicaciones_premium: () => new ComunicacionesPremiumAgent(),
  social_media_premium: () => new SocialMediaPremiumAgent(),
  email_marketing_premium: () => new EmailMarketingPremiumAgent(),
  contenido_copywriting_premium: () => new ContenidoCopywritingPremiumAgent(),
  video_multimedia_premium: () => new VideoMultimediaPremiumAgent(),
  "3d_contenido_inmersivo_premium": () => new TresDInmersivoPremiumAgent(),
  fotografia_producto_premium: () => new FotografiaProductoPremiumAgent(),
  diseno_grafico_creatividades_premium: () => new DisenoGraficoPremiumAgent(),
  consultoria_automatizacion_premium: () => new ConsultoriaAutomatizacionPremiumAgent(),
  integraciones_apis_premium: () => new IntegracionesApisPremiumAgent(),
  mantenimiento_web_premium: () => new MantenimientoWebPremiumAgent(),
  reputacion_online_orm_premium: () => new ReputacionOrmPremiumAgent(),
  formacion_capacitacion_digital_premium: () => new FormacionCapacitacionPremiumAgent(),
  influencer_marketing_premium: () => new InfluencerMarketingPremiumAgent(),
  landing_premium: () => new LandingPremiumAgent(),
  funnel_premium: () => new FunnelPremiumAgent(),
};

export function instantiateOsAgent(serviceId: string): BaseOsAgent | null {
  if (isRegistryKey(serviceId)) return OS_AGENT_REGISTRY[serviceId]();
  return instantiateSectorOsAgent(serviceId);
}

function isRegistryKey(id: string): id is OsPremiumServiceId {
  return (OS_PREMIUM_SERVICE_IDS as readonly string[]).includes(id);
}

export class OsAgentRegistry {
  static instantiate(serviceId: string): BaseOsAgent | null {
    return instantiateOsAgent(serviceId);
  }

  static listServiceIds(): readonly OsPremiumServiceId[] {
    return OS_PREMIUM_SERVICE_IDS;
  }

  static isSectorServiceId(serviceId: string): boolean {
    return isSectorServiceId(serviceId);
  }
}

export { OS_SECTOR_SERVICE_IDS, isSectorServiceId, instantiateSectorOsAgent } from "./sectorOsRegistry";
export type { OsSectorServiceId } from "./sectorOsRegistry";
