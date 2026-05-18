export type PersonalDigitalAuditStatus = "pass" | "warn" | "fail" | "pending";

export type PersonalDigitalAuditPriority = "P1" | "P2" | "P3";

export interface PersonalDigitalPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface PersonalDigitalAuditItem {
  id: string;
  label: string;
  status: PersonalDigitalAuditStatus;
  priority: PersonalDigitalAuditPriority;
  evidence: string;
}

export type PersonalDigitalModule =
  | "profile_presence"
  | "personal_web"
  | "professional_networks"
  | "personal_content"
  | "reputation_visibility"
  | "reporting";

export interface PersonalDigitalDeliverableSection {
  id: string;
  module: PersonalDigitalModule;
  title: string;
  intro?: string;
  items: PersonalDigitalAuditItem[];
}

export interface PersonalDigitalProjectConfig {
  pageSeo: PersonalDigitalPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: PersonalDigitalDeliverableSection[];
}
