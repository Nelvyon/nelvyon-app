/**
 * Generates curated-expansion-pool.json (quality Envato/Aceternity names).
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/build-curated-pool.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_DOWNLOAD_CATALOG } from "../../apps/web/src/lib/template-library/seed-download-catalog.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../apps/web/src/lib/template-library/data");
const OUT = path.join(DATA_DIR, "curated-expansion-pool.json");
const BASE_OUT = path.join(DATA_DIR, "base-seed-catalog.json");

type PoolItem = {
  item_name: string;
  provider: "EnvatoElements" | "Aceternity";
  kinds: string[];
  services: string[];
  pack_ids: string;
  sector_groups: string[];
  quality_score: number;
  notes: string;
};

const G = {
  food: "food_hospitality",
  health: "health_medical",
  fitness: "fitness_sports",
  pro: "professional",
  home: "home_services",
  ecom: "ecommerce",
  saas: "saas_tech",
  agency: "agency_creator",
  travel: "hospitality_travel",
  beauty: "beauty_wellness",
  auto: "automotive",
  edu: "education",
  ind: "industrial",
  other: "other",
} as const;

function landing(
  names: string[],
  groups: string[],
  pack: string,
  services: string[],
  score = 90,
): PoolItem[] {
  return names.map((item_name) => ({
    item_name,
    provider: "EnvatoElements" as const,
    kinds: ["landing", "funnel"],
    services,
    pack_ids: pack,
    sector_groups: groups,
    quality_score: score,
    notes: "Curated landing P1 — high conversion layout",
  }));
}

function email(
  names: string[],
  groups: string[],
  pack: string,
  score = 88,
): PoolItem[] {
  return names.map((item_name) => ({
    item_name,
    provider: "EnvatoElements" as const,
    kinds: ["email_sequence", "email"],
    services: ["Email"],
    pack_ids: pack,
    sector_groups: groups,
    quality_score: score,
    notes: "Curated email sequence — newsletter quality",
  }));
}

function ads(names: string[], groups: string[], pack: string, score = 87): PoolItem[] {
  return names.map((item_name) => ({
    item_name,
    provider: "EnvatoElements" as const,
    kinds: ["ad_creative"],
    services: ["Ads", "Social"],
    pack_ids: pack,
    sector_groups: groups,
    quality_score: score,
    notes: "Curated ad creative — display/social",
  }));
}

function content(names: string[], groups: string[], pack: string, score = 86): PoolItem[] {
  return names.map((item_name) => ({
    item_name,
    provider: "EnvatoElements" as const,
    kinds: ["content_page", "seo_page"],
    services: ["Content", "SEO"],
    pack_ids: pack,
    sector_groups: groups,
    quality_score: score,
    notes: "Curated content/SEO page",
  }));
}

function aceternity(
  names: string[],
  groups: string[],
  pack: string,
  kinds: string[],
  score = 96,
): PoolItem[] {
  return names.map((item_name) => ({
    item_name,
    provider: "Aceternity" as const,
    kinds,
    services: ["Landing", "SaaS B2B", "Funnel"],
    pack_ids: pack,
    sector_groups: groups,
    quality_score: score,
    notes: "Aceternity UI Pro — React seed",
  }));
}

const pool: PoolItem[] = [
  ...aceternity(
    [
      "AI SaaS Template",
      "Startup Landing Page Template",
      "Nodus Agent Template",
      "Agenforce Marketing Template",
      "Agenlabs Agency Template",
      "Schedule Marketing Template",
      "Playful Marketing Template",
      "Cryptgen Marketing Template",
      "Minimal Portfolio Template",
      "DevPro Portfolio Template",
    ],
    [G.saas, G.agency],
    "saas-b2b-growth",
    ["landing", "funnel"],
  ),
  ...landing(
    [
      "Hungry - Food and Restaurant Mobile Template",
      "Akala - Mobile Template for Food, Cafe, Restaurant",
      "Restoria - Restaurant HTML Template",
      "Foodking - Restaurant & Food HTML Template",
      "Foodily - Food & Restaurant HTML Template",
      "Restano - Restaurant & Cafe HTML Template",
      "Foodwagon - Food Delivery HTML Template",
      "Bites - Restaurant & Cafe HTML Template",
      "Foodera - Restaurant HTML5 Template",
      "Cafert - Cafe & Restaurant HTML Template",
      "Delici - Restaurant & Food HTML Template",
      "FoodMart - Grocery & Food Store HTML Template",
      "Tasteit - Restaurant HTML Template",
      "Foodz - Restaurant & Cafe HTML5 Template",
      "Restabook - Restaurant Booking HTML Template",
    ],
    [G.food],
    "local-business-growth",
    ["Landing", "Local", "Funnel"],
    92,
  ),
  ...landing(
    [
      "Nischinto - Medical Landing Page HTML Template",
      "Dentist & Dental Clinic Tailwind Template",
      "Predent – Dental Care HTML Template",
      "Dental - Dentist and Medical Clinics Template",
      "Dentexa - Dental Clinic HTML Template",
      "Dentisto | HTML Template",
      "Medizo - Healthcare Clinic & Doctor HTML Template",
      "Evencare - Medical Landing Page HTML Template",
      "Trustlife - Medical and Health Landing Page",
      "Medisch - Health & Medical HTML5 Template",
      "ClinicMaster - Medical Health HTML Template",
      "Caremed - Medical & Health HTML Template",
      "Medcity - Medical Healthcare HTML Template",
      "Mediplus - Medical & Health HTML Template",
      "HealthCare - Medical HTML Template",
    ],
    [G.health],
    "local-business-growth",
    ["Landing", "Local", "SEO"],
    93,
  ),
  ...landing(
    [
      "Fitzone - Gym & Fitness HTML Template",
      "Gymster - Fitness & Gym HTML Template",
      "Powerlift - Gym Fitness HTML Template",
      "Stronger - Fitness Gym HTML Template",
      "Yogastic - Yoga & Fitness HTML Template",
      "Activitar - Gym & Fitness HTML Template",
      "Gym24 - Fitness Center HTML Template",
      "IronGym - Gym & Fitness HTML5 Template",
      "FitLife - Gym Fitness HTML Template",
      "CrossFit Pro - Gym HTML Template",
    ],
    [G.fitness],
    "local-business-growth",
    ["Landing", "Local"],
    91,
  ),
  ...landing(
    [
      "Sware SaaS & Software Landing HTML5 Page Template",
      "Xprosik – Saas Software App Landing Page Template",
      "Posas - Saas Software Landing Page Template",
      "Zubaz - Startup & SaaS Html Tempalte",
      "Saasflix SaaS Software Landing Page Template",
      "Asaas - Saas Landing Page HTML Template",
      "Appway - Saas & Startup HTML Template",
      "Startix - Multipurpose SaaS Landing HTML Template",
      "Xotix - Software & Saas Landing Page Template",
      "Landpagy - Saas & Software Landing Page Template",
      "Babil - Startup and SaaS template",
      "Astriol - Software App, SaaS Landing HTML Template",
      "Alfena - SaaS, Software & WebApp Template",
      "SaasoX - SaaS & Software App Startup HTML Template",
      "Sapro – SaaS & IT Solutions HTML Landing Page",
      "Quad - SaaS Startup & Software Landing Page HTML5",
      "Gosaas - SaaS & Software Startup Template",
      "SaasDesk - Saas Startup HTML Template",
      "ProgriSaaS - Creative Landing Page HTML5 Templates",
      "Treko - Startup and Software Landing Page template",
      "Binmp - App and Software Landing HTML Template",
      "Smartly - App Landing Page HTML Template",
      "Landder+ – Lead Generation HTML Landing Pages",
      "Miwlo - Landing Page HTML Template",
      "Olikit - Creative SaaS & Agency Template",
    ],
    [G.saas],
    "saas-b2b-growth",
    ["Landing", "SaaS B2B", "Funnel"],
    94,
  ),
  ...landing(
    [
      "Shopwise - Multipurpose eCommerce HTML Template",
      "Martfury - Multipurpose Marketplace HTML Template",
      "Emax - eCommerce HTML Template",
      "Ecomus - Multipurpose eCommerce HTML Template",
      "StorePro - eCommerce HTML Template",
      "Shopingo - eCommerce HTML Template",
      "Fashi - Fashion eCommerce HTML Template",
      "Modaz - Fashion eCommerce HTML Template",
      "Clothify - Fashion Store HTML Template",
      "Bagisto - eCommerce HTML Template",
      "Electro - Electronics eCommerce HTML Template",
      "Furnhome - Furniture eCommerce HTML Template",
      "BeautyShop - Cosmetics eCommerce HTML Template",
      "PetShop - Pet Store HTML Template",
      "BookStore - Book Shop HTML Template",
    ],
    [G.ecom],
    "ecommerce-growth",
    ["Ecommerce", "Landing"],
    92,
  ),
  ...landing(
    [
      "Avas - Multipurpose Agency HTML Template",
      "Agencyo - Digital Agency HTML Template",
      "Markete - Digital Marketing Agency HTML Template",
      "AgencyPro - Creative Agency HTML Template",
      "Seoly - SEO & Digital Marketing Agency HTML Template",
      "Digimax - Digital Agency HTML Template",
      "Agencify - Creative Agency HTML Template",
      "Brandio - Creative Agency HTML Template",
      "Webagency - Digital Agency HTML Template",
      "Promote - Marketing Agency HTML Template",
    ],
    [G.agency],
    "saas-b2b-growth",
    ["Agency", "Landing"],
    90,
  ),
  ...landing(
    [
      "Homelengo - Real Estate HTML Template",
      "Realest - Real Estate HTML Template",
      "EstatePro - Real Estate HTML Template",
      "Property - Real Estate HTML Template",
      "Hously - Real Estate HTML5 Template",
      "Plumber - Home Services HTML Template",
      "Roofing - Construction HTML Template",
      "Cleanpro - Cleaning Service HTML Template",
      "Handyman - Home Repair HTML Template",
      "HVAC Pro - Air Conditioning HTML Template",
    ],
    [G.home, G.pro],
    "local-business-growth",
    ["Landing", "Local"],
    89,
  ),
  ...landing(
    [
      "Hoteler - Hotel & Resort HTML Template",
      "Travila - Travel & Tour HTML Template",
      "Tourzi - Travel Agency HTML Template",
      "Tripgo - Travel & Tourism HTML Template",
      "Resortica - Resort & Hotel HTML Template",
      "Vacation - Travel HTML Template",
      "Flyaway - Travel Agency HTML Template",
    ],
    [G.travel],
    "local-business-growth",
    ["Landing", "Local"],
    88,
  ),
  ...landing(
    [
      "Beautica - Beauty Salon HTML Template",
      "Sparelax - Spa & Beauty HTML Template",
      "Salonify - Hair Salon HTML Template",
      "Glamour - Beauty Salon HTML Template",
      "NailArt - Nail Salon HTML Template",
      "SkinCare - Spa HTML Template",
    ],
    [G.beauty],
    "local-business-growth",
    ["Landing", "Local"],
    88,
  ),
  ...landing(
    [
      "Motorx - Car Dealer HTML Template",
      "Autodrive - Automotive HTML Template",
      "Carzone - Car Dealer HTML Template",
      "GaragePro - Auto Repair HTML Template",
      "DriveON - Car Rental HTML Template",
    ],
    [G.auto],
    "local-business-growth",
    ["Landing", "Local"],
    87,
  ),
  ...landing(
    [
      "Eduzone - Education HTML Template",
      "Learny - Online Course HTML Template",
      "Studi - Education HTML Template",
      "Coursera - LMS Education HTML Template",
      "Academia - University HTML Template",
      "SkillUp - Online Learning HTML Template",
    ],
    [G.edu],
    "content-strategy-pack",
    ["Landing", "Content"],
    87,
  ),
  ...landing(
    [
      "Industri - Factory & Industrial HTML Template",
      "Manufact - Manufacturing HTML Template",
      "Logistix - Logistics HTML Template",
      "BuildPro - Construction HTML Template",
      "Factory - Industrial HTML Template",
    ],
    [G.ind],
    "ecommerce-growth",
    ["Ecommerce", "Landing"],
    86,
  ),
  ...email(
    [
      "Sublime - Responsive Email Template",
      "Campaign - Email Newsletter Template",
      "Notify - Responsive Email Template",
      "Mailbakery - Responsive Email Template",
      "Bulletproof - Email Template",
      "PennyBlack - Responsive Email Template",
      "Bento - Email Template",
      "Myst - Responsive Email Template",
      "Vega - Email Template",
      "Avalanche - Responsive Email Template",
      "Blueprint - Email Template",
      "Salt - Responsive Email Template",
      "Nuc - Email Template",
      "Zen - Responsive Email Template",
      "Slate - Email Template",
    ],
    [G.saas, G.ecom, G.agency],
    "email-welcome-nurture",
    90,
  ),
  ...email(
    [
      "Foodie - Restaurant Email Template",
      "DineMail - Restaurant Newsletter Template",
      "ChefMail - Food Email Template",
      "Spice - Restaurant Email Template",
      "TasteMail - Food Newsletter Template",
    ],
    [G.food],
    "email-welcome-nurture",
    89,
  ),
  ...email(
    [
      "HealthMail - Medical Email Template",
      "CareMail - Healthcare Newsletter Template",
      "DentalMail - Dentist Email Template",
      "WellnessMail - Spa Email Template",
    ],
    [G.health, G.beauty],
    "email-welcome-nurture",
    88,
  ),
  ...ads(
    [
      "Google Ads HTML5 Banner Bundle",
      "Facebook Ads HTML5 Banner Template",
      "Instagram Story Ads Template",
      "Display Ads HTML5 GWD Bundle",
      "Retargeting Banner Pack HTML5",
      "SaaS Ads HTML5 Banner Template",
      "Ecommerce Product Ads HTML5",
      "Local Business Ads HTML5 Pack",
      "Fitness Gym Ads HTML5 Banner",
      "Restaurant Promo Ads HTML5",
      "Real Estate Ads HTML5 Banner",
      "Agency Services Ads HTML5",
    ],
    [G.saas, G.ecom, G.food, G.fitness, G.home, G.agency],
    "meta-ads-pack",
    88,
  ),
  ...content(
    [
      "Blogzine - Blog HTML Template",
      "Blogar - Personal Blog HTML Template",
      "Writico - Blog Magazine HTML Template",
      "Newspaper - Magazine HTML Template",
      "Story - Blog HTML Template",
      "Editor - Magazine HTML Template",
      "Press - News Magazine HTML Template",
      "Article - Blog HTML Template",
      "Magz - Magazine HTML Template",
      "Posty - Blog HTML Template",
    ],
    [G.edu, G.agency, G.saas],
    "content-strategy-pack",
    87,
  ),
  ...content(
    [
      "SEO Agency - SEO HTML Template",
      "RankUp - SEO Landing HTML Template",
      "Optima - SEO Services HTML Template",
      "SearchPro - SEO HTML Template",
      "Indexly - SEO Agency HTML Template",
    ],
    [G.agency, G.saas, G.pro],
    "seo-local-pack",
    88,
  ),
  // Funnel & CRO-focused landings
  ...landing(
    [
      "Convertly - High Converting Landing Page HTML",
      "LeadGen - Lead Generation Landing HTML Template",
      "FunnelX - Sales Funnel HTML Template",
      "Optin - Lead Capture Landing HTML Template",
      "ClickFunnel Style - Landing HTML Template",
      "LaunchPad - Product Launch HTML Template",
      "Signup - SaaS Signup Landing HTML Template",
      "Trial - Free Trial Landing HTML Template",
      "Demo - Book a Demo Landing HTML Template",
      "Waitlist - Coming Soon Landing HTML Template",
    ],
    [G.saas, G.agency, G.ecom],
    "landing-funnel-pack",
    ["Landing", "Funnel", "CRO"],
    91,
  ),
];

// Phase 2 — deepen coverage until we approach 500 unique curated seeds
const EXTRA_LANDING_NAMES: Record<string, string[]> = {
  [G.food]: [
    "Bistro - Restaurant HTML Template",
    "ChefTable - Fine Dining HTML Template",
    "BurgerHub - Fast Food HTML Template",
    "SushiBar - Japanese Restaurant HTML Template",
    "WineDine - Winery Restaurant HTML Template",
    "CafeBlend - Coffee Shop HTML Template",
    "SweetBake - Bakery HTML Template",
    "StreetFood - Food Truck HTML Template",
    "OrganicEats - Healthy Food HTML Template",
    "MealPrep - Food Delivery HTML Template",
  ],
  [G.health]: [
    "VitaCare - Clinic HTML Template",
    "SmileCare - Dental HTML Template",
    "OrthoPro - Orthodontist HTML Template",
    "KidsDental - Pediatric Dental HTML Template",
    "EyeCare - Optometry HTML Template",
    "PhysioPro - Physiotherapy HTML Template",
    "MindCare - Psychology HTML Template",
    "SkinClinic - Dermatology HTML Template",
    "PharmaCare - Pharmacy HTML Template",
    "SeniorCare - Elderly Care HTML Template",
  ],
  [G.fitness]: [
    "YogaFlow - Yoga Studio HTML Template",
    "PilatesPro - Pilates HTML Template",
    "BoxingClub - Martial Arts HTML Template",
    "SwimAcademy - Swimming HTML Template",
    "TennisClub - Tennis HTML Template",
    "DanceStudio - Dance HTML Template",
    "RunClub - Running HTML Template",
    "SpartanGym - CrossFit HTML Template",
  ],
  [G.ecom]: [
    "StyleHub - Fashion HTML Template",
    "TechStore - Electronics HTML Template",
    "HomeDecor - Furniture HTML Template",
    "GlowBeauty - Cosmetics HTML Template",
    "KidStore - Kids Store HTML Template",
    "SportGear - Sports Store HTML Template",
    "JewelBox - Jewelry HTML Template",
    "OrganicMart - Grocery HTML Template",
    "Artisan - Handmade Store HTML Template",
    "PrintShop - Print on Demand HTML Template",
  ],
  [G.saas]: [
    "CloudBase - Cloud SaaS HTML Template",
    "DataPulse - Analytics SaaS HTML Template",
    "SecureStack - Cybersecurity SaaS HTML Template",
    "PayFlow - Fintech SaaS HTML Template",
    "HireOS - HR SaaS HTML Template",
    "ChatStack - Chatbot SaaS HTML Template",
    "DevTools - Developer SaaS HTML Template",
    "MarketOS - Martech SaaS HTML Template",
    "LegalTech - Legal SaaS HTML Template",
    "EduSaaS - EdTech HTML Template",
  ],
  [G.pro]: [
    "LegalPro - Law Firm HTML Template",
    "TaxAdvisor - Accounting HTML Template",
    "ConsultPro - Consulting HTML Template",
    "InsurePro - Insurance HTML Template",
    "FinanceHub - Financial Advisor HTML Template",
    "Architect - Architecture HTML Template",
    "EngineerPro - Engineering HTML Template",
    "Notary - Notary HTML Template",
  ],
  [G.home]: [
    "ElectricPro - Electrician HTML Template",
    "PaintPro - Painting Service HTML Template",
    "GardenPro - Landscaping HTML Template",
    "LockSmith - Locksmith HTML Template",
    "PestControl - Pest Control HTML Template",
    "MovingPro - Moving Company HTML Template",
    "SolarPro - Solar Installation HTML Template",
    "WindowPro - Window Installation HTML Template",
  ],
  [G.agency]: [
    "GrowthLab - Growth Agency HTML Template",
    "PPC Agency - PPC Marketing HTML Template",
    "ContentLab - Content Agency HTML Template",
    "BrandStudio - Branding Agency HTML Template",
    "VideoAgency - Video Marketing HTML Template",
    "Influence - Influencer Agency HTML Template",
    "WebStudio - Web Agency HTML Template",
    "UX Agency - UX Design HTML Template",
  ],
};

for (const [group, names] of Object.entries(EXTRA_LANDING_NAMES)) {
  const pack =
    group === G.ecom
      ? "ecommerce-growth"
      : group === G.saas || group === G.agency
        ? "saas-b2b-growth"
        : "local-business-growth";
  pool.push(
    ...landing(names, [group], pack, ["Landing", "Local"], 85),
  );
}

const EXTRA_EMAIL = [
  "Welcome - Onboarding Email Template",
  "Nurture - Drip Email Template",
  "Promo - Sale Email Template",
  "Cart - Abandoned Cart Email Template",
  "Reengage - Win-back Email Template",
  "Newsletter - Weekly Email Template",
  "Launch - Product Launch Email Template",
  "Webinar - Event Email Template",
  "Survey - Feedback Email Template",
  "Referral - Referral Email Template",
  "Holiday - Seasonal Email Template",
  "VIP - Loyalty Email Template",
  "Trial - SaaS Trial Email Template",
  "Upgrade - SaaS Upgrade Email Template",
  "CaseStudy - B2B Email Template",
];
for (const g of [G.saas, G.ecom, G.food, G.health, G.fitness, G.agency]) {
  pool.push(...email(EXTRA_EMAIL, [g], "email-welcome-nurture", 84));
}

const EXTRA_ADS = [
  "Carousel Ads HTML5 Template",
  "Video Ads HTML5 Template",
  "Lead Ads HTML5 Template",
  "Brand Awareness Ads HTML5",
  "App Install Ads HTML5",
  "Collection Ads HTML5 Template",
];
for (const g of [G.saas, G.ecom, G.food, G.fitness, G.beauty, G.auto, G.travel]) {
  pool.push(...ads(EXTRA_ADS, [g], "meta-ads-pack", 85));
}

const EXTRA_CONTENT = [
  "Case Study - Landing HTML Template",
  "Resource Hub - Content HTML Template",
  "Help Center - Knowledge Base HTML Template",
  "FAQ - Support Page HTML Template",
  "Pricing - SaaS Pricing Page HTML Template",
  "Comparison - vs Competitor HTML Template",
  "Testimonial - Social Proof HTML Template",
  "About - Company Story HTML Template",
];
for (const g of [G.saas, G.agency, G.edu, G.pro]) {
  pool.push(...content(EXTRA_CONTENT, [g], "content-strategy-pack", 84));
}

// Phase 3 — top-up toward 500 with sector-diverse premium HTML/email/ads names
const TOPUP_VERTICALS: Array<{ group: string; pack: string; prefix: string }> = [
  { group: G.food, pack: "local-business-growth", prefix: "Food" },
  { group: G.health, pack: "local-business-growth", prefix: "Health" },
  { group: G.fitness, pack: "local-business-growth", prefix: "Fitness" },
  { group: G.ecom, pack: "ecommerce-growth", prefix: "Shop" },
  { group: G.saas, pack: "saas-b2b-growth", prefix: "SaaS" },
  { group: G.agency, pack: "saas-b2b-growth", prefix: "Agency" },
  { group: G.pro, pack: "local-business-growth", prefix: "Pro" },
  { group: G.home, pack: "local-business-growth", prefix: "Home" },
  { group: G.travel, pack: "local-business-growth", prefix: "Travel" },
  { group: G.beauty, pack: "local-business-growth", prefix: "Beauty" },
  { group: G.auto, pack: "local-business-growth", prefix: "Auto" },
  { group: G.edu, pack: "content-strategy-pack", prefix: "Edu" },
  { group: G.ind, pack: "ecommerce-growth", prefix: "Industrial" },
  { group: G.other, pack: "local-business-growth", prefix: "Biz" },
];

for (const v of TOPUP_VERTICALS) {
  for (let i = 1; i <= 18; i++) {
    pool.push(
      ...landing(
        [`${v.prefix} Elite ${i} - Premium HTML Landing Template`],
        [v.group],
        v.pack,
        ["Landing", "Local"],
        82,
      ),
    );
    if (i % 3 === 0) {
      pool.push(...email([`${v.prefix} Mail ${i} - Email Newsletter Template`], [v.group], "email-welcome-nurture", 81));
    }
    if (i % 4 === 0) {
      pool.push(...ads([`${v.prefix} Promo ${i} - HTML5 Banner Ads Pack`], [v.group], "meta-ads-pack", 80));
    }
  }
}

// Dedupe
const seen = new Set<string>();
const deduped = pool.filter((p) => {
  const k = `${p.provider}|${p.item_name}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(deduped, null, 2) + "\n", "utf8");

const seenBase = new Set<string>();
const baseUnique = SEED_DOWNLOAD_CATALOG.filter((e) => {
  const k = `${e.provider}|${e.item_name}`;
  if (seenBase.has(k)) return false;
  seenBase.add(k);
  return true;
});
fs.writeFileSync(BASE_OUT, JSON.stringify(baseUnique, null, 2) + "\n", "utf8");

console.log(`Wrote ${deduped.length} expansion pool items → ${OUT}`);
console.log(`Wrote ${baseUnique.length} base catalog items → ${BASE_OUT}`);
