/** AUTO-GENERATED — node backend/os-agents/scripts/generate-sector-os-registry.mjs */
import { LlmClient } from "./LlmClient";
import { SectorAgentWrapper, type SectorCoreExecutor } from "./SectorAgentWrapper";
import type { BaseOsAgent } from "./BaseOsAgent";
import { buildSectorInputFromPayload, defaultSectorEliteParams } from "./sectorOsPayload";
import type { OsJobContext, OsJobPayload } from "./types";

import { runAdsAgentCore, getDefaultAdsLlm } from "./sectors/ads/shared";
import { runAgenciasMarketingAgentCore, getDefaultAgenciasMarketingLlm } from "./sectors/agenciasmarketing/shared";
import { runAgencyCertAgentCore, getDefaultAgencyCertLlm } from "./sectors/agencycert/shared";
import { runAnimacionAgentCore, getDefaultAnimacionLlm } from "./sectors/animacion/shared";
import { runAntiGenericAgentCore, getDefaultAntiGenericLlm } from "./sectors/antigeneric/shared";
import { runApolloAgentCore, getDefaultApolloLlm } from "./sectors/apollo/shared";
import { runAppBuilderWhiteLabelAgentCore, getDefaultAppBuilderWhiteLabelLlm } from "./sectors/appbuilderwhitelabel/shared";
import { runArquitecturaAgentCore, getDefaultArquitecturaLlm } from "./sectors/arquitectura/shared";
import { runArteNftAgentCore, getDefaultArteNftLlm } from "./sectors/artenft/shared";
import { runAudiovisualAgentCore, getDefaultAudiovisualLlm } from "./sectors/audiovisual/shared";
import { runAuditLogAgentCore, getDefaultAuditLogLlm } from "./sectors/auditlog/shared";
import { runAutoprocesosAgentCore, getDefaultAutoprocesosLlm } from "./sectors/autoprocesos/shared";
import { runBackupDisasterRecoveryAgentCore, getDefaultBackupDisasterRecoveryLlm } from "./sectors/backupdisasterrecovery/shared";
import { runBadgesAgentCore, getDefaultBadgesLlm } from "./sectors/badges/shared";
import { runBillingAgentCore, getDefaultBillingLlm } from "./sectors/billing/shared";
import { runBingAdsAgentCore, getDefaultBingAdsLlm } from "./sectors/bingads/shared";
import { runBookingCalendarioAgentCore, getDefaultBookingCalendarioLlm } from "./sectors/bookingcalendario/shared";
import { runBrandingAgentCore, getDefaultBrandingLlm } from "./sectors/branding/shared";
import { runCdpAgentCore, getDefaultCdpLlm } from "./sectors/cdp/shared";
import { runChatWidgetAgentCore, getDefaultChatWidgetLlm } from "./sectors/chatwidget/shared";
import { runChurnAgentCore, getDefaultChurnLlm } from "./sectors/churn/shared";
import { runCiberseguridadAgentCore, getDefaultCiberseguridadLlm } from "./sectors/ciberseguridad/shared";
import { runCommunityAgentCore, getDefaultCommunityLlm } from "./sectors/community/shared";
import { runComparatorAgentCore, getDefaultComparatorLlm } from "./sectors/comparator/shared";
import { runCompetitiveAgentCore, getDefaultCompetitiveLlm } from "./sectors/competitive/shared";
import { runComplianceAgentCore, getDefaultComplianceLlm } from "./sectors/compliance/shared";
import { runConsultoriaAgentCore, getDefaultConsultoriaLlm } from "./sectors/consultoria/shared";
import { runContabilidadAgentCore, getDefaultContabilidadLlm } from "./sectors/contabilidad/shared";
import { runContactEnrichmentMasivoAgentCore, getDefaultContactEnrichmentMasivoLlm } from "./sectors/contactenrichmentmasivo/shared";
import { runContentScoreAgentCore, getDefaultContentScoreLlm } from "./sectors/contentscore/shared";
import { runCopywritingAgentCore, getDefaultCopywritingLlm } from "./sectors/copywriting/shared";
import { runCreativeAgentCore, getDefaultCreativeLlm } from "./sectors/creative/shared";
import { runCryptoAgentCore, getDefaultCryptoLlm } from "./sectors/crypto/shared";
import { runCustomerJourneyAgentCore, getDefaultCustomerJourneyLlm } from "./sectors/customerjourney/shared";
import { runCustomerSuccessAgentCore, getDefaultCustomerSuccessLlm } from "./sectors/customersuccess/shared";
import { runDatabaseImportAgentCore, getDefaultDatabaseImportLlm } from "./sectors/databaseimport/shared";
import { runDemoAgentCore, getDefaultDemoLlm } from "./sectors/demo/shared";
import { runDeporteAgentCore, getDefaultDeporteLlm } from "./sectors/deporte/shared";
import { runDialerAgentCore, getDefaultDialerLlm } from "./sectors/dialer/shared";
import { runDisenoWebAgentCore, getDefaultDisenoWebLlm } from "./sectors/disenoweb/shared";
import { runEcommerceAgentCore, getDefaultEcommerceLlm } from "./sectors/ecommerce/shared";
import { runEcommerceConvAgentCore, getDefaultEcommerceConvLlm } from "./sectors/ecommerceconv/shared";
import { runEmailMarketingAgentCore, getDefaultEmailMarketingLlm } from "./sectors/emailmarketing/shared";
import { runEnergiaAgentCore, getDefaultEnergiaLlm } from "./sectors/energia/shared";
import { runEnterpriseQualityCalibrationAgentCore, getDefaultEnterpriseQualityCalibrationLlm } from "./sectors/enterprisequalitycalibration/shared";
import { runEsteticaAgentCore, getDefaultEsteticaLlm } from "./sectors/estetica/shared";
import { runEventosAgentCore, getDefaultEventosLlm } from "./sectors/eventos/shared";
import { runExperienceManagementAgentCore, getDefaultExperienceManagementLlm } from "./sectors/experiencemanagement/shared";
import { runFintechAgentCore, getDefaultFintechLlm } from "./sectors/fintech/shared";
import { runFirstPartyAgentCore, getDefaultFirstPartyLlm } from "./sectors/firstparty/shared";
import { runFiscalBillingAgentCore, getDefaultFiscalBillingLlm } from "./sectors/fiscalbilling/shared";
import { runFormulariosEncuestasAgentCore, getDefaultFormulariosEncuestasLlm } from "./sectors/formulariosencuestas/shared";
import { runFotografiaAgentCore, getDefaultFotografiaLlm } from "./sectors/fotografia/shared";
import { runFranquiciasAgentCore, getDefaultFranquiciasLlm } from "./sectors/franquicias/shared";
import { runFunnelMultipasoAgentCore, getDefaultFunnelMultipasoLlm } from "./sectors/funnelmultipaso/shared";
import { runGamingAgentCore, getDefaultGamingLlm } from "./sectors/gaming/shared";
import { runGCalZoomAgentCore, getDefaultGCalZoomLlm } from "./sectors/gcalzoom/shared";
import { runGeoEngineAgentCore, getDefaultGeoEngineLlm } from "./sectors/geoengine/shared";
import { runGobiernoAgentCore, getDefaultGobiernoLlm } from "./sectors/gobierno/shared";
import { runGrowthHackingAgentCore, getDefaultGrowthHackingLlm } from "./sectors/growthhacking/shared";
import { runHelpDeskOmnichannelAgentCore, getDefaultHelpDeskOmnichannelLlm } from "./sectors/helpdeskomnichannel/shared";
import { runHipaaComplianceAgentCore, getDefaultHipaaComplianceLlm } from "./sectors/hipaacompliance/shared";
import { runHrTechAgentCore, getDefaultHrTechLlm } from "./sectors/hrtech/shared";
import { runIaPredictivaAgentCore, getDefaultIaPredictivaLlm } from "./sectors/iapredictiva/shared";
import { runImagenesAgentCore, getDefaultImagenesLlm } from "./sectors/imagenes/shared";
import { runInfluencerAgentCore, getDefaultInfluencerLlm } from "./sectors/influencer/shared";
import { runInmobiliariaComercialAgentCore, getDefaultInmobiliariaComercialLlm } from "./sectors/inmobiliariacomercial/shared";
import { runIntegracionesNativasAgentCore, getDefaultIntegracionesNativasLlm } from "./sectors/integracionesnativas/shared";
import { runInvestigadorAgentCore, getDefaultInvestigadorLlm } from "./sectors/investigador/shared";
import { runKlaviyoAgentCore, getDefaultKlaviyoLlm } from "./sectors/klaviyo/shared";
import { runKnowledgeBaseAIAgentCore, getDefaultKnowledgeBaseAILlm } from "./sectors/knowledgebaseai/shared";
import { runLandingAgentCore, getDefaultLandingLlm } from "./sectors/landing/shared";
import { runLeadEnrichAgentCore, getDefaultLeadEnrichLlm } from "./sectors/leadenrich/shared";
import { runLeaderboardAgentCore, getDefaultLeaderboardLlm } from "./sectors/leaderboard/shared";
import { runLegalAgentCore, getDefaultLegalLlm } from "./sectors/legal/shared";
import { runManufacturaAgentCore, getDefaultManufacturaLlm } from "./sectors/manufactura/shared";
import { runMarcaAgentCore, getDefaultMarcaLlm } from "./sectors/marca/shared";
import { runMarketplaceAgentCore, getDefaultMarketplaceLlm } from "./sectors/marketplace/shared";
import { runMembershipPortalWhiteLabelAgentCore, getDefaultMembershipPortalWhiteLabelLlm } from "./sectors/membershipportalwhitelabel/shared";
import { runMembresiaCursosAgentCore, getDefaultMembresiaCursosLlm } from "./sectors/membresiacursos/shared";
import { runMfaAgentCore, getDefaultMfaLlm } from "./sectors/mfa/shared";
import { runMobileAgentCore, getDefaultMobileLlm } from "./sectors/mobile/shared";
import { runMultiCurrencyAgentCore, getDefaultMultiCurrencyLlm } from "./sectors/multicurrency/shared";
import { runMultiIdiomaAutomaticoAgentCore, getDefaultMultiIdiomaAutomaticoLlm } from "./sectors/multiidiomaautomatico/shared";
import { runMultimodalAgentCore, getDefaultMultimodalLlm } from "./sectors/multimodal/shared";
import { runNeuromarketingAgentCore, getDefaultNeuromarketingLlm } from "./sectors/neuromarketing/shared";
import { runNewsletterAgentCore, getDefaultNewsletterLlm } from "./sectors/newsletter/shared";
import { runObservabilityAgentCore, getDefaultObservabilityLlm } from "./sectors/observability/shared";
import { runOkrManagementAgentCore, getDefaultOkrManagementLlm } from "./sectors/okrmanagement/shared";
import { runOnboardingAgentCore, getDefaultOnboardingLlm } from "./sectors/onboarding/shared";
import { runOptimizadorAgentCore, getDefaultOptimizadorLlm } from "./sectors/optimizador/shared";
import { runOutboundB2BAgentCore, getDefaultOutboundB2BLlm } from "./sectors/outboundb2b/shared";
import { runPartnershipAgentCore, getDefaultPartnershipLlm } from "./sectors/partnership/shared";
import { runPaymentAgentCore, getDefaultPaymentLlm } from "./sectors/payment/shared";
import { runPerfPredictorAgentCore, getDefaultPerfPredictorLlm } from "./sectors/perfpredictor/shared";
import { runPersonalizacionMasivaAgentCore, getDefaultPersonalizacionMasivaLlm } from "./sectors/personalizacionmasiva/shared";
import { runPinterestAdsAgentCore, getDefaultPinterestAdsLlm } from "./sectors/pinterestads/shared";
import { runPodcastAgentCore, getDefaultPodcastLlm } from "./sectors/podcast/shared";
import { runPodcastsAgentCore, getDefaultPodcastsLlm } from "./sectors/podcasts/shared";
import { runPrestaShopAgentCore, getDefaultPrestaShopLlm } from "./sectors/prestashop/shared";
import { runPricingDinamicoAgentCore, getDefaultPricingDinamicoLlm } from "./sectors/pricingdinamico/shared";
import { runProductAnalyticsAgentCore, getDefaultProductAnalyticsLlm } from "./sectors/productanalytics/shared";
import { runProteccionIpAgentCore, getDefaultProteccionIpLlm } from "./sectors/proteccionip/shared";
import { runPublicApiAgentCore, getDefaultPublicApiLlm } from "./sectors/publicapi/shared";
import { runPushAgentCore, getDefaultPushLlm } from "./sectors/push/shared";
import { runPwaAgentCore, getDefaultPwaLlm } from "./sectors/pwa/shared";
import { runQrCodeGeneratorAgentCore, getDefaultQrCodeGeneratorLlm } from "./sectors/qrcodegenerator/shared";
import { runRateLimitAgentCore, getDefaultRateLimitLlm } from "./sectors/ratelimit/shared";
import { runRealtimeAgentCore, getDefaultRealtimeLlm } from "./sectors/realtime/shared";
import { runReferralAgentCore, getDefaultReferralLlm } from "./sectors/referral/shared";
import { runReportingAgentCore, getDefaultReportingLlm } from "./sectors/reporting/shared";
import { runRestaurantesAgentCore, getDefaultRestaurantesLlm } from "./sectors/restaurantes/shared";
import { runRetailAgentCore, getDefaultRetailLlm } from "./sectors/retail/shared";
import { runRevenueIntelligenceAgentCore, getDefaultRevenueIntelligenceLlm } from "./sectors/revenueintelligence/shared";
import { runReviewsAgentCore, getDefaultReviewsLlm } from "./sectors/reviews/shared";
import { runSaasB2bAgentCore, getDefaultSaasB2bLlm } from "./sectors/saasb2b/shared";
import { runSalesIntelligenceAgentCore, getDefaultSalesIntelligenceLlm } from "./sectors/salesintelligence/shared";
import { runScalingAgentCore, getDefaultScalingLlm } from "./sectors/scaling/shared";
import { runSeguridadCodigoAgentCore, getDefaultSeguridadCodigoLlm } from "./sectors/seguridadcodigo/shared";
import { runSegurosAgentCore, getDefaultSegurosLlm } from "./sectors/seguros/shared";
import { runSeoAgentCore, getDefaultSeoLlm } from "./sectors/seo/shared";
import { runSessionReplayAgentCore, getDefaultSessionReplayLlm } from "./sectors/sessionreplay/shared";
import { runSlaAgentCore, getDefaultSlaLlm } from "./sectors/sla/shared";
import { runSlackAgentCore, getDefaultSlackLlm } from "./sectors/slack/shared";
import { runSocialAgentCore, getDefaultSocialLlm } from "./sectors/social/shared";
import { runSocialShareAgentCore, getDefaultSocialShareLlm } from "./sectors/social_share/shared";
import { runSocialListeningBrandAgentCore, getDefaultSocialListeningBrandLlm } from "./sectors/sociallisteningbrand/shared";
import { runSocialvideoAgentCore, getDefaultSocialvideoLlm } from "./sectors/socialvideo/shared";
import { runSuperiorABTestingAgentCore, getDefaultSuperiorABTestingLlm } from "./sectors/superiorabtesting/shared";
import { runSuperiorAttributionAgentCore, getDefaultSuperiorAttributionLlm } from "./sectors/superiorattribution/shared";
import { runSuperiorChurnAgentCore, getDefaultSuperiorChurnLlm } from "./sectors/superiorchurn/shared";
import { runSuperiorCompetitiveAgentCore, getDefaultSuperiorCompetitiveLlm } from "./sectors/superiorcompetitive/shared";
import { runSuperiorContentAIAgentCore, getDefaultSuperiorContentAILlm } from "./sectors/superiorcontentai/shared";
import { runSuperiorCrmAgentCore, getDefaultSuperiorCrmLlm } from "./sectors/superiorcrm/shared";
import { runSuperiorEmailAgentCore, getDefaultSuperiorEmailLlm } from "./sectors/superioremail/shared";
import { runSuperiorInfluencerAgentCore, getDefaultSuperiorInfluencerLlm } from "./sectors/superiorinfluencer/shared";
import { runSuperiorLandingPageAgentCore, getDefaultSuperiorLandingPageLlm } from "./sectors/superiorlandingpage/shared";
import { runSuperiorLeadEnrichmentAgentCore, getDefaultSuperiorLeadEnrichmentLlm } from "./sectors/superiorleadenrichment/shared";
import { runSuperiorPerformanceAgentCore, getDefaultSuperiorPerformanceLlm } from "./sectors/superiorperformance/shared";
import { runSuperiorReportingAgentCore, getDefaultSuperiorReportingLlm } from "./sectors/superiorreporting/shared";
import { runSuperiorReviewsAgentCore, getDefaultSuperiorReviewsLlm } from "./sectors/superiorreviews/shared";
import { runSuperiorSeoAgentCore, getDefaultSuperiorSeoLlm } from "./sectors/superiorseo/shared";
import { runSuperiorSocialMediaAgentCore, getDefaultSuperiorSocialMediaLlm } from "./sectors/superiorsocialmedia/shared";
import { runTechnicalSeoAuditAgentCore, getDefaultTechnicalSeoAuditLlm } from "./sectors/technicalseoaudit/shared";
import { runTelecomunicacionesAgentCore, getDefaultTelecomunicacionesLlm } from "./sectors/telecomunicaciones/shared";
import { runTestimonialsAgentCore, getDefaultTestimonialsLlm } from "./sectors/testimonials/shared";
import { runTimezoneAgentCore, getDefaultTimezoneLlm } from "./sectors/timezone/shared";
import { runTransporteAgentCore, getDefaultTransporteLlm } from "./sectors/transporte/shared";
import { runUiuxAgentCore, getDefaultUiuxLlm } from "./sectors/uiux/shared";
import { runVideoMarketingAgentCore, getDefaultVideoMarketingLlm } from "./sectors/videomarketing/shared";
import { runVoiceAgentCore, getDefaultVoiceAgentLlm } from "./sectors/voiceagent/shared";
import { runVoiceV10AgentCore, getDefaultVoiceV10Llm } from "./sectors/voicev10/shared";
import { runVoiceV2AgentCore, getDefaultVoiceV2Llm } from "./sectors/voicev2/shared";
import { runVoiceV3AgentCore, getDefaultVoiceV3Llm } from "./sectors/voicev3/shared";
import { runVoiceV4AgentCore, getDefaultVoiceV4Llm } from "./sectors/voicev4/shared";
import { runVoiceV5AgentCore, getDefaultVoiceV5Llm } from "./sectors/voicev5/shared";
import { runVoiceV6AgentCore, getDefaultVoiceV6Llm } from "./sectors/voicev6/shared";
import { runVoiceV7AgentCore, getDefaultVoiceV7Llm } from "./sectors/voicev7/shared";
import { runVoiceV8AgentCore, getDefaultVoiceV8Llm } from "./sectors/voicev8/shared";
import { runVoiceV9AgentCore, getDefaultVoiceV9Llm } from "./sectors/voicev9/shared";
import { runWeb3dAgentCore, getDefaultWeb3dLlm } from "./sectors/web3d/shared";
import { runWebinarAgentCore, getDefaultWebinarLlm } from "./sectors/webinar/shared";
import { runWebs3dAgentCore, getDefaultWebs3dLlm } from "./sectors/webs3d/shared";
import { runWidgetAgentCore, getDefaultWidgetLlm } from "./sectors/widget/shared";
import { runWooCommerceAgentCore, getDefaultWooCommerceLlm } from "./sectors/woocommerce/shared";
import { runWorkflowAgentCore, getDefaultWorkflowLlm } from "./sectors/workflow/shared";
import { runYouTubeAdsAgentCore, getDefaultYouTubeAdsLlm } from "./sectors/youtubeads/shared";
import { runZapierAgentCore, getDefaultZapierLlm } from "./sectors/zapier/shared";
import { getAgroProductDescriptionAgent } from "./sectors/agrofood";
import { getAutoBusinessProfileAgent } from "./sectors/automotive";
import { getB2BLeadGenAgent } from "./sectors/b2b";
import { getCoachingPersonalBrandAgent } from "./sectors/coaching";
import { getBuildCompanyProfileAgent } from "./sectors/construction";
import { getEducationCourseDescriptionAgent } from "./sectors/education";
import { getFashionBrandStoryAgent } from "./sectors/fashion";
import { getFinanceCompanyProfileAgent } from "./sectors/finance";
import { getPersonalBrandingAgent } from "./sectors/freelancers";
import { getHealthClinicProfileAgent } from "./sectors/health";
import { getHomeBusinessProfileAgent } from "./sectors/home";
import { getMenuCopywriterAgent } from "./sectors/hospitality";
import { getContentCalendarAgent } from "./sectors/influencers";
import { getLogisticsCompanyProfileAgent } from "./sectors/logistics";
import { getMediaNewsletterWriterAgent } from "./sectors/media";
import { getArtistBioAgent } from "./sectors/music";
import { getNgoOrganizationProfileAgent } from "./sectors/ngo";
import { getPharmacyProfileAgent } from "./sectors/pharmacy";
import { getPropertyDescriptionAgent } from "./sectors/realestate";
import { getAthletePersonalBrandAgent } from "./sectors/sports";
import { getElevatorPitchAgent } from "./sectors/startups";
import { getTourismBusinessProfileAgent } from "./sectors/tourism";
import { getVetClinicProfileAgent } from "./sectors/veterinary";
import { getWellnessBusinessProfileAgent } from "./sectors/wellness";
import { getIdeaGeneratorAgent } from "./sectors/youtubers";

export const OS_SECTOR_SERVICE_IDS = [
  "ads",
  "agenciasmarketing",
  "agencycert",
  "agrofood",
  "animacion",
  "antigeneric",
  "apollo",
  "appbuilderwhitelabel",
  "arquitectura",
  "artenft",
  "audiovisual",
  "auditlog",
  "automotive",
  "autoprocesos",
  "b2b",
  "backupdisasterrecovery",
  "badges",
  "billing",
  "bingads",
  "bookingcalendario",
  "branding",
  "cdp",
  "chatwidget",
  "churn",
  "ciberseguridad",
  "coaching",
  "community",
  "comparator",
  "competitive",
  "compliance",
  "construction",
  "consultoria",
  "contabilidad",
  "contactenrichmentmasivo",
  "contentscore",
  "copywriting",
  "creative",
  "crypto",
  "customerjourney",
  "customersuccess",
  "databaseimport",
  "demo",
  "deporte",
  "dialer",
  "disenoweb",
  "ecommerce",
  "ecommerceconv",
  "education",
  "emailmarketing",
  "energia",
  "enterprisequalitycalibration",
  "estetica",
  "eventos",
  "experiencemanagement",
  "fashion",
  "finance",
  "fintech",
  "firstparty",
  "fiscalbilling",
  "formulariosencuestas",
  "fotografia",
  "franquicias",
  "freelancers",
  "funnelmultipaso",
  "gaming",
  "gcalzoom",
  "geoengine",
  "gobierno",
  "growthhacking",
  "health",
  "helpdeskomnichannel",
  "hipaacompliance",
  "home",
  "hospitality",
  "hrtech",
  "iapredictiva",
  "imagenes",
  "influencer",
  "influencers",
  "inmobiliariacomercial",
  "integracionesnativas",
  "investigador",
  "klaviyo",
  "knowledgebaseai",
  "landing",
  "leadenrich",
  "leaderboard",
  "legal",
  "logistics",
  "manufactura",
  "marca",
  "marketplace",
  "media",
  "membershipportalwhitelabel",
  "membresiacursos",
  "mfa",
  "mobile",
  "multicurrency",
  "multiidiomaautomatico",
  "multimodal",
  "music",
  "neuromarketing",
  "newsletter",
  "ngo",
  "observability",
  "okrmanagement",
  "onboarding",
  "optimizador",
  "outboundb2b",
  "partnership",
  "payment",
  "perfpredictor",
  "personalizacionmasiva",
  "pharmacy",
  "pinterestads",
  "podcast",
  "podcasts",
  "prestashop",
  "pricingdinamico",
  "productanalytics",
  "proteccionip",
  "publicapi",
  "push",
  "pwa",
  "qrcodegenerator",
  "ratelimit",
  "realestate",
  "realtime",
  "referral",
  "reporting",
  "restaurantes",
  "retail",
  "revenueintelligence",
  "reviews",
  "saasb2b",
  "salesintelligence",
  "scaling",
  "seguridadcodigo",
  "seguros",
  "seo",
  "sessionreplay",
  "sla",
  "slack",
  "social",
  "social_share",
  "sociallisteningbrand",
  "socialvideo",
  "sports",
  "startups",
  "superiorabtesting",
  "superiorattribution",
  "superiorchurn",
  "superiorcompetitive",
  "superiorcontentai",
  "superiorcrm",
  "superioremail",
  "superiorinfluencer",
  "superiorlandingpage",
  "superiorleadenrichment",
  "superiorperformance",
  "superiorreporting",
  "superiorreviews",
  "superiorseo",
  "superiorsocialmedia",
  "technicalseoaudit",
  "telecomunicaciones",
  "testimonials",
  "timezone",
  "tourism",
  "transporte",
  "uiux",
  "veterinary",
  "videomarketing",
  "voiceagent",
  "voicev10",
  "voicev2",
  "voicev3",
  "voicev4",
  "voicev5",
  "voicev6",
  "voicev7",
  "voicev8",
  "voicev9",
  "web3d",
  "webinar",
  "webs3d",
  "wellness",
  "widget",
  "woocommerce",
  "workflow",
  "youtubeads",
  "youtubers",
  "zapier",
] as const;

export type OsSectorServiceId = (typeof OS_SECTOR_SERVICE_IDS)[number];

type SectorFactory = () => BaseOsAgent;

const exec_ads: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ads", payload, ctx);
  const llm = getDefaultAdsLlm();
  const agentId = String(input.agentId ?? "ads-os");
  return runAdsAgentCore(agentId, input as never, llm);
};

const exec_agenciasmarketing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("agenciasmarketing", payload, ctx);
  const llm = getDefaultAgenciasMarketingLlm();
  const agentId = String(input.agentId ?? "agenciasmarketing-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runAgenciasMarketingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_agencycert: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("agencycert", payload, ctx);
  const llm = getDefaultAgencyCertLlm();
  const agentId = String(input.agentId ?? "agencycert-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runAgencyCertAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_agrofood: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("agrofood", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getAgroProductDescriptionAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_animacion: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("animacion", payload, ctx);
  const llm = getDefaultAnimacionLlm();
  const agentId = String(input.agentId ?? "animacion-os");
  const params = defaultSectorEliteParams();
  return runAnimacionAgentCore(agentId, llm, params, input as never);
};

const exec_antigeneric: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("antigeneric", payload, ctx);
  const llm = getDefaultAntiGenericLlm();
  const agentId = String(input.agentId ?? "antigeneric-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runAntiGenericAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_apollo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("apollo", payload, ctx);
  const llm = getDefaultApolloLlm();
  const agentId = String(input.agentId ?? "apollo-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runApolloAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_appbuilderwhitelabel: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("appbuilderwhitelabel", payload, ctx);
  const llm = getDefaultAppBuilderWhiteLabelLlm();
  const agentId = String(input.agentId ?? "appbuilderwhitelabel-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runAppBuilderWhiteLabelAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_arquitectura: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("arquitectura", payload, ctx);
  const llm = getDefaultArquitecturaLlm();
  const agentId = String(input.agentId ?? "arquitectura-os");
  const params = defaultSectorEliteParams();
  return runArquitecturaAgentCore(agentId, llm, params, input as never);
};

const exec_artenft: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("artenft", payload, ctx);
  const llm = getDefaultArteNftLlm();
  const agentId = String(input.agentId ?? "artenft-os");
  const params = defaultSectorEliteParams();
  return runArteNftAgentCore(agentId, llm, params, input as never);
};

const exec_audiovisual: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("audiovisual", payload, ctx);
  const llm = getDefaultAudiovisualLlm();
  const agentId = String(input.agentId ?? "audiovisual-os");
  const params = defaultSectorEliteParams();
  return runAudiovisualAgentCore(agentId, llm, params, input as never);
};

const exec_auditlog: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("auditlog", payload, ctx);
  const llm = getDefaultAuditLogLlm();
  const agentId = String(input.agentId ?? "auditlog-os");
  const params = defaultSectorEliteParams();
  return runAuditLogAgentCore(agentId, llm, params, input as never);
};

const exec_automotive: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("automotive", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getAutoBusinessProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_autoprocesos: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("autoprocesos", payload, ctx);
  const llm = getDefaultAutoprocesosLlm();
  const agentId = String(input.agentId ?? "autoprocesos-os");
  const params = defaultSectorEliteParams();
  return runAutoprocesosAgentCore(agentId, llm, params, input as never);
};

const exec_b2b: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("b2b", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getB2BLeadGenAgent();
  return (agent as { generateLeads: (uid: string, inp: unknown) => Promise<unknown> }).generateLeads(userId, input as never);
};

const exec_backupdisasterrecovery: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("backupdisasterrecovery", payload, ctx);
  const llm = getDefaultBackupDisasterRecoveryLlm();
  const agentId = String(input.agentId ?? "backupdisasterrecovery-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runBackupDisasterRecoveryAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_badges: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("badges", payload, ctx);
  const llm = getDefaultBadgesLlm();
  const agentId = String(input.agentId ?? "badges-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runBadgesAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_billing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("billing", payload, ctx);
  const llm = getDefaultBillingLlm();
  const agentId = String(input.agentId ?? "billing-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runBillingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_bingads: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("bingads", payload, ctx);
  const llm = getDefaultBingAdsLlm();
  const agentId = String(input.agentId ?? "bingads-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runBingAdsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_bookingcalendario: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("bookingcalendario", payload, ctx);
  const llm = getDefaultBookingCalendarioLlm();
  const agentId = String(input.agentId ?? "bookingcalendario-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runBookingCalendarioAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_branding: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("branding", payload, ctx);
  const llm = getDefaultBrandingLlm();
  const agentId = String(input.agentId ?? "branding-os");
  const params = defaultSectorEliteParams();
  return runBrandingAgentCore(agentId, llm, params, input as never);
};

const exec_cdp: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("cdp", payload, ctx);
  const llm = getDefaultCdpLlm();
  const agentId = String(input.agentId ?? "cdp-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runCdpAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_chatwidget: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("chatwidget", payload, ctx);
  const llm = getDefaultChatWidgetLlm();
  const agentId = String(input.agentId ?? "chatwidget-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runChatWidgetAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_churn: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("churn", payload, ctx);
  const llm = getDefaultChurnLlm();
  const agentId = String(input.agentId ?? "churn-os");
  const params = defaultSectorEliteParams();
  return runChurnAgentCore(agentId, llm, params, input as never);
};

const exec_ciberseguridad: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ciberseguridad", payload, ctx);
  const llm = getDefaultCiberseguridadLlm();
  const agentId = String(input.agentId ?? "ciberseguridad-os");
  const params = defaultSectorEliteParams();
  return runCiberseguridadAgentCore(agentId, llm, params, input as never);
};

const exec_coaching: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("coaching", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getCoachingPersonalBrandAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_community: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("community", payload, ctx);
  const llm = getDefaultCommunityLlm();
  const agentId = String(input.agentId ?? "community-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runCommunityAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_comparator: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("comparator", payload, ctx);
  const llm = getDefaultComparatorLlm();
  const agentId = String(input.agentId ?? "comparator-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runComparatorAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_competitive: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("competitive", payload, ctx);
  const llm = getDefaultCompetitiveLlm();
  const agentId = String(input.agentId ?? "competitive-os");
  const params = defaultSectorEliteParams();
  return runCompetitiveAgentCore(agentId, llm, params, input as never);
};

const exec_compliance: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("compliance", payload, ctx);
  const llm = getDefaultComplianceLlm();
  const agentId = String(input.agentId ?? "compliance-os");
  const params = defaultSectorEliteParams();
  return runComplianceAgentCore(agentId, llm, params, input as never);
};

const exec_construction: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("construction", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getBuildCompanyProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_consultoria: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("consultoria", payload, ctx);
  const llm = getDefaultConsultoriaLlm();
  const agentId = String(input.agentId ?? "consultoria-os");
  const params = defaultSectorEliteParams();
  return runConsultoriaAgentCore(agentId, llm, params, input as never);
};

const exec_contabilidad: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("contabilidad", payload, ctx);
  const llm = getDefaultContabilidadLlm();
  const agentId = String(input.agentId ?? "contabilidad-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runContabilidadAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_contactenrichmentmasivo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("contactenrichmentmasivo", payload, ctx);
  const llm = getDefaultContactEnrichmentMasivoLlm();
  const agentId = String(input.agentId ?? "contactenrichmentmasivo-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runContactEnrichmentMasivoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_contentscore: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("contentscore", payload, ctx);
  const llm = getDefaultContentScoreLlm();
  const agentId = String(input.agentId ?? "contentscore-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runContentScoreAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_copywriting: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("copywriting", payload, ctx);
  const llm = getDefaultCopywritingLlm();
  const agentId = String(input.agentId ?? "copywriting-os");
  const params = defaultSectorEliteParams();
  return runCopywritingAgentCore(agentId, llm, params, input as never);
};

const exec_creative: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("creative", payload, ctx);
  const llm = getDefaultCreativeLlm();
  const agentId = String(input.agentId ?? "creative-os");
  const params = defaultSectorEliteParams();
  return runCreativeAgentCore(agentId, llm, params, input as never);
};

const exec_crypto: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("crypto", payload, ctx);
  const llm = getDefaultCryptoLlm();
  const agentId = String(input.agentId ?? "crypto-os");
  const params = defaultSectorEliteParams();
  return runCryptoAgentCore(agentId, llm, params, input as never);
};

const exec_customerjourney: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("customerjourney", payload, ctx);
  const llm = getDefaultCustomerJourneyLlm();
  const agentId = String(input.agentId ?? "customerjourney-os");
  const params = defaultSectorEliteParams();
  return runCustomerJourneyAgentCore(agentId, llm, params, input as never);
};

const exec_customersuccess: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("customersuccess", payload, ctx);
  const llm = getDefaultCustomerSuccessLlm();
  const agentId = String(input.agentId ?? "customersuccess-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runCustomerSuccessAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_databaseimport: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("databaseimport", payload, ctx);
  const llm = getDefaultDatabaseImportLlm();
  const agentId = String(input.agentId ?? "databaseimport-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runDatabaseImportAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_demo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("demo", payload, ctx);
  const llm = getDefaultDemoLlm();
  const agentId = String(input.agentId ?? "demo-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runDemoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_deporte: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("deporte", payload, ctx);
  const llm = getDefaultDeporteLlm();
  const agentId = String(input.agentId ?? "deporte-os");
  const params = defaultSectorEliteParams();
  return runDeporteAgentCore(agentId, llm, params, input as never);
};

const exec_dialer: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("dialer", payload, ctx);
  const llm = getDefaultDialerLlm();
  const agentId = String(input.agentId ?? "dialer-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runDialerAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_disenoweb: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("disenoweb", payload, ctx);
  const llm = getDefaultDisenoWebLlm();
  const agentId = String(input.agentId ?? "disenoweb-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runDisenoWebAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_ecommerce: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ecommerce", payload, ctx);
  const llm = getDefaultEcommerceLlm();
  const agentId = String(input.agentId ?? "ecommerce-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runEcommerceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_ecommerceconv: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ecommerceconv", payload, ctx);
  const llm = getDefaultEcommerceConvLlm();
  const agentId = String(input.agentId ?? "ecommerceconv-os");
  const params = defaultSectorEliteParams();
  return runEcommerceConvAgentCore(agentId, llm, params, input as never);
};

const exec_education: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("education", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getEducationCourseDescriptionAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_emailmarketing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("emailmarketing", payload, ctx);
  const llm = getDefaultEmailMarketingLlm();
  const agentId = String(input.agentId ?? "emailmarketing-os");
  const params = defaultSectorEliteParams();
  return runEmailMarketingAgentCore(agentId, llm, params, input as never);
};

const exec_energia: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("energia", payload, ctx);
  const llm = getDefaultEnergiaLlm();
  const agentId = String(input.agentId ?? "energia-os");
  const params = defaultSectorEliteParams();
  return runEnergiaAgentCore(agentId, llm, params, input as never);
};

const exec_enterprisequalitycalibration: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("enterprisequalitycalibration", payload, ctx);
  const llm = getDefaultEnterpriseQualityCalibrationLlm();
  const agentId = String(input.agentId ?? "enterprisequalitycalibration-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runEnterpriseQualityCalibrationAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_estetica: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("estetica", payload, ctx);
  const llm = getDefaultEsteticaLlm();
  const agentId = String(input.agentId ?? "estetica-os");
  const params = defaultSectorEliteParams();
  return runEsteticaAgentCore(agentId, llm, params, input as never);
};

const exec_eventos: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("eventos", payload, ctx);
  const llm = getDefaultEventosLlm();
  const agentId = String(input.agentId ?? "eventos-os");
  const params = defaultSectorEliteParams();
  return runEventosAgentCore(agentId, llm, params, input as never);
};

const exec_experiencemanagement: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("experiencemanagement", payload, ctx);
  const llm = getDefaultExperienceManagementLlm();
  const agentId = String(input.agentId ?? "experiencemanagement-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runExperienceManagementAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_fashion: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("fashion", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getFashionBrandStoryAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_finance: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("finance", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getFinanceCompanyProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_fintech: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("fintech", payload, ctx);
  const llm = getDefaultFintechLlm();
  const agentId = String(input.agentId ?? "fintech-os");
  const params = defaultSectorEliteParams();
  return runFintechAgentCore(agentId, llm, params, input as never);
};

const exec_firstparty: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("firstparty", payload, ctx);
  const llm = getDefaultFirstPartyLlm();
  const agentId = String(input.agentId ?? "firstparty-os");
  return runFirstPartyAgentCore(agentId, input as never, llm);
};

const exec_fiscalbilling: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("fiscalbilling", payload, ctx);
  const llm = getDefaultFiscalBillingLlm();
  const agentId = String(input.agentId ?? "fiscalbilling-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runFiscalBillingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_formulariosencuestas: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("formulariosencuestas", payload, ctx);
  const llm = getDefaultFormulariosEncuestasLlm();
  const agentId = String(input.agentId ?? "formulariosencuestas-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runFormulariosEncuestasAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_fotografia: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("fotografia", payload, ctx);
  const llm = getDefaultFotografiaLlm();
  const agentId = String(input.agentId ?? "fotografia-os");
  const params = defaultSectorEliteParams();
  return runFotografiaAgentCore(agentId, llm, params, input as never);
};

const exec_franquicias: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("franquicias", payload, ctx);
  const llm = getDefaultFranquiciasLlm();
  const agentId = String(input.agentId ?? "franquicias-os");
  const params = defaultSectorEliteParams();
  return runFranquiciasAgentCore(agentId, llm, params, input as never);
};

const exec_freelancers: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("freelancers", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getPersonalBrandingAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_funnelmultipaso: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("funnelmultipaso", payload, ctx);
  const llm = getDefaultFunnelMultipasoLlm();
  const agentId = String(input.agentId ?? "funnelmultipaso-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runFunnelMultipasoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_gaming: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("gaming", payload, ctx);
  const llm = getDefaultGamingLlm();
  const agentId = String(input.agentId ?? "gaming-os");
  const params = defaultSectorEliteParams();
  return runGamingAgentCore(agentId, llm, params, input as never);
};

const exec_gcalzoom: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("gcalzoom", payload, ctx);
  const llm = getDefaultGCalZoomLlm();
  const agentId = String(input.agentId ?? "gcalzoom-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runGCalZoomAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_geoengine: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("geoengine", payload, ctx);
  const llm = getDefaultGeoEngineLlm();
  const agentId = String(input.agentId ?? "geoengine-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runGeoEngineAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_gobierno: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("gobierno", payload, ctx);
  const llm = getDefaultGobiernoLlm();
  const agentId = String(input.agentId ?? "gobierno-os");
  const params = defaultSectorEliteParams();
  return runGobiernoAgentCore(agentId, llm, params, input as never);
};

const exec_growthhacking: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("growthhacking", payload, ctx);
  const llm = getDefaultGrowthHackingLlm();
  const agentId = String(input.agentId ?? "growthhacking-os");
  const params = defaultSectorEliteParams();
  return runGrowthHackingAgentCore(agentId, llm, params, input as never);
};

const exec_health: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("health", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getHealthClinicProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_helpdeskomnichannel: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("helpdeskomnichannel", payload, ctx);
  const llm = getDefaultHelpDeskOmnichannelLlm();
  const agentId = String(input.agentId ?? "helpdeskomnichannel-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runHelpDeskOmnichannelAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_hipaacompliance: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("hipaacompliance", payload, ctx);
  const llm = getDefaultHipaaComplianceLlm();
  const agentId = String(input.agentId ?? "hipaacompliance-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runHipaaComplianceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_home: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("home", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getHomeBusinessProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_hospitality: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("hospitality", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getMenuCopywriterAgent();
  return (agent as { generateMenuCopy: (uid: string, inp: unknown) => Promise<unknown> }).generateMenuCopy(userId, input as never);
};

const exec_hrtech: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("hrtech", payload, ctx);
  const llm = getDefaultHrTechLlm();
  const agentId = String(input.agentId ?? "hrtech-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runHrTechAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_iapredictiva: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("iapredictiva", payload, ctx);
  const llm = getDefaultIaPredictivaLlm();
  const agentId = String(input.agentId ?? "iapredictiva-os");
  const params = defaultSectorEliteParams();
  return runIaPredictivaAgentCore(agentId, llm, params, input as never);
};

const exec_imagenes: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("imagenes", payload, ctx);
  const llm = getDefaultImagenesLlm();
  const agentId = String(input.agentId ?? "imagenes-os");
  const params = defaultSectorEliteParams();
  return runImagenesAgentCore(agentId, llm, params, input as never);
};

const exec_influencer: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("influencer", payload, ctx);
  const llm = getDefaultInfluencerLlm();
  const agentId = String(input.agentId ?? "influencer-os");
  const params = defaultSectorEliteParams();
  return runInfluencerAgentCore(agentId, llm, params, input as never);
};

const exec_influencers: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("influencers", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getContentCalendarAgent();
  return (agent as { generateCalendar: (uid: string, inp: unknown) => Promise<unknown> }).generateCalendar(userId, input as never);
};

const exec_inmobiliariacomercial: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("inmobiliariacomercial", payload, ctx);
  const llm = getDefaultInmobiliariaComercialLlm();
  const agentId = String(input.agentId ?? "inmobiliariacomercial-os");
  const params = defaultSectorEliteParams();
  return runInmobiliariaComercialAgentCore(agentId, llm, params, input as never);
};

const exec_integracionesnativas: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("integracionesnativas", payload, ctx);
  const llm = getDefaultIntegracionesNativasLlm();
  const agentId = String(input.agentId ?? "integracionesnativas-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runIntegracionesNativasAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_investigador: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("investigador", payload, ctx);
  const llm = getDefaultInvestigadorLlm();
  const agentId = String(input.agentId ?? "investigador-os");
  const params = defaultSectorEliteParams();
  return runInvestigadorAgentCore(agentId, llm, params, input as never);
};

const exec_klaviyo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("klaviyo", payload, ctx);
  const llm = getDefaultKlaviyoLlm();
  const agentId = String(input.agentId ?? "klaviyo-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runKlaviyoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_knowledgebaseai: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("knowledgebaseai", payload, ctx);
  const llm = getDefaultKnowledgeBaseAILlm();
  const agentId = String(input.agentId ?? "knowledgebaseai-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runKnowledgeBaseAIAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_landing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("landing", payload, ctx);
  const llm = getDefaultLandingLlm();
  const agentId = String(input.agentId ?? "landing-os");
  const params = defaultSectorEliteParams();
  return runLandingAgentCore(agentId, llm, params, input as never);
};

const exec_leadenrich: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("leadenrich", payload, ctx);
  const llm = getDefaultLeadEnrichLlm();
  const agentId = String(input.agentId ?? "leadenrich-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runLeadEnrichAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_leaderboard: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("leaderboard", payload, ctx);
  const llm = getDefaultLeaderboardLlm();
  const agentId = String(input.agentId ?? "leaderboard-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runLeaderboardAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_legal: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("legal", payload, ctx);
  const llm = getDefaultLegalLlm();
  const agentId = String(input.agentId ?? "legal-os");
  const params = defaultSectorEliteParams();
  return runLegalAgentCore(agentId, llm, params, input as never);
};

const exec_logistics: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("logistics", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getLogisticsCompanyProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_manufactura: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("manufactura", payload, ctx);
  const llm = getDefaultManufacturaLlm();
  const agentId = String(input.agentId ?? "manufactura-os");
  const params = defaultSectorEliteParams();
  return runManufacturaAgentCore(agentId, llm, params, input as never);
};

const exec_marca: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("marca", payload, ctx);
  const llm = getDefaultMarcaLlm();
  const agentId = String(input.agentId ?? "marca-os");
  const params = defaultSectorEliteParams();
  return runMarcaAgentCore(agentId, llm, params, input as never);
};

const exec_marketplace: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("marketplace", payload, ctx);
  const llm = getDefaultMarketplaceLlm();
  const agentId = String(input.agentId ?? "marketplace-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMarketplaceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_media: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("media", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getMediaNewsletterWriterAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_membershipportalwhitelabel: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("membershipportalwhitelabel", payload, ctx);
  const llm = getDefaultMembershipPortalWhiteLabelLlm();
  const agentId = String(input.agentId ?? "membershipportalwhitelabel-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMembershipPortalWhiteLabelAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_membresiacursos: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("membresiacursos", payload, ctx);
  const llm = getDefaultMembresiaCursosLlm();
  const agentId = String(input.agentId ?? "membresiacursos-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMembresiaCursosAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_mfa: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("mfa", payload, ctx);
  const llm = getDefaultMfaLlm();
  const agentId = String(input.agentId ?? "mfa-os");
  const params = defaultSectorEliteParams();
  return runMfaAgentCore(agentId, llm, params, input as never);
};

const exec_mobile: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("mobile", payload, ctx);
  const llm = getDefaultMobileLlm();
  const agentId = String(input.agentId ?? "mobile-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMobileAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_multicurrency: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("multicurrency", payload, ctx);
  const llm = getDefaultMultiCurrencyLlm();
  const agentId = String(input.agentId ?? "multicurrency-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMultiCurrencyAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_multiidiomaautomatico: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("multiidiomaautomatico", payload, ctx);
  const llm = getDefaultMultiIdiomaAutomaticoLlm();
  const agentId = String(input.agentId ?? "multiidiomaautomatico-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runMultiIdiomaAutomaticoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_multimodal: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("multimodal", payload, ctx);
  const llm = getDefaultMultimodalLlm();
  const agentId = String(input.agentId ?? "multimodal-os");
  const params = defaultSectorEliteParams();
  return runMultimodalAgentCore(agentId, llm, params, input as never);
};

const exec_music: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("music", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getArtistBioAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_neuromarketing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("neuromarketing", payload, ctx);
  const llm = getDefaultNeuromarketingLlm();
  const agentId = String(input.agentId ?? "neuromarketing-os");
  return runNeuromarketingAgentCore(agentId, input as never, llm);
};

const exec_newsletter: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("newsletter", payload, ctx);
  const llm = getDefaultNewsletterLlm();
  const agentId = String(input.agentId ?? "newsletter-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runNewsletterAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_ngo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ngo", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getNgoOrganizationProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_observability: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("observability", payload, ctx);
  const llm = getDefaultObservabilityLlm();
  const agentId = String(input.agentId ?? "observability-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runObservabilityAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_okrmanagement: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("okrmanagement", payload, ctx);
  const llm = getDefaultOkrManagementLlm();
  const agentId = String(input.agentId ?? "okrmanagement-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runOkrManagementAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_onboarding: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("onboarding", payload, ctx);
  const llm = getDefaultOnboardingLlm();
  const agentId = String(input.agentId ?? "onboarding-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runOnboardingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_optimizador: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("optimizador", payload, ctx);
  const llm = getDefaultOptimizadorLlm();
  const agentId = String(input.agentId ?? "optimizador-os");
  const params = defaultSectorEliteParams();
  return runOptimizadorAgentCore(agentId, llm, params, input as never);
};

const exec_outboundb2b: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("outboundb2b", payload, ctx);
  const llm = getDefaultOutboundB2BLlm();
  const agentId = String(input.agentId ?? "outboundb2b-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runOutboundB2BAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_partnership: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("partnership", payload, ctx);
  const llm = getDefaultPartnershipLlm();
  const agentId = String(input.agentId ?? "partnership-os");
  const params = defaultSectorEliteParams();
  return runPartnershipAgentCore(agentId, llm, params, input as never);
};

const exec_payment: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("payment", payload, ctx);
  const llm = getDefaultPaymentLlm();
  const agentId = String(input.agentId ?? "payment-os");
  const params = defaultSectorEliteParams();
  return runPaymentAgentCore(agentId, llm, params, input as never);
};

const exec_perfpredictor: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("perfpredictor", payload, ctx);
  const llm = getDefaultPerfPredictorLlm();
  const agentId = String(input.agentId ?? "perfpredictor-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPerfPredictorAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_personalizacionmasiva: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("personalizacionmasiva", payload, ctx);
  const llm = getDefaultPersonalizacionMasivaLlm();
  const agentId = String(input.agentId ?? "personalizacionmasiva-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPersonalizacionMasivaAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_pharmacy: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("pharmacy", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getPharmacyProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_pinterestads: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("pinterestads", payload, ctx);
  const llm = getDefaultPinterestAdsLlm();
  const agentId = String(input.agentId ?? "pinterestads-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPinterestAdsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_podcast: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("podcast", payload, ctx);
  const llm = getDefaultPodcastLlm();
  const agentId = String(input.agentId ?? "podcast-os");
  const params = defaultSectorEliteParams();
  return runPodcastAgentCore(agentId, llm, params, input as never);
};

const exec_podcasts: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("podcasts", payload, ctx);
  const llm = getDefaultPodcastsLlm();
  const agentId = String(input.agentId ?? "podcasts-os");
  const params = defaultSectorEliteParams();
  return runPodcastsAgentCore(agentId, llm, params, input as never);
};

const exec_prestashop: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("prestashop", payload, ctx);
  const llm = getDefaultPrestaShopLlm();
  const agentId = String(input.agentId ?? "prestashop-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPrestaShopAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_pricingdinamico: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("pricingdinamico", payload, ctx);
  const llm = getDefaultPricingDinamicoLlm();
  const agentId = String(input.agentId ?? "pricingdinamico-os");
  const params = defaultSectorEliteParams();
  return runPricingDinamicoAgentCore(agentId, llm, params, input as never);
};

const exec_productanalytics: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("productanalytics", payload, ctx);
  const llm = getDefaultProductAnalyticsLlm();
  const agentId = String(input.agentId ?? "productanalytics-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runProductAnalyticsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_proteccionip: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("proteccionip", payload, ctx);
  const llm = getDefaultProteccionIpLlm();
  const agentId = String(input.agentId ?? "proteccionip-os");
  const params = defaultSectorEliteParams();
  return runProteccionIpAgentCore(agentId, llm, params, input as never);
};

const exec_publicapi: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("publicapi", payload, ctx);
  const llm = getDefaultPublicApiLlm();
  const agentId = String(input.agentId ?? "publicapi-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPublicApiAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_push: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("push", payload, ctx);
  const llm = getDefaultPushLlm();
  const agentId = String(input.agentId ?? "push-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runPushAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_pwa: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("pwa", payload, ctx);
  const llm = getDefaultPwaLlm();
  const agentId = String(input.agentId ?? "pwa-os");
  return runPwaAgentCore(agentId, input as never, llm);
};

const exec_qrcodegenerator: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("qrcodegenerator", payload, ctx);
  const llm = getDefaultQrCodeGeneratorLlm();
  const agentId = String(input.agentId ?? "qrcodegenerator-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runQrCodeGeneratorAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_ratelimit: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("ratelimit", payload, ctx);
  const llm = getDefaultRateLimitLlm();
  const agentId = String(input.agentId ?? "ratelimit-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runRateLimitAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_realestate: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("realestate", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getPropertyDescriptionAgent();
  return (agent as { generateDescription: (uid: string, inp: unknown) => Promise<unknown> }).generateDescription(userId, input as never);
};

const exec_realtime: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("realtime", payload, ctx);
  const llm = getDefaultRealtimeLlm();
  const agentId = String(input.agentId ?? "realtime-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runRealtimeAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_referral: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("referral", payload, ctx);
  const llm = getDefaultReferralLlm();
  const agentId = String(input.agentId ?? "referral-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runReferralAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_reporting: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("reporting", payload, ctx);
  const llm = getDefaultReportingLlm();
  const agentId = String(input.agentId ?? "reporting-os");
  const params = defaultSectorEliteParams();
  return runReportingAgentCore(agentId, llm, params, input as never);
};

const exec_restaurantes: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("restaurantes", payload, ctx);
  const llm = getDefaultRestaurantesLlm();
  const agentId = String(input.agentId ?? "restaurantes-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runRestaurantesAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_retail: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("retail", payload, ctx);
  const llm = getDefaultRetailLlm();
  const agentId = String(input.agentId ?? "retail-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runRetailAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_revenueintelligence: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("revenueintelligence", payload, ctx);
  const llm = getDefaultRevenueIntelligenceLlm();
  const agentId = String(input.agentId ?? "revenueintelligence-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runRevenueIntelligenceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_reviews: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("reviews", payload, ctx);
  const llm = getDefaultReviewsLlm();
  const agentId = String(input.agentId ?? "reviews-os");
  const params = defaultSectorEliteParams();
  return runReviewsAgentCore(agentId, llm, params, input as never);
};

const exec_saasb2b: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("saasb2b", payload, ctx);
  const llm = getDefaultSaasB2bLlm();
  const agentId = String(input.agentId ?? "saasb2b-os");
  const params = defaultSectorEliteParams();
  return runSaasB2bAgentCore(agentId, llm, params, input as never);
};

const exec_salesintelligence: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("salesintelligence", payload, ctx);
  const llm = getDefaultSalesIntelligenceLlm();
  const agentId = String(input.agentId ?? "salesintelligence-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSalesIntelligenceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_scaling: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("scaling", payload, ctx);
  const llm = getDefaultScalingLlm();
  const agentId = String(input.agentId ?? "scaling-os");
  const params = defaultSectorEliteParams();
  return runScalingAgentCore(agentId, llm, params, input as never);
};

const exec_seguridadcodigo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("seguridadcodigo", payload, ctx);
  const llm = getDefaultSeguridadCodigoLlm();
  const agentId = String(input.agentId ?? "seguridadcodigo-os");
  const params = defaultSectorEliteParams();
  return runSeguridadCodigoAgentCore(agentId, llm, params, input as never);
};

const exec_seguros: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("seguros", payload, ctx);
  const llm = getDefaultSegurosLlm();
  const agentId = String(input.agentId ?? "seguros-os");
  const params = defaultSectorEliteParams();
  return runSegurosAgentCore(agentId, llm, params, input as never);
};

const exec_seo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("seo", payload, ctx);
  const llm = getDefaultSeoLlm();
  const agentId = String(input.agentId ?? "seo-os");
  const params = defaultSectorEliteParams();
  return runSeoAgentCore(agentId, llm, params, input as never);
};

const exec_sessionreplay: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("sessionreplay", payload, ctx);
  const llm = getDefaultSessionReplayLlm();
  const agentId = String(input.agentId ?? "sessionreplay-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSessionReplayAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_sla: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("sla", payload, ctx);
  const llm = getDefaultSlaLlm();
  const agentId = String(input.agentId ?? "sla-os");
  const params = defaultSectorEliteParams();
  return runSlaAgentCore(agentId, llm, params, input as never);
};

const exec_slack: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("slack", payload, ctx);
  const llm = getDefaultSlackLlm();
  const agentId = String(input.agentId ?? "slack-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSlackAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_social: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("social", payload, ctx);
  const llm = getDefaultSocialLlm();
  const agentId = String(input.agentId ?? "social-os");
  const params = defaultSectorEliteParams();
  return runSocialAgentCore(agentId, llm, params, input as never);
};

const exec_social_share: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("social_share", payload, ctx);
  const llm = getDefaultSocialShareLlm();
  const agentId = String(input.agentId ?? "social_share-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSocialShareAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_sociallisteningbrand: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("sociallisteningbrand", payload, ctx);
  const llm = getDefaultSocialListeningBrandLlm();
  const agentId = String(input.agentId ?? "sociallisteningbrand-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSocialListeningBrandAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_socialvideo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("socialvideo", payload, ctx);
  const llm = getDefaultSocialvideoLlm();
  const agentId = String(input.agentId ?? "socialvideo-os");
  return runSocialvideoAgentCore(agentId, input as never, llm);
};

const exec_sports: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("sports", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getAthletePersonalBrandAgent();
  return (agent as { buildBrand: (uid: string, inp: unknown) => Promise<unknown> }).buildBrand(userId, input as never);
};

const exec_startups: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("startups", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getElevatorPitchAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_superiorabtesting: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorabtesting", payload, ctx);
  const llm = getDefaultSuperiorABTestingLlm();
  const agentId = String(input.agentId ?? "superiorabtesting-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorABTestingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorattribution: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorattribution", payload, ctx);
  const llm = getDefaultSuperiorAttributionLlm();
  const agentId = String(input.agentId ?? "superiorattribution-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorAttributionAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorchurn: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorchurn", payload, ctx);
  const llm = getDefaultSuperiorChurnLlm();
  const agentId = String(input.agentId ?? "superiorchurn-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorChurnAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorcompetitive: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorcompetitive", payload, ctx);
  const llm = getDefaultSuperiorCompetitiveLlm();
  const agentId = String(input.agentId ?? "superiorcompetitive-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorCompetitiveAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorcontentai: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorcontentai", payload, ctx);
  const llm = getDefaultSuperiorContentAILlm();
  const agentId = String(input.agentId ?? "superiorcontentai-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorContentAIAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorcrm: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorcrm", payload, ctx);
  const llm = getDefaultSuperiorCrmLlm();
  const agentId = String(input.agentId ?? "superiorcrm-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorCrmAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superioremail: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superioremail", payload, ctx);
  const llm = getDefaultSuperiorEmailLlm();
  const agentId = String(input.agentId ?? "superioremail-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorEmailAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorinfluencer: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorinfluencer", payload, ctx);
  const llm = getDefaultSuperiorInfluencerLlm();
  const agentId = String(input.agentId ?? "superiorinfluencer-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorInfluencerAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorlandingpage: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorlandingpage", payload, ctx);
  const llm = getDefaultSuperiorLandingPageLlm();
  const agentId = String(input.agentId ?? "superiorlandingpage-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorLandingPageAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorleadenrichment: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorleadenrichment", payload, ctx);
  const llm = getDefaultSuperiorLeadEnrichmentLlm();
  const agentId = String(input.agentId ?? "superiorleadenrichment-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorLeadEnrichmentAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorperformance: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorperformance", payload, ctx);
  const llm = getDefaultSuperiorPerformanceLlm();
  const agentId = String(input.agentId ?? "superiorperformance-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorPerformanceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorreporting: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorreporting", payload, ctx);
  const llm = getDefaultSuperiorReportingLlm();
  const agentId = String(input.agentId ?? "superiorreporting-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorReportingAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorreviews: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorreviews", payload, ctx);
  const llm = getDefaultSuperiorReviewsLlm();
  const agentId = String(input.agentId ?? "superiorreviews-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorReviewsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorseo: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorseo", payload, ctx);
  const llm = getDefaultSuperiorSeoLlm();
  const agentId = String(input.agentId ?? "superiorseo-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorSeoAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_superiorsocialmedia: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("superiorsocialmedia", payload, ctx);
  const llm = getDefaultSuperiorSocialMediaLlm();
  const agentId = String(input.agentId ?? "superiorsocialmedia-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runSuperiorSocialMediaAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_technicalseoaudit: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("technicalseoaudit", payload, ctx);
  const llm = getDefaultTechnicalSeoAuditLlm();
  const agentId = String(input.agentId ?? "technicalseoaudit-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runTechnicalSeoAuditAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_telecomunicaciones: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("telecomunicaciones", payload, ctx);
  const llm = getDefaultTelecomunicacionesLlm();
  const agentId = String(input.agentId ?? "telecomunicaciones-os");
  const params = defaultSectorEliteParams();
  return runTelecomunicacionesAgentCore(agentId, llm, params, input as never);
};

const exec_testimonials: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("testimonials", payload, ctx);
  const llm = getDefaultTestimonialsLlm();
  const agentId = String(input.agentId ?? "testimonials-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runTestimonialsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_timezone: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("timezone", payload, ctx);
  const llm = getDefaultTimezoneLlm();
  const agentId = String(input.agentId ?? "timezone-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runTimezoneAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_tourism: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("tourism", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getTourismBusinessProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_transporte: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("transporte", payload, ctx);
  const llm = getDefaultTransporteLlm();
  const agentId = String(input.agentId ?? "transporte-os");
  const params = defaultSectorEliteParams();
  return runTransporteAgentCore(agentId, llm, params, input as never);
};

const exec_uiux: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("uiux", payload, ctx);
  const llm = getDefaultUiuxLlm();
  const agentId = String(input.agentId ?? "uiux-os");
  const params = defaultSectorEliteParams();
  return runUiuxAgentCore(agentId, llm, params, input as never);
};

const exec_veterinary: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("veterinary", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getVetClinicProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_videomarketing: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("videomarketing", payload, ctx);
  const llm = getDefaultVideoMarketingLlm();
  const agentId = String(input.agentId ?? "videomarketing-os");
  const params = defaultSectorEliteParams();
  return runVideoMarketingAgentCore(agentId, llm, params, input as never);
};

const exec_voiceagent: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voiceagent", payload, ctx);
  const llm = getDefaultVoiceAgentLlm();
  const agentId = String(input.agentId ?? "voiceagent-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runVoiceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_voicev10: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev10", payload, ctx);
  const llm = getDefaultVoiceV10Llm();
  const agentId = String(input.agentId ?? "voicev10-os");
  const params = defaultSectorEliteParams();
  return runVoiceV10AgentCore(agentId, llm, params, input as never);
};

const exec_voicev2: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev2", payload, ctx);
  const llm = getDefaultVoiceV2Llm();
  const agentId = String(input.agentId ?? "voicev2-os");
  const params = defaultSectorEliteParams();
  return runVoiceV2AgentCore(agentId, llm, params, input as never);
};

const exec_voicev3: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev3", payload, ctx);
  const llm = getDefaultVoiceV3Llm();
  const agentId = String(input.agentId ?? "voicev3-os");
  const params = defaultSectorEliteParams();
  return runVoiceV3AgentCore(agentId, llm, params, input as never);
};

const exec_voicev4: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev4", payload, ctx);
  const llm = getDefaultVoiceV4Llm();
  const agentId = String(input.agentId ?? "voicev4-os");
  const params = defaultSectorEliteParams();
  return runVoiceV4AgentCore(agentId, llm, params, input as never);
};

const exec_voicev5: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev5", payload, ctx);
  const llm = getDefaultVoiceV5Llm();
  const agentId = String(input.agentId ?? "voicev5-os");
  const params = defaultSectorEliteParams();
  return runVoiceV5AgentCore(agentId, llm, params, input as never);
};

const exec_voicev6: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev6", payload, ctx);
  const llm = getDefaultVoiceV6Llm();
  const agentId = String(input.agentId ?? "voicev6-os");
  const params = defaultSectorEliteParams();
  return runVoiceV6AgentCore(agentId, llm, params, input as never);
};

const exec_voicev7: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev7", payload, ctx);
  const llm = getDefaultVoiceV7Llm();
  const agentId = String(input.agentId ?? "voicev7-os");
  const params = defaultSectorEliteParams();
  return runVoiceV7AgentCore(agentId, llm, params, input as never);
};

const exec_voicev8: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev8", payload, ctx);
  const llm = getDefaultVoiceV8Llm();
  const agentId = String(input.agentId ?? "voicev8-os");
  const params = defaultSectorEliteParams();
  return runVoiceV8AgentCore(agentId, llm, params, input as never);
};

const exec_voicev9: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("voicev9", payload, ctx);
  const llm = getDefaultVoiceV9Llm();
  const agentId = String(input.agentId ?? "voicev9-os");
  const params = defaultSectorEliteParams();
  return runVoiceV9AgentCore(agentId, llm, params, input as never);
};

const exec_web3d: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("web3d", payload, ctx);
  const llm = getDefaultWeb3dLlm();
  const agentId = String(input.agentId ?? "web3d-os");
  const params = defaultSectorEliteParams();
  return runWeb3dAgentCore(agentId, llm, params, input as never);
};

const exec_webinar: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("webinar", payload, ctx);
  const llm = getDefaultWebinarLlm();
  const agentId = String(input.agentId ?? "webinar-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runWebinarAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_webs3d: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("webs3d", payload, ctx);
  const llm = getDefaultWebs3dLlm();
  const agentId = String(input.agentId ?? "webs3d-os");
  const params = defaultSectorEliteParams();
  return runWebs3dAgentCore(agentId, llm, params, input as never);
};

const exec_wellness: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("wellness", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getWellnessBusinessProfileAgent();
  return (agent as { run: (uid: string, inp: unknown) => Promise<unknown> }).run(userId, input as never);
};

const exec_widget: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("widget", payload, ctx);
  const llm = getDefaultWidgetLlm();
  const agentId = String(input.agentId ?? "widget-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runWidgetAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_woocommerce: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("woocommerce", payload, ctx);
  const llm = getDefaultWooCommerceLlm();
  const agentId = String(input.agentId ?? "woocommerce-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runWooCommerceAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_workflow: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("workflow", payload, ctx);
  const llm = getDefaultWorkflowLlm();
  const agentId = String(input.agentId ?? "workflow-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runWorkflowAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_youtubeads: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("youtubeads", payload, ctx);
  const llm = getDefaultYouTubeAdsLlm();
  const agentId = String(input.agentId ?? "youtubeads-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runYouTubeAdsAgentCore(agentId, llm, params, input as never, temperature);
};

const exec_youtubers: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("youtubers", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = getIdeaGeneratorAgent();
  return (agent as { generateIdeas: (uid: string, inp: unknown) => Promise<unknown> }).generateIdeas(userId, input as never);
};

const exec_zapier: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {
  const input = buildSectorInputFromPayload("zapier", payload, ctx);
  const llm = getDefaultZapierLlm();
  const agentId = String(input.agentId ?? "zapier-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return runZapierAgentCore(agentId, llm, params, input as never, temperature);
};

export const SECTOR_OS_AGENT_REGISTRY: Record<OsSectorServiceId, SectorFactory> = {
  "ads": () => new SectorAgentWrapper({ serviceId: "ads", executor: exec_ads }),
  "agenciasmarketing": () => new SectorAgentWrapper({ serviceId: "agenciasmarketing", executor: exec_agenciasmarketing }),
  "agencycert": () => new SectorAgentWrapper({ serviceId: "agencycert", executor: exec_agencycert }),
  "agrofood": () => new SectorAgentWrapper({ serviceId: "agrofood", executor: exec_agrofood }),
  "animacion": () => new SectorAgentWrapper({ serviceId: "animacion", executor: exec_animacion }),
  "antigeneric": () => new SectorAgentWrapper({ serviceId: "antigeneric", executor: exec_antigeneric }),
  "apollo": () => new SectorAgentWrapper({ serviceId: "apollo", executor: exec_apollo }),
  "appbuilderwhitelabel": () => new SectorAgentWrapper({ serviceId: "appbuilderwhitelabel", executor: exec_appbuilderwhitelabel }),
  "arquitectura": () => new SectorAgentWrapper({ serviceId: "arquitectura", executor: exec_arquitectura }),
  "artenft": () => new SectorAgentWrapper({ serviceId: "artenft", executor: exec_artenft }),
  "audiovisual": () => new SectorAgentWrapper({ serviceId: "audiovisual", executor: exec_audiovisual }),
  "auditlog": () => new SectorAgentWrapper({ serviceId: "auditlog", executor: exec_auditlog }),
  "automotive": () => new SectorAgentWrapper({ serviceId: "automotive", executor: exec_automotive }),
  "autoprocesos": () => new SectorAgentWrapper({ serviceId: "autoprocesos", executor: exec_autoprocesos }),
  "b2b": () => new SectorAgentWrapper({ serviceId: "b2b", executor: exec_b2b }),
  "backupdisasterrecovery": () => new SectorAgentWrapper({ serviceId: "backupdisasterrecovery", executor: exec_backupdisasterrecovery }),
  "badges": () => new SectorAgentWrapper({ serviceId: "badges", executor: exec_badges }),
  "billing": () => new SectorAgentWrapper({ serviceId: "billing", executor: exec_billing }),
  "bingads": () => new SectorAgentWrapper({ serviceId: "bingads", executor: exec_bingads }),
  "bookingcalendario": () => new SectorAgentWrapper({ serviceId: "bookingcalendario", executor: exec_bookingcalendario }),
  "branding": () => new SectorAgentWrapper({ serviceId: "branding", executor: exec_branding }),
  "cdp": () => new SectorAgentWrapper({ serviceId: "cdp", executor: exec_cdp }),
  "chatwidget": () => new SectorAgentWrapper({ serviceId: "chatwidget", executor: exec_chatwidget }),
  "churn": () => new SectorAgentWrapper({ serviceId: "churn", executor: exec_churn }),
  "ciberseguridad": () => new SectorAgentWrapper({ serviceId: "ciberseguridad", executor: exec_ciberseguridad }),
  "coaching": () => new SectorAgentWrapper({ serviceId: "coaching", executor: exec_coaching }),
  "community": () => new SectorAgentWrapper({ serviceId: "community", executor: exec_community }),
  "comparator": () => new SectorAgentWrapper({ serviceId: "comparator", executor: exec_comparator }),
  "competitive": () => new SectorAgentWrapper({ serviceId: "competitive", executor: exec_competitive }),
  "compliance": () => new SectorAgentWrapper({ serviceId: "compliance", executor: exec_compliance }),
  "construction": () => new SectorAgentWrapper({ serviceId: "construction", executor: exec_construction }),
  "consultoria": () => new SectorAgentWrapper({ serviceId: "consultoria", executor: exec_consultoria }),
  "contabilidad": () => new SectorAgentWrapper({ serviceId: "contabilidad", executor: exec_contabilidad }),
  "contactenrichmentmasivo": () => new SectorAgentWrapper({ serviceId: "contactenrichmentmasivo", executor: exec_contactenrichmentmasivo }),
  "contentscore": () => new SectorAgentWrapper({ serviceId: "contentscore", executor: exec_contentscore }),
  "copywriting": () => new SectorAgentWrapper({ serviceId: "copywriting", executor: exec_copywriting }),
  "creative": () => new SectorAgentWrapper({ serviceId: "creative", executor: exec_creative }),
  "crypto": () => new SectorAgentWrapper({ serviceId: "crypto", executor: exec_crypto }),
  "customerjourney": () => new SectorAgentWrapper({ serviceId: "customerjourney", executor: exec_customerjourney }),
  "customersuccess": () => new SectorAgentWrapper({ serviceId: "customersuccess", executor: exec_customersuccess }),
  "databaseimport": () => new SectorAgentWrapper({ serviceId: "databaseimport", executor: exec_databaseimport }),
  "demo": () => new SectorAgentWrapper({ serviceId: "demo", executor: exec_demo }),
  "deporte": () => new SectorAgentWrapper({ serviceId: "deporte", executor: exec_deporte }),
  "dialer": () => new SectorAgentWrapper({ serviceId: "dialer", executor: exec_dialer }),
  "disenoweb": () => new SectorAgentWrapper({ serviceId: "disenoweb", executor: exec_disenoweb }),
  "ecommerce": () => new SectorAgentWrapper({ serviceId: "ecommerce", executor: exec_ecommerce }),
  "ecommerceconv": () => new SectorAgentWrapper({ serviceId: "ecommerceconv", executor: exec_ecommerceconv }),
  "education": () => new SectorAgentWrapper({ serviceId: "education", executor: exec_education }),
  "emailmarketing": () => new SectorAgentWrapper({ serviceId: "emailmarketing", executor: exec_emailmarketing }),
  "energia": () => new SectorAgentWrapper({ serviceId: "energia", executor: exec_energia }),
  "enterprisequalitycalibration": () => new SectorAgentWrapper({ serviceId: "enterprisequalitycalibration", executor: exec_enterprisequalitycalibration }),
  "estetica": () => new SectorAgentWrapper({ serviceId: "estetica", executor: exec_estetica }),
  "eventos": () => new SectorAgentWrapper({ serviceId: "eventos", executor: exec_eventos }),
  "experiencemanagement": () => new SectorAgentWrapper({ serviceId: "experiencemanagement", executor: exec_experiencemanagement }),
  "fashion": () => new SectorAgentWrapper({ serviceId: "fashion", executor: exec_fashion }),
  "finance": () => new SectorAgentWrapper({ serviceId: "finance", executor: exec_finance }),
  "fintech": () => new SectorAgentWrapper({ serviceId: "fintech", executor: exec_fintech }),
  "firstparty": () => new SectorAgentWrapper({ serviceId: "firstparty", executor: exec_firstparty }),
  "fiscalbilling": () => new SectorAgentWrapper({ serviceId: "fiscalbilling", executor: exec_fiscalbilling }),
  "formulariosencuestas": () => new SectorAgentWrapper({ serviceId: "formulariosencuestas", executor: exec_formulariosencuestas }),
  "fotografia": () => new SectorAgentWrapper({ serviceId: "fotografia", executor: exec_fotografia }),
  "franquicias": () => new SectorAgentWrapper({ serviceId: "franquicias", executor: exec_franquicias }),
  "freelancers": () => new SectorAgentWrapper({ serviceId: "freelancers", executor: exec_freelancers }),
  "funnelmultipaso": () => new SectorAgentWrapper({ serviceId: "funnelmultipaso", executor: exec_funnelmultipaso }),
  "gaming": () => new SectorAgentWrapper({ serviceId: "gaming", executor: exec_gaming }),
  "gcalzoom": () => new SectorAgentWrapper({ serviceId: "gcalzoom", executor: exec_gcalzoom }),
  "geoengine": () => new SectorAgentWrapper({ serviceId: "geoengine", executor: exec_geoengine }),
  "gobierno": () => new SectorAgentWrapper({ serviceId: "gobierno", executor: exec_gobierno }),
  "growthhacking": () => new SectorAgentWrapper({ serviceId: "growthhacking", executor: exec_growthhacking }),
  "health": () => new SectorAgentWrapper({ serviceId: "health", executor: exec_health }),
  "helpdeskomnichannel": () => new SectorAgentWrapper({ serviceId: "helpdeskomnichannel", executor: exec_helpdeskomnichannel }),
  "hipaacompliance": () => new SectorAgentWrapper({ serviceId: "hipaacompliance", executor: exec_hipaacompliance }),
  "home": () => new SectorAgentWrapper({ serviceId: "home", executor: exec_home }),
  "hospitality": () => new SectorAgentWrapper({ serviceId: "hospitality", executor: exec_hospitality }),
  "hrtech": () => new SectorAgentWrapper({ serviceId: "hrtech", executor: exec_hrtech }),
  "iapredictiva": () => new SectorAgentWrapper({ serviceId: "iapredictiva", executor: exec_iapredictiva }),
  "imagenes": () => new SectorAgentWrapper({ serviceId: "imagenes", executor: exec_imagenes }),
  "influencer": () => new SectorAgentWrapper({ serviceId: "influencer", executor: exec_influencer }),
  "influencers": () => new SectorAgentWrapper({ serviceId: "influencers", executor: exec_influencers }),
  "inmobiliariacomercial": () => new SectorAgentWrapper({ serviceId: "inmobiliariacomercial", executor: exec_inmobiliariacomercial }),
  "integracionesnativas": () => new SectorAgentWrapper({ serviceId: "integracionesnativas", executor: exec_integracionesnativas }),
  "investigador": () => new SectorAgentWrapper({ serviceId: "investigador", executor: exec_investigador }),
  "klaviyo": () => new SectorAgentWrapper({ serviceId: "klaviyo", executor: exec_klaviyo }),
  "knowledgebaseai": () => new SectorAgentWrapper({ serviceId: "knowledgebaseai", executor: exec_knowledgebaseai }),
  "landing": () => new SectorAgentWrapper({ serviceId: "landing", executor: exec_landing }),
  "leadenrich": () => new SectorAgentWrapper({ serviceId: "leadenrich", executor: exec_leadenrich }),
  "leaderboard": () => new SectorAgentWrapper({ serviceId: "leaderboard", executor: exec_leaderboard }),
  "legal": () => new SectorAgentWrapper({ serviceId: "legal", executor: exec_legal }),
  "logistics": () => new SectorAgentWrapper({ serviceId: "logistics", executor: exec_logistics }),
  "manufactura": () => new SectorAgentWrapper({ serviceId: "manufactura", executor: exec_manufactura }),
  "marca": () => new SectorAgentWrapper({ serviceId: "marca", executor: exec_marca }),
  "marketplace": () => new SectorAgentWrapper({ serviceId: "marketplace", executor: exec_marketplace }),
  "media": () => new SectorAgentWrapper({ serviceId: "media", executor: exec_media }),
  "membershipportalwhitelabel": () => new SectorAgentWrapper({ serviceId: "membershipportalwhitelabel", executor: exec_membershipportalwhitelabel }),
  "membresiacursos": () => new SectorAgentWrapper({ serviceId: "membresiacursos", executor: exec_membresiacursos }),
  "mfa": () => new SectorAgentWrapper({ serviceId: "mfa", executor: exec_mfa }),
  "mobile": () => new SectorAgentWrapper({ serviceId: "mobile", executor: exec_mobile }),
  "multicurrency": () => new SectorAgentWrapper({ serviceId: "multicurrency", executor: exec_multicurrency }),
  "multiidiomaautomatico": () => new SectorAgentWrapper({ serviceId: "multiidiomaautomatico", executor: exec_multiidiomaautomatico }),
  "multimodal": () => new SectorAgentWrapper({ serviceId: "multimodal", executor: exec_multimodal }),
  "music": () => new SectorAgentWrapper({ serviceId: "music", executor: exec_music }),
  "neuromarketing": () => new SectorAgentWrapper({ serviceId: "neuromarketing", executor: exec_neuromarketing }),
  "newsletter": () => new SectorAgentWrapper({ serviceId: "newsletter", executor: exec_newsletter }),
  "ngo": () => new SectorAgentWrapper({ serviceId: "ngo", executor: exec_ngo }),
  "observability": () => new SectorAgentWrapper({ serviceId: "observability", executor: exec_observability }),
  "okrmanagement": () => new SectorAgentWrapper({ serviceId: "okrmanagement", executor: exec_okrmanagement }),
  "onboarding": () => new SectorAgentWrapper({ serviceId: "onboarding", executor: exec_onboarding }),
  "optimizador": () => new SectorAgentWrapper({ serviceId: "optimizador", executor: exec_optimizador }),
  "outboundb2b": () => new SectorAgentWrapper({ serviceId: "outboundb2b", executor: exec_outboundb2b }),
  "partnership": () => new SectorAgentWrapper({ serviceId: "partnership", executor: exec_partnership }),
  "payment": () => new SectorAgentWrapper({ serviceId: "payment", executor: exec_payment }),
  "perfpredictor": () => new SectorAgentWrapper({ serviceId: "perfpredictor", executor: exec_perfpredictor }),
  "personalizacionmasiva": () => new SectorAgentWrapper({ serviceId: "personalizacionmasiva", executor: exec_personalizacionmasiva }),
  "pharmacy": () => new SectorAgentWrapper({ serviceId: "pharmacy", executor: exec_pharmacy }),
  "pinterestads": () => new SectorAgentWrapper({ serviceId: "pinterestads", executor: exec_pinterestads }),
  "podcast": () => new SectorAgentWrapper({ serviceId: "podcast", executor: exec_podcast }),
  "podcasts": () => new SectorAgentWrapper({ serviceId: "podcasts", executor: exec_podcasts }),
  "prestashop": () => new SectorAgentWrapper({ serviceId: "prestashop", executor: exec_prestashop }),
  "pricingdinamico": () => new SectorAgentWrapper({ serviceId: "pricingdinamico", executor: exec_pricingdinamico }),
  "productanalytics": () => new SectorAgentWrapper({ serviceId: "productanalytics", executor: exec_productanalytics }),
  "proteccionip": () => new SectorAgentWrapper({ serviceId: "proteccionip", executor: exec_proteccionip }),
  "publicapi": () => new SectorAgentWrapper({ serviceId: "publicapi", executor: exec_publicapi }),
  "push": () => new SectorAgentWrapper({ serviceId: "push", executor: exec_push }),
  "pwa": () => new SectorAgentWrapper({ serviceId: "pwa", executor: exec_pwa }),
  "qrcodegenerator": () => new SectorAgentWrapper({ serviceId: "qrcodegenerator", executor: exec_qrcodegenerator }),
  "ratelimit": () => new SectorAgentWrapper({ serviceId: "ratelimit", executor: exec_ratelimit }),
  "realestate": () => new SectorAgentWrapper({ serviceId: "realestate", executor: exec_realestate }),
  "realtime": () => new SectorAgentWrapper({ serviceId: "realtime", executor: exec_realtime }),
  "referral": () => new SectorAgentWrapper({ serviceId: "referral", executor: exec_referral }),
  "reporting": () => new SectorAgentWrapper({ serviceId: "reporting", executor: exec_reporting }),
  "restaurantes": () => new SectorAgentWrapper({ serviceId: "restaurantes", executor: exec_restaurantes }),
  "retail": () => new SectorAgentWrapper({ serviceId: "retail", executor: exec_retail }),
  "revenueintelligence": () => new SectorAgentWrapper({ serviceId: "revenueintelligence", executor: exec_revenueintelligence }),
  "reviews": () => new SectorAgentWrapper({ serviceId: "reviews", executor: exec_reviews }),
  "saasb2b": () => new SectorAgentWrapper({ serviceId: "saasb2b", executor: exec_saasb2b }),
  "salesintelligence": () => new SectorAgentWrapper({ serviceId: "salesintelligence", executor: exec_salesintelligence }),
  "scaling": () => new SectorAgentWrapper({ serviceId: "scaling", executor: exec_scaling }),
  "seguridadcodigo": () => new SectorAgentWrapper({ serviceId: "seguridadcodigo", executor: exec_seguridadcodigo }),
  "seguros": () => new SectorAgentWrapper({ serviceId: "seguros", executor: exec_seguros }),
  "seo": () => new SectorAgentWrapper({ serviceId: "seo", executor: exec_seo }),
  "sessionreplay": () => new SectorAgentWrapper({ serviceId: "sessionreplay", executor: exec_sessionreplay }),
  "sla": () => new SectorAgentWrapper({ serviceId: "sla", executor: exec_sla }),
  "slack": () => new SectorAgentWrapper({ serviceId: "slack", executor: exec_slack }),
  "social": () => new SectorAgentWrapper({ serviceId: "social", executor: exec_social }),
  "social_share": () => new SectorAgentWrapper({ serviceId: "social_share", executor: exec_social_share }),
  "sociallisteningbrand": () => new SectorAgentWrapper({ serviceId: "sociallisteningbrand", executor: exec_sociallisteningbrand }),
  "socialvideo": () => new SectorAgentWrapper({ serviceId: "socialvideo", executor: exec_socialvideo }),
  "sports": () => new SectorAgentWrapper({ serviceId: "sports", executor: exec_sports }),
  "startups": () => new SectorAgentWrapper({ serviceId: "startups", executor: exec_startups }),
  "superiorabtesting": () => new SectorAgentWrapper({ serviceId: "superiorabtesting", executor: exec_superiorabtesting }),
  "superiorattribution": () => new SectorAgentWrapper({ serviceId: "superiorattribution", executor: exec_superiorattribution }),
  "superiorchurn": () => new SectorAgentWrapper({ serviceId: "superiorchurn", executor: exec_superiorchurn }),
  "superiorcompetitive": () => new SectorAgentWrapper({ serviceId: "superiorcompetitive", executor: exec_superiorcompetitive }),
  "superiorcontentai": () => new SectorAgentWrapper({ serviceId: "superiorcontentai", executor: exec_superiorcontentai }),
  "superiorcrm": () => new SectorAgentWrapper({ serviceId: "superiorcrm", executor: exec_superiorcrm }),
  "superioremail": () => new SectorAgentWrapper({ serviceId: "superioremail", executor: exec_superioremail }),
  "superiorinfluencer": () => new SectorAgentWrapper({ serviceId: "superiorinfluencer", executor: exec_superiorinfluencer }),
  "superiorlandingpage": () => new SectorAgentWrapper({ serviceId: "superiorlandingpage", executor: exec_superiorlandingpage }),
  "superiorleadenrichment": () => new SectorAgentWrapper({ serviceId: "superiorleadenrichment", executor: exec_superiorleadenrichment }),
  "superiorperformance": () => new SectorAgentWrapper({ serviceId: "superiorperformance", executor: exec_superiorperformance }),
  "superiorreporting": () => new SectorAgentWrapper({ serviceId: "superiorreporting", executor: exec_superiorreporting }),
  "superiorreviews": () => new SectorAgentWrapper({ serviceId: "superiorreviews", executor: exec_superiorreviews }),
  "superiorseo": () => new SectorAgentWrapper({ serviceId: "superiorseo", executor: exec_superiorseo }),
  "superiorsocialmedia": () => new SectorAgentWrapper({ serviceId: "superiorsocialmedia", executor: exec_superiorsocialmedia }),
  "technicalseoaudit": () => new SectorAgentWrapper({ serviceId: "technicalseoaudit", executor: exec_technicalseoaudit }),
  "telecomunicaciones": () => new SectorAgentWrapper({ serviceId: "telecomunicaciones", executor: exec_telecomunicaciones }),
  "testimonials": () => new SectorAgentWrapper({ serviceId: "testimonials", executor: exec_testimonials }),
  "timezone": () => new SectorAgentWrapper({ serviceId: "timezone", executor: exec_timezone }),
  "tourism": () => new SectorAgentWrapper({ serviceId: "tourism", executor: exec_tourism }),
  "transporte": () => new SectorAgentWrapper({ serviceId: "transporte", executor: exec_transporte }),
  "uiux": () => new SectorAgentWrapper({ serviceId: "uiux", executor: exec_uiux }),
  "veterinary": () => new SectorAgentWrapper({ serviceId: "veterinary", executor: exec_veterinary }),
  "videomarketing": () => new SectorAgentWrapper({ serviceId: "videomarketing", executor: exec_videomarketing }),
  "voiceagent": () => new SectorAgentWrapper({ serviceId: "voiceagent", executor: exec_voiceagent }),
  "voicev10": () => new SectorAgentWrapper({ serviceId: "voicev10", executor: exec_voicev10 }),
  "voicev2": () => new SectorAgentWrapper({ serviceId: "voicev2", executor: exec_voicev2 }),
  "voicev3": () => new SectorAgentWrapper({ serviceId: "voicev3", executor: exec_voicev3 }),
  "voicev4": () => new SectorAgentWrapper({ serviceId: "voicev4", executor: exec_voicev4 }),
  "voicev5": () => new SectorAgentWrapper({ serviceId: "voicev5", executor: exec_voicev5 }),
  "voicev6": () => new SectorAgentWrapper({ serviceId: "voicev6", executor: exec_voicev6 }),
  "voicev7": () => new SectorAgentWrapper({ serviceId: "voicev7", executor: exec_voicev7 }),
  "voicev8": () => new SectorAgentWrapper({ serviceId: "voicev8", executor: exec_voicev8 }),
  "voicev9": () => new SectorAgentWrapper({ serviceId: "voicev9", executor: exec_voicev9 }),
  "web3d": () => new SectorAgentWrapper({ serviceId: "web3d", executor: exec_web3d }),
  "webinar": () => new SectorAgentWrapper({ serviceId: "webinar", executor: exec_webinar }),
  "webs3d": () => new SectorAgentWrapper({ serviceId: "webs3d", executor: exec_webs3d }),
  "wellness": () => new SectorAgentWrapper({ serviceId: "wellness", executor: exec_wellness }),
  "widget": () => new SectorAgentWrapper({ serviceId: "widget", executor: exec_widget }),
  "woocommerce": () => new SectorAgentWrapper({ serviceId: "woocommerce", executor: exec_woocommerce }),
  "workflow": () => new SectorAgentWrapper({ serviceId: "workflow", executor: exec_workflow }),
  "youtubeads": () => new SectorAgentWrapper({ serviceId: "youtubeads", executor: exec_youtubeads }),
  "youtubers": () => new SectorAgentWrapper({ serviceId: "youtubers", executor: exec_youtubers }),
  "zapier": () => new SectorAgentWrapper({ serviceId: "zapier", executor: exec_zapier }),
};

export function isSectorServiceId(id: string): id is OsSectorServiceId {
  return (OS_SECTOR_SERVICE_IDS as readonly string[]).includes(id);
}

export function instantiateSectorOsAgent(serviceId: string): BaseOsAgent | null {
  if (!isSectorServiceId(serviceId)) return null;
  return SECTOR_OS_AGENT_REGISTRY[serviceId]();
}
