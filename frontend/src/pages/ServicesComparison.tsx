import { useState } from "react";
import SaasLayout from "@/components/SaasLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Crown, Star, CheckCircle2, XCircle, Minus,
  Sparkles, Globe, ChevronDown, Search, Filter,
} from "lucide-react";
import { useI18n, localeNames, localeFlags, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ServiceLevel = "premium" | "advanced" | "basic" | "limited" | "none";

interface ServiceRow {
  categoryKey: string;
  nelvyon: { level: ServiceLevel; score: number; detail: string };
  gohighlevel: { level: ServiceLevel; score: number; detail: string };
  hubspot: { level: ServiceLevel; score: number; detail: string };
  salesforce: { level: ServiceLevel; score: number; detail: string };
  activecampaign: { level: ServiceLevel; score: number; detail: string };
  keap: { level: ServiceLevel; score: number; detail: string };
  zoho: { level: ServiceLevel; score: number; detail: string };
  pipedrive: { level: ServiceLevel; score: number; detail: string };
  clickfunnels: { level: ServiceLevel; score: number; detail: string };
  kajabi: { level: ServiceLevel; score: number; detail: string };
}

type PlatformKey = "nelvyon" | "gohighlevel" | "hubspot" | "salesforce" | "activecampaign" | "keap" | "zoho" | "pipedrive" | "clickfunnels" | "kajabi";

const platformInfo: Record<PlatformKey, { name: string; emoji: string; price: string; color: string }> = {
  nelvyon: { name: "Nelvyon", emoji: "🚀", price: "$97-$297", color: "from-violet-600 to-indigo-500" },
  gohighlevel: { name: "GoHighLevel", emoji: "🔵", price: "$97-$497", color: "from-blue-600 to-blue-400" },
  hubspot: { name: "HubSpot", emoji: "🟠", price: "$800-$3,600", color: "from-orange-500 to-amber-400" },
  salesforce: { name: "Salesforce", emoji: "☁️", price: "$1,250-$5,000", color: "from-sky-500 to-blue-400" },
  activecampaign: { name: "ActiveCampaign", emoji: "🔷", price: "$49-$259", color: "from-blue-500 to-indigo-400" },
  keap: { name: "Keap", emoji: "🟢", price: "$159-$299", color: "from-green-500 to-emerald-400" },
  zoho: { name: "Zoho CRM", emoji: "🔴", price: "$14-$52", color: "from-red-500 to-rose-400" },
  pipedrive: { name: "Pipedrive", emoji: "🟣", price: "$14-$99", color: "from-purple-500 to-violet-400" },
  clickfunnels: { name: "ClickFunnels", emoji: "🟡", price: "$147-$297", color: "from-yellow-500 to-amber-400" },
  kajabi: { name: "Kajabi", emoji: "🟤", price: "$149-$399", color: "from-amber-700 to-amber-500" },
};

const platformKeys: PlatformKey[] = ["nelvyon", "gohighlevel", "hubspot", "salesforce", "activecampaign", "keap", "zoho", "pipedrive", "clickfunnels", "kajabi"];

const sectionGroups: { label: string; keys: string[] }[] = [
  { label: "🏢 CRM & Ventas", keys: ["catCRM", "catPipeline", "catProposals", "catContracts"] },
  { label: "💬 Comunicación", keys: ["catEmail", "catSMS", "catWhatsApp", "catVoIP", "catLiveChat"] },
  { label: "🔄 Automatización", keys: ["catWorkflows", "catAutomation"] },
  { label: "🚀 Marketing", keys: ["catFunnels", "catLandingPages", "catForms", "catSurveys", "catSocialMedia", "catAdsTracking", "catBlogging", "catSEO"] },
  { label: "📅 Agenda", keys: ["catCalendar", "catBooking"] },
  { label: "💳 Comercio", keys: ["catPayments", "catSubscriptions", "catInvoicing", "catEcommerce", "catAffiliates"] },
  { label: "📚 Educación", keys: ["catCourses", "catMembership", "catCommunity"] },
  { label: "⭐ Reputación", keys: ["catReputation", "catReviews"] },
  { label: "🎧 Soporte", keys: ["catHelpdesk", "catKnowledgeBase"] },
  { label: "📊 Analytics", keys: ["catAnalytics", "catBI", "catReporting"] },
  { label: "🤖 Nelvyon", keys: ["catAIScoring", "catAIChatbot", "catAIContent", "catAITranscription"] },
  { label: "🏷️ Plataforma", keys: ["catWhiteLabel", "catSubAccounts", "catAPI", "catMarketplace", "catSecurity", "catWebsite", "catMobileApp", "catIntegrations"] },
];

function s(level: ServiceLevel, score: number, detail: string) {
  return { level, score, detail };
}

const servicesData: ServiceRow[] = [
  // CRM & Ventas
  { categoryKey: "catCRM", nelvyon: s("premium", 98, "Nelvyon scoring + segmentación dinámica"), gohighlevel: s("advanced", 85, "Tags + campos custom"), hubspot: s("premium", 95, "CRM líder del mercado"), salesforce: s("premium", 98, "CRM enterprise #1"), activecampaign: s("basic", 78, "CRM básico"), keap: s("advanced", 80, "CRM + automation"), zoho: s("advanced", 88, "CRM completo"), pipedrive: s("advanced", 85, "CRM enfocado ventas"), clickfunnels: s("limited", 40, "Contactos básicos"), kajabi: s("limited", 35, "Lista de contactos") },
  { categoryKey: "catPipeline", nelvyon: s("premium", 96, "Multi-pipeline + Nelvyon predictiva"), gohighlevel: s("advanced", 90, "Pipeline Kanban"), hubspot: s("premium", 92, "Pipeline avanzado"), salesforce: s("premium", 95, "Pipeline enterprise"), activecampaign: s("basic", 70, "Pipeline básico"), keap: s("advanced", 78, "Pipeline con automation"), zoho: s("advanced", 82, "Pipeline visual"), pipedrive: s("premium", 92, "Pipeline líder"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catProposals", nelvyon: s("premium", 94, "Propuestas + firma digital"), gohighlevel: s("basic", 60, "Propuestas básicas"), hubspot: s("advanced", 85, "Quotes avanzados"), salesforce: s("advanced", 88, "CPQ completo"), activecampaign: s("none", 0, "No disponible"), keap: s("basic", 55, "Quotes básicos"), zoho: s("advanced", 78, "Quotes integrados"), pipedrive: s("basic", 65, "Smart Docs"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catContracts", nelvyon: s("premium", 93, "Contratos + e-signature"), gohighlevel: s("basic", 50, "Básico"), hubspot: s("basic", 60, "Integración DocuSign"), salesforce: s("advanced", 80, "CLM avanzado"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 55, "Zoho Sign"), pipedrive: s("basic", 50, "Smart Docs"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Comunicación
  { categoryKey: "catEmail", nelvyon: s("premium", 97, "Masivo + secuencias + N"), gohighlevel: s("advanced", 88, "Email con templates"), hubspot: s("premium", 95, "Email marketing líder"), salesforce: s("advanced", 85, "Marketing Cloud"), activecampaign: s("premium", 95, "Email automation líder"), keap: s("advanced", 82, "Email + automation"), zoho: s("advanced", 80, "Zoho Campaigns"), pipedrive: s("basic", 65, "Email básico"), clickfunnels: s("basic", 60, "Email follow-up"), kajabi: s("advanced", 78, "Email marketing") },
  { categoryKey: "catSMS", nelvyon: s("premium", 95, "SMS bidireccional + MMS"), gohighlevel: s("premium", 92, "SMS bidireccional"), hubspot: s("basic", 60, "SMS limitado"), salesforce: s("basic", 55, "SMS vía integración"), activecampaign: s("advanced", 80, "SMS marketing"), keap: s("basic", 65, "SMS básico"), zoho: s("basic", 50, "SMS vía integración"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catWhatsApp", nelvyon: s("premium", 97, "API oficial + chatbot Nelvyon"), gohighlevel: s("advanced", 85, "WhatsApp integrado"), hubspot: s("basic", 55, "WhatsApp limitado"), salesforce: s("basic", 50, "Vía integración"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 45, "Integración básica"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catVoIP", nelvyon: s("premium", 93, "VoIP + grabación + transcripción Nelvyon"), gohighlevel: s("advanced", 88, "Twilio + grabación"), hubspot: s("advanced", 78, "Calling integrado"), salesforce: s("advanced", 82, "CTI + Dialer"), activecampaign: s("none", 0, "No disponible"), keap: s("basic", 50, "Integración básica"), zoho: s("basic", 55, "Zoho Voice"), pipedrive: s("basic", 60, "Calling add-on"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catLiveChat", nelvyon: s("premium", 95, "Widget + chatbot Nelvyon + co-browsing"), gohighlevel: s("advanced", 82, "Chat widget"), hubspot: s("advanced", 85, "Live chat avanzado"), salesforce: s("advanced", 80, "Service Cloud chat"), activecampaign: s("basic", 55, "Chat básico"), keap: s("none", 0, "No disponible"), zoho: s("advanced", 75, "Zoho SalesIQ"), pipedrive: s("basic", 45, "Chatbot básico"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Automatización
  { categoryKey: "catWorkflows", nelvyon: s("premium", 95, "Visual builder + 80+ triggers"), gohighlevel: s("premium", 92, "Workflow builder visual"), hubspot: s("advanced", 88, "Workflows avanzados"), salesforce: s("premium", 92, "Flow Builder"), activecampaign: s("premium", 92, "Automation líder"), keap: s("advanced", 85, "Campaign Builder"), zoho: s("advanced", 78, "Blueprint + workflows"), pipedrive: s("basic", 70, "Automation básica"), clickfunnels: s("basic", 55, "Follow-up funnels"), kajabi: s("basic", 60, "Automations básicas") },
  { categoryKey: "catAutomation", nelvyon: s("premium", 96, "100+ acciones + custom code"), gohighlevel: s("advanced", 88, "60+ acciones"), hubspot: s("advanced", 85, "Automation avanzada"), salesforce: s("premium", 90, "Process automation"), activecampaign: s("premium", 92, "Automation avanzada"), keap: s("advanced", 82, "Automation completa"), zoho: s("advanced", 75, "Automation integrada"), pipedrive: s("basic", 68, "Automation básica"), clickfunnels: s("basic", 50, "Automation limitada"), kajabi: s("basic", 55, "Automation básica") },
  // Marketing
  { categoryKey: "catFunnels", nelvyon: s("premium", 94, "Editor visual + A/B + N"), gohighlevel: s("premium", 92, "Funnel builder completo"), hubspot: s("basic", 60, "Landing pages"), salesforce: s("none", 0, "No nativo"), activecampaign: s("basic", 50, "Landing pages básicas"), keap: s("basic", 55, "Landing pages"), zoho: s("basic", 45, "PageSense básico"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("premium", 95, "Funnel builder líder"), kajabi: s("advanced", 80, "Funnel builder") },
  { categoryKey: "catLandingPages", nelvyon: s("premium", 95, "500+ templates + CDN global"), gohighlevel: s("advanced", 88, "Builder con templates"), hubspot: s("advanced", 82, "Landing pages"), salesforce: s("basic", 40, "Pardot pages"), activecampaign: s("basic", 60, "Landing pages"), keap: s("basic", 55, "Landing pages"), zoho: s("basic", 50, "Landing pages"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("premium", 92, "Pages optimizadas"), kajabi: s("advanced", 82, "Pages con templates") },
  { categoryKey: "catForms", nelvyon: s("premium", 95, "15 tipos + lógica condicional"), gohighlevel: s("advanced", 85, "Form builder"), hubspot: s("premium", 90, "Forms avanzados"), salesforce: s("advanced", 75, "Web-to-Lead"), activecampaign: s("advanced", 82, "Forms integrados"), keap: s("advanced", 78, "Forms + tags"), zoho: s("advanced", 78, "Zoho Forms"), pipedrive: s("basic", 65, "Web Forms"), clickfunnels: s("basic", 60, "Forms en funnels"), kajabi: s("basic", 55, "Forms básicos") },
  { categoryKey: "catSurveys", nelvyon: s("premium", 94, "Tipo Typeform + quiz + scoring"), gohighlevel: s("basic", 70, "Surveys básicas"), hubspot: s("advanced", 78, "Feedback surveys"), salesforce: s("basic", 55, "Surveys limitadas"), activecampaign: s("basic", 50, "Surveys básicas"), keap: s("none", 0, "No disponible"), zoho: s("advanced", 75, "Zoho Survey"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("basic", 45, "Survey funnels"), kajabi: s("basic", 40, "Quizzes básicos") },
  { categoryKey: "catSocialMedia", nelvyon: s("premium", 94, "Multi-plataforma + Nelvyon + calendario"), gohighlevel: s("basic", 65, "Social planner limitado"), hubspot: s("advanced", 85, "Social media completo"), salesforce: s("basic", 55, "Social Studio"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("advanced", 78, "Zoho Social"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catAdsTracking", nelvyon: s("premium", 95, "Multi-touch attribution + N"), gohighlevel: s("basic", 72, "Pixel + tracking básico"), hubspot: s("advanced", 85, "Ads management"), salesforce: s("advanced", 82, "Advertising Studio"), activecampaign: s("basic", 50, "Tracking básico"), keap: s("none", 0, "No disponible"), zoho: s("basic", 55, "Ads básico"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("basic", 45, "Pixel tracking"), kajabi: s("basic", 40, "Tracking básico") },
  { categoryKey: "catBlogging", nelvyon: s("premium", 92, "Blog + CMS + SEO integrado"), gohighlevel: s("basic", 60, "Blog básico"), hubspot: s("premium", 92, "CMS Hub completo"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 40, "Blog básico"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("basic", 55, "Blog pages"), kajabi: s("advanced", 78, "Blog integrado") },
  { categoryKey: "catSEO", nelvyon: s("premium", 93, "SEO tools + meta + sitemap"), gohighlevel: s("basic", 55, "SEO básico"), hubspot: s("premium", 90, "SEO tools avanzados"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 40, "SEO básico"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("basic", 50, "SEO básico"), kajabi: s("basic", 60, "SEO básico") },
  // Agenda
  { categoryKey: "catCalendar", nelvyon: s("premium", 94, "Multi-calendario + sync + Nelvyon"), gohighlevel: s("advanced", 88, "Calendar integrado"), hubspot: s("advanced", 85, "Meeting scheduler"), salesforce: s("advanced", 80, "Calendar integrado"), activecampaign: s("basic", 55, "Calendar básico"), keap: s("advanced", 72, "Calendar + booking"), zoho: s("advanced", 75, "Zoho Calendar"), pipedrive: s("basic", 65, "Scheduler"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catBooking", nelvyon: s("premium", 95, "Booking + recordatorios + pagos"), gohighlevel: s("advanced", 88, "Booking calendar"), hubspot: s("advanced", 82, "Meeting links"), salesforce: s("basic", 60, "Vía integración"), activecampaign: s("basic", 50, "Scheduling básico"), keap: s("advanced", 75, "Appointment booking"), zoho: s("advanced", 72, "Zoho Bookings"), pipedrive: s("basic", 60, "Scheduler"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Comercio
  { categoryKey: "catPayments", nelvyon: s("premium", 95, "Stripe + PayPal + multi-gateway"), gohighlevel: s("advanced", 82, "Stripe + Authorize.net"), hubspot: s("advanced", 78, "Payments integrados"), salesforce: s("advanced", 75, "Commerce Cloud"), activecampaign: s("basic", 50, "Integración Stripe"), keap: s("advanced", 78, "Pagos integrados"), zoho: s("basic", 55, "Zoho Payments"), pipedrive: s("basic", 50, "Integración básica"), clickfunnels: s("advanced", 85, "Pagos en funnels"), kajabi: s("advanced", 82, "Pagos integrados") },
  { categoryKey: "catSubscriptions", nelvyon: s("premium", 95, "Planes + trials + upgrades + métricas"), gohighlevel: s("basic", 72, "Suscripciones básicas"), hubspot: s("advanced", 78, "Recurring revenue"), salesforce: s("advanced", 80, "Subscription management"), activecampaign: s("basic", 45, "Integración básica"), keap: s("advanced", 75, "Suscripciones"), zoho: s("basic", 50, "Zoho Subscriptions"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("advanced", 78, "Suscripciones"), kajabi: s("advanced", 85, "Suscripciones + cursos") },
  { categoryKey: "catInvoicing", nelvyon: s("premium", 94, "Facturas auto + impuestos + multi-moneda"), gohighlevel: s("basic", 60, "Invoicing básico"), hubspot: s("advanced", 78, "Invoicing"), salesforce: s("advanced", 82, "Billing"), activecampaign: s("none", 0, "No disponible"), keap: s("advanced", 75, "Invoicing"), zoho: s("advanced", 82, "Zoho Invoice"), pipedrive: s("basic", 50, "Integración"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catEcommerce", nelvyon: s("premium", 93, "Tienda + catálogo + carrito"), gohighlevel: s("basic", 55, "E-commerce básico"), hubspot: s("basic", 50, "Commerce Hub"), salesforce: s("premium", 90, "Commerce Cloud"), activecampaign: s("basic", 40, "Integración Shopify"), keap: s("basic", 55, "E-commerce básico"), zoho: s("basic", 45, "Zoho Commerce"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("advanced", 80, "E-commerce funnels"), kajabi: s("advanced", 78, "Digital products") },
  { categoryKey: "catAffiliates", nelvyon: s("premium", 92, "Programa completo + tracking + pagos"), gohighlevel: s("basic", 55, "Affiliate básico"), hubspot: s("none", 0, "No disponible"), salesforce: s("basic", 40, "Partner portal"), activecampaign: s("none", 0, "No disponible"), keap: s("basic", 50, "Referral partner"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("advanced", 85, "Affiliate center"), kajabi: s("advanced", 80, "Affiliate program") },
  // Educación
  { categoryKey: "catCourses", nelvyon: s("premium", 93, "LMS completo + quizzes + certificados"), gohighlevel: s("basic", 72, "Membership sites"), hubspot: s("none", 0, "No disponible"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("basic", 55, "Membership básico"), kajabi: s("premium", 95, "LMS líder") },
  { categoryKey: "catMembership", nelvyon: s("premium", 92, "Portal + niveles + drip content"), gohighlevel: s("advanced", 80, "Membership areas"), hubspot: s("none", 0, "No disponible"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("basic", 45, "Membership básico"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("advanced", 75, "Membership funnels"), kajabi: s("premium", 92, "Membership avanzado") },
  { categoryKey: "catCommunity", nelvyon: s("premium", 90, "Foro + grupos + chat"), gohighlevel: s("basic", 65, "Communities (nuevo)"), hubspot: s("none", 0, "No disponible"), salesforce: s("basic", 50, "Experience Cloud"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("advanced", 82, "Community integrada") },
  // Reputación
  { categoryKey: "catReputation", nelvyon: s("premium", 96, "Multi-plataforma + sentimiento Nelvyon"), gohighlevel: s("advanced", 88, "Reputation management"), hubspot: s("none", 0, "No disponible"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catReviews", nelvyon: s("premium", 95, "Google + Facebook + auto-solicitud"), gohighlevel: s("advanced", 88, "Review requests"), hubspot: s("basic", 50, "Feedback básico"), salesforce: s("none", 0, "No disponible"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Soporte
  { categoryKey: "catHelpdesk", nelvyon: s("premium", 95, "Tickets + SLA + asignación auto"), gohighlevel: s("none", 0, "No disponible nativo"), hubspot: s("premium", 90, "Service Hub"), salesforce: s("premium", 92, "Service Cloud"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("advanced", 82, "Zoho Desk"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catKnowledgeBase", nelvyon: s("premium", 93, "KB + búsqueda + analytics"), gohighlevel: s("none", 0, "No disponible"), hubspot: s("advanced", 85, "Knowledge Base"), salesforce: s("advanced", 88, "Knowledge articles"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("advanced", 78, "Zoho Desk KB"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Analytics
  { categoryKey: "catAnalytics", nelvyon: s("premium", 97, "Dashboards BI + drill-down"), gohighlevel: s("basic", 72, "Dashboard fijo"), hubspot: s("premium", 92, "Analytics avanzados"), salesforce: s("premium", 95, "Einstein Analytics"), activecampaign: s("advanced", 75, "Reporting"), keap: s("basic", 65, "Reportes básicos"), zoho: s("advanced", 80, "Zoho Analytics"), pipedrive: s("advanced", 72, "Insights"), clickfunnels: s("basic", 55, "Funnel stats"), kajabi: s("basic", 60, "Analytics básicos") },
  { categoryKey: "catBI", nelvyon: s("premium", 96, "Custom dashboards + alertas Nelvyon"), gohighlevel: s("none", 0, "No disponible"), hubspot: s("advanced", 85, "Custom reports"), salesforce: s("premium", 95, "Tableau CRM"), activecampaign: s("basic", 50, "Reportes"), keap: s("basic", 45, "Reportes básicos"), zoho: s("advanced", 78, "Zoho Analytics"), pipedrive: s("basic", 55, "Insights"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catReporting", nelvyon: s("premium", 95, "Reportes custom + export + scheduling"), gohighlevel: s("basic", 65, "Reportes predefinidos"), hubspot: s("advanced", 88, "Custom reporting"), salesforce: s("premium", 95, "Report builder"), activecampaign: s("advanced", 75, "Custom reports"), keap: s("basic", 60, "Reportes"), zoho: s("advanced", 80, "Report builder"), pipedrive: s("advanced", 72, "Custom fields reports"), clickfunnels: s("basic", 45, "Stats básicos"), kajabi: s("basic", 50, "Reportes básicos") },
  // Nelvyon
  { categoryKey: "catAIScoring", nelvyon: s("premium", 97, "ML predictivo + scoring auto"), gohighlevel: s("none", 0, "No disponible nativo"), hubspot: s("advanced", 80, "Predictive scoring"), salesforce: s("premium", 90, "Einstein Lead Scoring"), activecampaign: s("basic", 55, "Win probability"), keap: s("none", 0, "No disponible"), zoho: s("basic", 55, "Zia scoring"), pipedrive: s("basic", 50, "AI sales assistant"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catAIChatbot", nelvyon: s("premium", 95, "Chatbot conversacional + NLP"), gohighlevel: s("basic", 60, "Bot con flujos"), hubspot: s("advanced", 78, "Chatbot builder"), salesforce: s("advanced", 82, "Einstein Bots"), activecampaign: s("basic", 45, "Chatbot básico"), keap: s("none", 0, "No disponible"), zoho: s("basic", 55, "Zia chatbot"), pipedrive: s("basic", 40, "Chatbot básico"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catAIContent", nelvyon: s("premium", 96, "Emails + posts + landing pages Nelvyon"), gohighlevel: s("basic", 55, "Nelvyon básica"), hubspot: s("advanced", 82, "Content assistant"), salesforce: s("advanced", 78, "Einstein GPT"), activecampaign: s("basic", 50, "AI content"), keap: s("none", 0, "No disponible"), zoho: s("basic", 45, "Zia writer"), pipedrive: s("basic", 40, "AI email writer"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("basic", 45, "AI básico") },
  { categoryKey: "catAITranscription", nelvyon: s("premium", 94, "Transcripción + resumen + action items"), gohighlevel: s("none", 0, "No disponible"), hubspot: s("basic", 55, "Conversation intelligence"), salesforce: s("advanced", 78, "Einstein conversation"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("none", 0, "No disponible"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  // Plataforma
  { categoryKey: "catWhiteLabel", nelvyon: s("premium", 98, "Branding total + dominio + app"), gohighlevel: s("premium", 95, "White-label SaaS mode"), hubspot: s("none", 0, "No disponible"), salesforce: s("basic", 40, "Limitado"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 35, "Limitado"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catSubAccounts", nelvyon: s("premium", 96, "Ilimitadas + permisos granulares"), gohighlevel: s("premium", 92, "Sub-accounts"), hubspot: s("basic", 50, "Business units"), salesforce: s("advanced", 75, "Multi-org"), activecampaign: s("none", 0, "No disponible"), keap: s("none", 0, "No disponible"), zoho: s("basic", 40, "Multi-org"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("none", 0, "No disponible"), kajabi: s("none", 0, "No disponible") },
  { categoryKey: "catAPI", nelvyon: s("premium", 96, "REST + GraphQL + webhooks + SDKs"), gohighlevel: s("advanced", 80, "REST API"), hubspot: s("premium", 95, "API completa"), salesforce: s("premium", 98, "API enterprise"), activecampaign: s("advanced", 82, "REST API"), keap: s("advanced", 78, "REST API"), zoho: s("advanced", 85, "API completa"), pipedrive: s("advanced", 82, "REST API"), clickfunnels: s("basic", 55, "API limitada"), kajabi: s("basic", 50, "API limitada") },
  { categoryKey: "catMarketplace", nelvyon: s("premium", 93, "Templates + snapshots + apps"), gohighlevel: s("advanced", 88, "Snapshots marketplace"), hubspot: s("premium", 92, "App Marketplace"), salesforce: s("premium", 95, "AppExchange"), activecampaign: s("basic", 55, "Marketplace básico"), keap: s("basic", 50, "Marketplace"), zoho: s("advanced", 78, "Zoho Marketplace"), pipedrive: s("advanced", 75, "Marketplace"), clickfunnels: s("basic", 55, "Template market"), kajabi: s("basic", 45, "Templates") },
  { categoryKey: "catSecurity", nelvyon: s("premium", 97, "2FA + SSO + audit log + RBAC"), gohighlevel: s("basic", 72, "2FA básico"), hubspot: s("premium", 92, "SSO + 2FA + audit"), salesforce: s("premium", 98, "Enterprise security"), activecampaign: s("advanced", 80, "2FA + SSO"), keap: s("basic", 65, "2FA"), zoho: s("advanced", 82, "2FA + SSO"), pipedrive: s("advanced", 78, "2FA + SSO"), clickfunnels: s("basic", 55, "2FA"), kajabi: s("basic", 55, "2FA") },
  { categoryKey: "catWebsite", nelvyon: s("premium", 94, "Website builder + templates + hosting"), gohighlevel: s("advanced", 82, "Website builder"), hubspot: s("premium", 90, "CMS Hub"), salesforce: s("basic", 35, "Experience Cloud"), activecampaign: s("basic", 45, "Landing pages"), keap: s("basic", 50, "Landing pages"), zoho: s("basic", 45, "Zoho Sites"), pipedrive: s("none", 0, "No disponible"), clickfunnels: s("advanced", 82, "Website builder"), kajabi: s("advanced", 85, "Website builder") },
  { categoryKey: "catMobileApp", nelvyon: s("premium", 93, "App iOS + Android + white-label"), gohighlevel: s("advanced", 85, "Mobile app"), hubspot: s("advanced", 82, "Mobile app"), salesforce: s("advanced", 85, "Salesforce Mobile"), activecampaign: s("basic", 60, "Mobile app"), keap: s("basic", 55, "Mobile app"), zoho: s("advanced", 78, "Mobile apps"), pipedrive: s("advanced", 80, "Mobile app"), clickfunnels: s("basic", 45, "Mobile limitado"), kajabi: s("advanced", 78, "Mobile app") },
  { categoryKey: "catIntegrations", nelvyon: s("premium", 95, "500+ integraciones + Zapier + Make"), gohighlevel: s("advanced", 82, "Integraciones + Zapier"), hubspot: s("premium", 95, "1000+ integraciones"), salesforce: s("premium", 98, "Miles de integraciones"), activecampaign: s("advanced", 85, "900+ integraciones"), keap: s("advanced", 78, "Integraciones + Zapier"), zoho: s("advanced", 82, "Zoho ecosystem"), pipedrive: s("advanced", 80, "300+ integraciones"), clickfunnels: s("basic", 60, "Integraciones limitadas"), kajabi: s("basic", 55, "Integraciones limitadas") },
];

function getLevelIcon(level: ServiceLevel) {
  switch (level) {
    case "premium": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "advanced": return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
    case "basic": return <Minus className="w-4 h-4 text-amber-400" />;
    case "limited": return <Minus className="w-4 h-4 text-orange-400" />;
    case "none": return <XCircle className="w-4 h-4 text-red-400/40" />;
  }
}

function getLevelBg(level: ServiceLevel) {
  switch (level) {
    case "premium": return "bg-emerald-500/10";
    case "advanced": return "bg-blue-500/10";
    case "basic": return "bg-amber-500/10";
    case "limited": return "bg-orange-500/10";
    case "none": return "bg-red-500/5";
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-blue-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getBarGradient(score: number) {
  if (score >= 90) return "from-emerald-500 to-emerald-400";
  if (score >= 75) return "from-blue-500 to-cyan-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

export default function ServicesComparison() {
  const { t, locale, setLocale } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPlatforms, setShowPlatforms] = useState<PlatformKey[]>(["nelvyon", "gohighlevel", "hubspot", "salesforce", "clickfunnels", "kajabi"]);

  const visiblePlatforms = platformKeys.filter((k) => showPlatforms.includes(k));

  const filteredGroups = sectionGroups
    .filter((g) => !selectedGroup || g.label === selectedGroup)
    .map((g) => ({
      ...g,
      keys: g.keys.filter((k) => {
        if (!searchQuery) return true;
        const label = t(k as never) || k;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
      }),
    }))
    .filter((g) => g.keys.length > 0);

  // Calculate totals
  const platformTotals: Record<PlatformKey, { total: number; count: number; services: number }> = {} as never;
  platformKeys.forEach((pk) => {
    let total = 0, count = 0, services = 0;
    servicesData.forEach((row) => {
      const data = row[pk];
      total += data.score;
      count++;
      if (data.level !== "none") services++;
    });
    platformTotals[pk] = { total, count, services };
  });

  const nelvyonWins = servicesData.filter((row) => {
    const nScore = row.nelvyon.score;
    return platformKeys.slice(1).every((pk) => nScore >= row[pk].score);
  }).length;

  return (
    <SaasLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("pageTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("pageSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-border/40 h-9 gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{localeFlags[locale]} {localeNames[locale]}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 max-h-80 overflow-y-auto">
                {(Object.keys(localeNames) as Locale[]).map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`cursor-pointer ${locale === loc ? "text-violet-400 bg-violet-500/10" : "text-zinc-300"}`}
                  >
                    <span className="mr-2">{localeFlags[loc]}</span> {localeNames[loc]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-sm px-4 py-1.5 hover:from-amber-500 hover:to-yellow-400">
              <Trophy className="w-4 h-4 mr-2" /> #1 Global
            </Badge>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t("overallScore"), value: `${Math.round(platformTotals.nelvyon.total / platformTotals.nelvyon.count)}%`, icon: Trophy, gradient: "from-amber-500 to-yellow-500" },
            { label: t("servicesIncluded"), value: `${platformTotals.nelvyon.services}/${servicesData.length}`, icon: Crown, gradient: "from-emerald-500 to-green-500" },
            { label: t("advantageVs"), value: `+${Math.round(platformTotals.nelvyon.total / platformTotals.nelvyon.count) - Math.round(platformTotals.gohighlevel.total / platformTotals.gohighlevel.count)}pts`, icon: Star, gradient: "from-indigo-500 to-purple-500" },
            { label: t("priceValue"), value: "10x", icon: Sparkles, gradient: "from-rose-500 to-pink-500" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border/40 group hover:border-indigo-500/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5.5 h-5.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Ranking Bar */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t("platforms")} Ranking</CardTitle>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 90+</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> 75-89</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 60-74</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 40-59</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 0-39</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {[...platformKeys].sort((a, b) => (platformTotals[b].total / platformTotals[b].count) - (platformTotals[a].total / platformTotals[a].count)).map((pk, i) => {
              const avg = Math.round(platformTotals[pk].total / platformTotals[pk].count);
              const info = platformInfo[pk];
              const isUs = pk === "nelvyon";
              return (
                <div key={pk} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isUs ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/5 border border-violet-500/30" : "bg-secondary/10 hover:bg-secondary/20"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black" : i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-black" : i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" : "bg-secondary/30 text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <span className="text-lg flex-shrink-0">{info.emoji}</span>
                  <div className="w-32 flex-shrink-0">
                    <p className={`text-xs font-semibold ${isUs ? "text-violet-400" : "text-foreground/90"}`}>{info.name}</p>
                    <p className="text-[10px] text-muted-foreground">{info.price}/mo</p>
                  </div>
                  <div className="flex-1 h-6 bg-secondary/20 rounded-lg overflow-hidden">
                    <div className={`h-full rounded-lg bg-gradient-to-r ${getBarGradient(avg)} flex items-center justify-end pr-2 transition-all duration-700`} style={{ width: `${avg}%` }}>
                      <span className="text-[10px] font-bold text-white">{avg}%</span>
                    </div>
                  </div>
                  <div className="w-16 text-right flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{platformTotals[pk].services}/{servicesData.length}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("filterByCategory") + "..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary/20 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-border/40 h-10 gap-2">
                <Filter className="w-3.5 h-3.5" /> {t("platforms")} ({showPlatforms.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 max-h-80 overflow-y-auto">
              {platformKeys.map((pk) => (
                <DropdownMenuItem
                  key={pk}
                  onClick={() => {
                    if (pk === "nelvyon") return;
                    setShowPlatforms((prev) => prev.includes(pk) ? prev.filter((p) => p !== pk) : [...prev, pk]);
                  }}
                  className={`cursor-pointer ${showPlatforms.includes(pk) ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {showPlatforms.includes(pk) ? <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> : <XCircle className="w-3.5 h-3.5 mr-2" />}
                  {platformInfo[pk].emoji} {platformInfo[pk].name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Section filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedGroup ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-secondary/20 text-muted-foreground border border-border/20 hover:border-border/40"}`}
          >
            {t("allServices")}
          </button>
          {sectionGroups.map((g) => (
            <button
              key={g.label}
              onClick={() => setSelectedGroup(selectedGroup === g.label ? null : g.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedGroup === g.label ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-secondary/20 text-muted-foreground border border-border/20 hover:border-border/40"}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Main Comparison Table */}
        {filteredGroups.map((group) => (
          <Card key={group.label} className="bg-card border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-3 text-muted-foreground font-semibold w-44 sticky left-0 bg-card z-10">{t("category")}</th>
                    {visiblePlatforms.map((pk) => (
                      <th key={pk} className="text-center py-3 px-2 text-muted-foreground font-semibold min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-base">{platformInfo[pk].emoji}</span>
                          <span className="text-[10px] leading-tight font-bold">{platformInfo[pk].name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.keys.map((catKey) => {
                    const row = servicesData.find((r) => r.categoryKey === catKey);
                    if (!row) return null;
                    const maxScore = Math.max(...visiblePlatforms.map((pk) => row[pk].score));
                    return (
                      <tr key={catKey} className="border-b border-border/10 hover:bg-secondary/10 transition-colors">
                        <td className="py-3 px-3 text-foreground/80 font-medium sticky left-0 bg-card z-10">
                          {t(catKey as never)}
                        </td>
                        {visiblePlatforms.map((pk) => {
                          const data = row[pk];
                          const isMax = data.score === maxScore && data.score > 0;
                          return (
                            <td key={pk} className="text-center py-3 px-2">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  {getLevelIcon(data.level)}
                                  <span className={`text-sm font-bold ${getScoreColor(data.score)} relative`}>
                                    {data.score > 0 ? `${data.score}%` : "—"}
                                    {isMax && <Crown className="w-2.5 h-2.5 text-amber-400 absolute -top-2.5 -right-2.5" />}
                                  </span>
                                </div>
                                <div className="w-16 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(data.score)}`} style={{ width: `${data.score}%` }} />
                                </div>
                                <span className="text-[9px] text-muted-foreground leading-tight max-w-[90px] truncate" title={data.detail}>{data.detail}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}

        {/* Final Verdict */}
        <Card className="bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-pink-500/10 border-2 border-violet-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("verdictTitle")}</h2>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div>
                <p className="text-4xl font-bold text-violet-400">{Math.round(platformTotals.nelvyon.total / platformTotals.nelvyon.count)}%</p>
                <p className="text-sm text-muted-foreground">Nelvyon</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">vs</div>
              <div>
                <p className="text-4xl font-bold text-blue-400">{Math.round(platformTotals.gohighlevel.total / platformTotals.gohighlevel.count)}%</p>
                <p className="text-sm text-muted-foreground">GoHighLevel</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">vs</div>
              <div>
                <p className="text-4xl font-bold text-orange-400">{Math.round(platformTotals.hubspot.total / platformTotals.hubspot.count)}%</p>
                <p className="text-sm text-muted-foreground">HubSpot</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {t("verdictText")}. <span className="text-emerald-400 font-bold">{nelvyonWins}/{servicesData.length}</span> {t("winsLabel").toLowerCase()},
              {" "}<span className="text-violet-400 font-bold">{platformTotals.nelvyon.services}/{servicesData.length}</span> {t("servicesIncluded").toLowerCase()}.
            </p>
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-base px-6 py-2 hover:from-amber-500 hover:to-yellow-400">
              <Crown className="w-5 h-5 mr-2" /> Nelvyon — {t("leader")} #1 SaaS
            </Badge>
          </CardContent>
        </Card>
      </div>
    </SaasLayout>
  );
}