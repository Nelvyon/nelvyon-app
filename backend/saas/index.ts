export {
  SaasOnboardingService,
  SaasOnboardingError,
  assertSaasPlan,
  SaasPlanValidationError,
  getSaasOnboardingService,
  resetSaasOnboardingServiceForTests,
  type SaasPostgresPort,
  type SaasTenant,
  type SaasTenantRow,
  type SaasPlan,
  type CreateSaasTenantInput,
  type UpdateSaasTenantPatch,
  type SaasOnboardingErrorCode,
} from "./SaasOnboardingService";
export {
  SaasTenantBridgeService,
  SaasTenantBridgeError,
  getSaasTenantBridgeService,
  resetSaasTenantBridgeServiceForTests,
} from "./SaasTenantBridgeService";
export {
  mapBillablePlanToSaasPlan,
  normalizeBillablePlanId,
  shouldSyncSaasTenantPlan,
  isSaasPlanSyncStatus,
  type BillablePlanId,
} from "./saasTenantMapper";
export {
  SaasBillingSyncService,
  getSaasBillingSyncService,
  resetSaasBillingSyncServiceForTests,
  type SaasBillingSyncMode,
  type SaasBillingSyncResult,
  type SaasBillingSyncBatchReport,
  type SaasBillingSyncHint,
  type SaasBillingSyncSkipReason,
} from "./SaasBillingSyncService";
export {
  SAAS_CRM_SOURCE_OF_TRUTH,
  LEGACY_CONTACT_STORES,
  FROZEN_LEGACY_CRM_WRITE_PATHS,
  isFrozenLegacyCrmWritePath,
  type LegacyCrmWritePath,
} from "./crmConsolidation";
export {
  SaasTenantBridgeValidationService,
  getSaasTenantBridgeValidationService,
  resetSaasTenantBridgeValidationServiceForTests,
  type TenantBridgeValidationReport,
} from "./SaasTenantBridgeValidation";
export {
  SaasCrmEtlService,
  getSaasCrmEtlService,
  resetSaasCrmEtlServiceForTests,
  type SaasCrmEtlReport,
  type EtlMode,
  type CrmEtlRunOptions,
  type EtlConflict,
} from "./SaasCrmEtlService";
export {
  buildDedupeKey,
  etlLegacyIdTag,
  etlSourceTag,
  mapLegacyStatusToSaas,
  mapLegacyStageToSaas,
  type EtlSource,
} from "./saasCrmDedupe";
export { warnLegacyCrmWrite, resetLegacyCrmWriteWarningsForTests } from "./legacyCrmGuard";
export {
  SaasDashboardService,
  SaasDashboardError,
  getSaasDashboardService,
  resetSaasDashboardServiceForTests,
  type DashboardSummary,
  type ActivityLog,
} from "./SaasDashboardService";
export {
  SaasCrmService,
  SaasCrmError,
  getSaasCrmService,
  resetSaasCrmServiceForTests,
  type SaasContact,
  type ContactActivity,
  type PipelineSummary,
  type ContactStatus,
  type PipelineStage,
  type ActivityType,
} from "./SaasCrmService";
export {
  SaasDealsService,
  SaasDealsError,
  getSaasDealsService,
  resetSaasDealsServiceForTests,
  type SaasDeal,
  type DealFilters,
  type CreateDealInput,
  type UpdateDealInput,
  type SaasDealsMetrics,
  type ContactDealsContext,
  type StageMetricsItem,
} from "./SaasDealsService";
export {
  SaasDealsEtlService,
  getSaasDealsEtlService,
  resetSaasDealsEtlServiceForTests,
  type SaasDealsEtlReport,
  type DealsEtlMode,
  type DealsEtlRunOptions,
  type DealsEtlConflict,
} from "./SaasDealsEtlService";
export {
  buildDealDedupeKey,
  mapLegacyDealStageToSaas,
  etlDealLegacySourceTag,
  isOpenDealStage,
  pickDealEtlWinner,
  OPEN_DEAL_STAGES,
  type DealStage,
  type DealEtlSource,
} from "./saasDealsDedupe";
export {
  pickContactEtlWinner,
} from "./saasCrmDedupe";
export {
  BlockBFinalAuditService,
  type BlockBFinalAuditReport,
} from "./BlockBFinalAudit";
export {
  SaasWorkflowService,
  SaasWorkflowError,
  getSaasWorkflowService,
  resetSaasWorkflowServiceForTests,
  type SaasWorkflow,
  type WorkflowRun,
  type WorkflowAction,
  type WorkflowCondition,
  type WorkflowStatus,
  type TriggerType,
} from "./SaasWorkflowService";
export { dispatchDealStageChanged } from "./saasWorkflowDispatch";
export {
  SaasCampaniasService,
  SaasCampaniasError,
  getSaasCampaniasService,
  resetSaasCampaniasServiceForTests,
  type SaasCampania,
  type CampaniaRecipient,
  type CampaniaStats,
  type CampaniaLaunchResult,
  type CampaniaStatus,
  type CampaniaChannel,
  type RecipientStatus,
  type AudienceFilter,
} from "./SaasCampaniasService";
export {
  DragDropWorkflowService,
  getDragDropWorkflowService,
  resetDragDropWorkflowServiceForTests,
  type DragDropWorkflow,
  type DragDropNode,
  type DragDropEdge,
} from "./DragDropWorkflowService";
export {
  DashboardMetricsService,
  getDashboardMetricsService,
  resetDashboardMetricsServiceForTests,
  type ROIChartData,
  type TrafficChartData,
  type ConversionChartData,
  type MRRChartData,
  type DashboardSummary as DashboardMetricsSummary,
} from "./DashboardMetricsService";
export {
  TemplateMarketplaceService,
  getTemplateMarketplaceService,
  resetTemplateMarketplaceServiceForTests,
  type TemplateFilters,
  type TemplateConfig,
  type MarketplaceTemplate,
} from "./TemplateMarketplaceService";
export {
  AgentLanguageService,
  getAgentLanguageService,
  resetAgentLanguageServiceForTests,
  type SupportedLanguageCode,
  type LanguagePreferenceCode,
  type SupportedLanguageItem,
} from "./AgentLanguageService";
export {
  ABTestingService,
  getABTestingService,
  resetABTestingServiceForTests,
  type ABMetric,
  type ABTestStatus,
  type ABVariantInput,
  type CreateABTestConfig,
  type ABVariantMetrics,
  type ABTest,
} from "./ABTestingService";
export {
  SentimentMonitorService,
  getSentimentMonitorService,
  resetSentimentMonitorServiceForTests,
  type SentimentLabel,
  type SentimentAnalysis,
  type SentimentMention,
  type SentimentStats,
  type SentimentTrendPoint,
  type SentimentChannelDistribution,
} from "./SentimentMonitorService";
export {
  LeadScoringService,
  getLeadScoringService,
  resetLeadScoringServiceForTests,
  type LeadCategory,
  type LeadData,
  type LeadScoreResult,
  type ScoredLead,
} from "./LeadScoringService";
export {
  ClientBriefingService,
  getClientBriefingService,
  resetClientBriefingServiceForTests,
  type BriefingInput,
  type BriefingResult,
  type ClientBriefing,
} from "./ClientBriefingService";
export {
  DigitalContractsService,
  getDigitalContractsService,
  resetDigitalContractsServiceForTests,
  type ContractStatus,
  type ContractInput,
  type GeneratedContract,
  type DigitalContract,
} from "./DigitalContractsService";
export {
  BookingService,
  getBookingService,
  resetBookingServiceForTests,
  parseTimeToMinutes,
  formatMinutesToHHmm,
  type BookingStatus,
  type WeeklyAvailabilityConfig,
  type AvailabilityConfig,
  type DayInterval,
  type CreateBookingInput,
  type Booking,
  type BookingFilters,
  type BookingServiceDeps,
} from "./BookingService";
export {
  ColdEmailService,
  getColdEmailService,
  resetColdEmailServiceForTests,
  type ColdEmailSequenceEmail,
  type GenerateSequenceInput,
  type GeneratedSequence,
  type CampaignStatus,
  type ProspectStatus,
  type ColdEmailCampaign,
  type ColdEmailProspect,
  type ProspectInput,
  type CreateCampaignInput,
  type CampaignStats,
  type ColdEmailServiceDeps,
} from "./ColdEmailService";
export {
  ChatbotService,
  getChatbotService,
  resetChatbotServiceForTests,
  type ChatbotTheme,
  type ChatbotConfigInput,
  type ChatbotConfig,
  type ChatMessage,
  type ChatResult,
  type CapturedLead,
  type ConversationSummary,
  type ChatbotStats,
  type ChatbotServiceDeps,
} from "./ChatbotService";
export {
  HeatmapService,
  getHeatmapService,
  resetHeatmapServiceForTests,
  type HeatmapEventType,
  type HeatmapTrackEvent,
  type HeatmapSessionData,
  type HeatmapPoint,
  type SessionRow,
  type FunnelStepResult,
  type FunnelAnalysis,
  type AIAnalysisResult,
  type HeatmapAlert,
  type SiteConfig,
  type SessionFilters,
  type HeatmapServiceDeps,
} from "./HeatmapService";
export {
  TranscriptionService,
  getTranscriptionService,
  resetTranscriptionServiceForTests,
  type TranscriptionContext,
  type TranscriptionInput,
  type TranscribeResult,
  type AnalysisResult,
  type TranscriptionRecord,
  type TranscriptionListItem,
  type TranscriptionServiceDeps,
} from "./TranscriptionService";
export {
  InvoicingService,
  getInvoicingService,
  resetInvoicingServiceForTests,
  type InvoiceStatus,
  type InvoiceItemInput,
  type CreateInvoiceInput,
  type InvoiceItem,
  type InvoiceRecord,
  type InvoiceFilters,
  type InvoiceStats,
  type InvoicingServiceDeps,
} from "./InvoicingService";
export {
  canSaasPerform,
  assertSaasPermission,
  mapWorkspaceRoleToSaas,
  listPermissionsForRole,
  SaasRbacError,
  type SaasRole,
  type SaasAction,
} from "./saasRbac";
export {
  getSaasPlanLimits,
  getSaasPlanLimit,
  assertBelowPlanLimit,
  SaasPlanQuotaError,
  type SaasPlanResource,
  type SaasPlanLimits,
} from "./saasPlanLimits";
export {
  assertSaasPlanCanCreate,
  getSaasResourceUsage,
  getSaasTenantPlan,
} from "./saasPlanQuota";
export {
  SaasPlanQuotaService,
  getSaasPlanQuotaService,
  resetSaasPlanQuotaServiceForTests,
} from "./SaasPlanQuotaService";
export {
  requireSaasContext,
  saasErrorStatus,
  saasErrorBody,
  type SaasRequestContext,
} from "./saasRequestContext";
export {
  buildSaasBillingSummary,
  buildSaasSettingsSummary,
  type SaasBillingSummary,
  type SaasSettingsSummary,
  type SaasUsageCounts,
} from "./SaasBillingService";
export {
  SaasSnippetsService,
  SaasSnippetsError,
  getSaasSnippetsService,
  resetSaasSnippetsServiceForTests,
  type SaasSnippet,
  type CreateSnippetInput,
} from "./SaasSnippetsService";
export {
  SaasWebhooksService,
  SaasWebhooksError,
  getSaasWebhooksService,
  resetSaasWebhooksServiceForTests,
  type SaasWebhook,
  type SaasWebhookDelivery,
  type CreateWebhookInput,
} from "./SaasWebhooksService";
export {
  SaasApiKeysService,
  SaasApiKeysError,
  getSaasApiKeysService,
  resetSaasApiKeysServiceForTests,
  type SaasApiKey,
  type CreateApiKeyInput,
  type CreateApiKeyResult,
} from "./SaasApiKeysService";
export {
  SaasCalendarService,
  SaasCalendarError,
  getSaasCalendarService,
  resetSaasCalendarServiceForTests,
  type SaasCalendarEvent,
  type CreateCalendarEventInput,
  type CalendarEventType,
} from "./SaasCalendarService";
export {
  SaasTeamService,
  SaasTeamError,
  getSaasTeamService,
  resetSaasTeamServiceForTests,
  type SaasTeamMember,
  type InviteTeamMemberInput,
  type TeamMemberRole,
  type TeamMemberStatus,
} from "./SaasTeamService";
export {
  SaasInboxService,
  SaasInboxError,
  getSaasInboxService,
  resetSaasInboxServiceForTests,
  type SaasConversation,
  type SaasMessage,
  type CreateConversationInput,
  type SendMessageInput,
  type InboxChannel,
  type ConversationStatus,
  type ReplyResult,
} from "./SaasInboxService";
export {
  SaasSequencesService,
  SaasSequencesError,
  getSaasSequencesService,
  resetSaasSequencesServiceForTests,
  type SaasSequence,
  type SaasSequenceStep,
  type SaasSequenceEnrollment,
  type CreateSequenceInput,
  type CreateStepInput,
  type UpdateStepInput,
  type SequenceStepType,
  type BranchCondition,
  type SequenceStatus,
  type SequenceTrigger,
} from "./SaasSequencesService";
export {
  SaasAbTestingService,
  SaasAbTestingError,
  getSaasAbTestingService,
  resetSaasAbTestingServiceForTests,
  type SaasAbTest,
  type AbVariant,
  type CreateAbTestInput,
  type AbTestStatus,
  type AbTestType,
} from "./SaasAbTestingService";
export {
  SaasSmsService,
  SaasSmsError,
  getSaasSmsService,
  resetSaasSmsServiceForTests,
  type SmsSendResult,
  type SaasSmsConfigured,
} from "./SaasSmsService";
export {
  dispatchFormSubmitted,
  dispatchTagAdded,
  dispatchEmailOpened,
  dispatchEmailClicked,
  dispatchWebhookIn,
  dispatchDateReached,
} from "./saasWorkflowDispatch";
export {
  SaasWorkflowRecipesService,
  SaasWorkflowRecipesError,
  getSaasWorkflowRecipesService,
  resetSaasWorkflowRecipesServiceForTests,
  type WorkflowRecipe,
  type RecipeCategory,
} from "./SaasWorkflowRecipesService";
export {
  SaasSocialService,
  SaasSocialError,
  getSaasSocialService,
  resetSaasSocialServiceForTests,
  type SocialPlatform,
  type SocialPostStatus,
  type SocialAccount,
  type SocialPost,
  type CreateSocialAccountInput,
  type CreateSocialPostInput,
  type PublishNowResult,
} from "./SaasSocialService";
export {
  SaasAdsDashboardService,
  SaasAdsDashboardError,
  getSaasAdsDashboardService,
  resetSaasAdsDashboardServiceForTests,
  type AdsPlatform,
  type AdsConnection,
  type AdsMetrics,
  type AdsConnectionInput,
  type AdsStatusResult,
  type AdsCampaign,
  type AdsCampaignStatus,
  type RoasAlert,
} from "./SaasAdsDashboardService";
export {
  SaasUtmService,
  SaasUtmError,
  getSaasUtmService,
  resetSaasUtmServiceForTests,
  type UtmLink,
  type CreateUtmLinkInput,
  type UtmClickRecord,
  type UtmStats,
} from "./SaasUtmService";
export {
  SaasFacturasService,
  getSaasFacturasService,
  resetSaasFacturasServiceForTests,
  type Factura,
  type FacturaStatus,
  type FacturaLineItem,
  type FacturaStats,
  type CreateFacturaInput,
  type UpdateFacturaInput,
} from "./SaasFacturasService";
export {
  SaasWhiteLabelService,
  getSaasWhiteLabelService,
  resetSaasWhiteLabelServiceForTests,
  saasWhiteLabelService,
  type WhiteLabelConfig,
  type StripeConnectStatus,
  type StripeConnectStatusResult,
} from "./SaasWhiteLabelService";
export {
  SaasSubcuentasService,
  getSaasSubcuentasService,
  resetSaasSubcuentasServiceForTests,
  type Subcuenta,
  type SubcuentaStatus,
  type SubcuentaPlan,
  type SubcuentaUsage,
  type CreateSubcuentaInput,
} from "./SaasSubcuentasService";
export {
  SaasCountdownService,
  getSaasCountdownService,
  resetSaasCountdownServiceForTests,
  type CountdownTimer,
  type CountdownType,
  type CountdownAction,
  type CreateCountdownInput,
} from "./SaasCountdownService";
export {
  SaasCustomObjectsService,
  getSaasCustomObjectsService,
  resetSaasCustomObjectsServiceForTests,
  type CustomObject,
  type CustomObjectField,
  type CustomObjectRecord,
  type CreateCustomObjectInput,
} from "./SaasCustomObjectsService";
export {
  SaasAuditService,
  getSaasAuditService,
  resetSaasAuditServiceForTests,
  type AuditLog,
  type LogAuditInput,
  type AuditFilters,
  type AuditModuleStats,
} from "./SaasAuditService";
export {
  SaasCommunitiesService,
  getSaasCommunitiesService,
  resetSaasCommunitiesServiceForTests,
  type Community,
  type CommunityPost,
  type CreateCommunityInput,
  type CreatePostInput,
} from "./SaasCommunitiesService";
export {
  SaasDocumentsService,
  getSaasDocumentsService,
  resetSaasDocumentsServiceForTests,
  type Document as SaasDocument,
  type DocumentType,
  type DocumentStatus,
  type Product,
  type ProductType,
  type CreateDocumentInput,
  type CreateProductInput,
} from "./SaasDocumentsService";
export {
  SaasSurveysService,
  getSaasSurveysService,
  resetSaasSurveysServiceForTests,
  type Survey,
  type SurveyType,
  type SurveyQuestion,
  type SurveyResponse,
  type QrCode,
  type CreateSurveyInput,
  type SubmitResponseInput,
  type CreateQrInput,
  type SurveyStats,
} from "./SaasSurveysService";
export {
  SaasWhatsAppService,
  getSaasWhatsAppService,
  resetSaasWhatsAppServiceForTests,
  SaasWhatsAppError,
  type WhatsAppSendInput,
  type WhatsAppMessage,
  type WhatsAppConfig,
} from "./SaasWhatsAppService";
export {
  SaasWhatsAppCloudService,
  getSaasWhatsAppCloudService,
  resetSaasWhatsAppCloudServiceForTests,
  SaasWhatsAppCloudError,
  isMetaWaConfigured,
  getMetaVerifyToken,
  type CloudWaConfig,
  type CloudWaSendInput,
  type CloudWaMessage,
  type InboundWaMessage,
} from "./SaasWhatsAppCloudService";
export {
  SaasFunnelService,
  getSaasFunnelService,
  resetSaasFunnelServiceForTests,
  SaasFunnelError,
  type Funnel,
  type FunnelStep,
  type FunnelStatus,
  type FunnelStepType,
  type CreateFunnelInput,
  type UpdateFunnelInput,
  type CreateFunnelStepInput,
  type UpdateFunnelStepInput,
} from "./SaasFunnelService";
export {
  SaasWebBuilderService,
  getSaasWebBuilderService,
  resetSaasWebBuilderServiceForTests,
  SaasWebBuilderError,
  type WebPage,
  type WebPageType,
  type WebPageStatus,
  type PageSection,
  type CreatePageInput,
  type UpdatePageInput,
} from "./SaasWebBuilderService";
export {
  SaasLmsService,
  SaasLmsError,
  getSaasLmsService,
  resetSaasLmsServiceForTests,
  type LmsCourse,
  type LmsEnrollment,
  type LmsCertificate,
  type CourseStatus,
  type CreateCourseInput,
  type EnrollInput,
} from "./SaasLmsService";
export {
  SaasKlaviyoService,
  SaasKlaviyoError,
  getSaasKlaviyoService,
  resetSaasKlaviyoServiceForTests,
  type KlaviyoProfile,
  type KlaviyoList,
  type KlaviyoCampaign,
} from "./SaasKlaviyoService";

export {
  SaasHelpdeskService,
  SaasHelpdeskError,
  getSaasHelpdeskService,
  resetSaasHelpdeskServiceForTests,
  type HelpdeskTicket,
  type HelpdeskMessage,
  type TicketStatus,
  type TicketPriority,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "./SaasHelpdeskService";

export {
  SaasDialerService,
  getSaasDialerService,
  resetSaasDialerServiceForTests,
  SaasDialerError,
  type DialerConfig,
  type CallRecord,
  type InitiateCallInput,
} from "./SaasDialerService";
