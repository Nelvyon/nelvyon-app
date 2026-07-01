/**
 * Plantillas oficiales Nelvyon — secuencias drip multicanal.
 */
import {
  SaasSequencesService,
  type SequenceTrigger,
  type SequenceStepType,
} from "./SaasSequencesService";

export type SequenceTemplateCategory =
  | "welcome"
  | "nurture"
  | "sales"
  | "re-engagement"
  | "reviews"
  | "multichannel";

export type SequenceTemplate = {
  id: string;
  name: string;
  description: string;
  category: SequenceTemplateCategory;
  triggerType: SequenceTrigger;
  triggerConfig?: Record<string, unknown>;
  tags: string[];
  steps: Array<{
    stepType: SequenceStepType;
    delayDays: number;
    delayHours?: number;
    subject?: string;
    bodyHtml: string;
  }>;
};

export class SaasSequenceTemplatesError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasSequenceTemplatesError";
  }
}

const OFFICIAL_TEMPLATES: SequenceTemplate[] = [
  {
    id: "welcome-3-email",
    name: "Welcome Series (3 emails)",
    description: "Serie de bienvenida en 3 emails: intro → valor → CTA en 5 días.",
    category: "welcome",
    triggerType: "contact_created",
    tags: ["welcome", "email", "onboarding"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Welcome to {{company}}!", bodyHtml: "<p>Hi {{contact.name}},</p><p>Thanks for joining us. Here is what you can expect…</p>" },
      { stepType: "wait", delayDays: 2, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Quick win for you", bodyHtml: "<p>Hi {{contact.name}},</p><p>Here are 3 tips to get started today…</p>" },
      { stepType: "wait", delayDays: 3, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Ready to take the next step?", bodyHtml: "<p>Hi {{contact.name}},</p><p>Book a call or reply to this email — we are here to help.</p>" },
    ],
  },
  {
    id: "nurture-5-touch",
    name: "5-Touch Lead Nurture",
    description: "Nurture B2B: educación, prueba social, oferta, urgencia y cierre.",
    category: "nurture",
    triggerType: "manual",
    tags: ["nurture", "b2b", "drip"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "The problem we solve", bodyHtml: "<p>Hi {{contact.name}},</p><p>Most teams struggle with…</p>" },
      { stepType: "wait", delayDays: 3, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "How {{company}} helps", bodyHtml: "<p>Case study snapshot + results…</p>" },
      { stepType: "wait", delayDays: 4, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Your custom offer", bodyHtml: "<p>Limited-time offer for qualified leads…</p>" },
      { stepType: "wait", delayDays: 5, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Last chance this month", bodyHtml: "<p>Closing the loop — still interested?</p>" },
      { stepType: "wait", delayDays: 7, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Should I close your file?", bodyHtml: "<p>Break-up email — reply YES to stay in touch.</p>" },
    ],
  },
  {
    id: "form-followup-24h",
    name: "Form Submitted → 24h Follow-up",
    description: "Confirmación inmediata + seguimiento al día siguiente tras formulario.",
    category: "sales",
    triggerType: "form_submitted",
    tags: ["form", "lead", "follow-up"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "We received your request", bodyHtml: "<p>Hi {{contact.name}},</p><p>Thanks — a specialist will reach out within 24 hours.</p>" },
      { stepType: "wait", delayDays: 1, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Following up on your inquiry", bodyHtml: "<p>Hi {{contact.name}},</p><p>Did you get a chance to review our info? Happy to answer questions.</p>" },
    ],
  },
  {
    id: "review-request-drip",
    name: "Review Request (email + SMS)",
    description: "Ask for Google review after positive experience — email then SMS nudge.",
    category: "reviews",
    triggerType: "manual",
    tags: ["reviews", "reputation", "nelvyon"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "How did we do?", bodyHtml: "<p>Hi {{contact.name}},</p><p>We would love a quick review: {{review_link}}</p>" },
      { stepType: "wait", delayDays: 3, bodyHtml: "" },
      { stepType: "sms", delayDays: 0, bodyHtml: "Hi {{contact.name}}! Quick favor — leave us a Google review: {{review_link}}" },
    ],
  },
  {
    id: "re-engagement-cold",
    name: "Re-engage Cold Leads (3 emails)",
    description: "Win-back sequence for inactive contacts.",
    category: "re-engagement",
    triggerType: "manual",
    tags: ["cold", "win-back"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "We miss you", bodyHtml: "<p>Hi {{contact.name}},</p><p>It has been a while — here is what is new…</p>" },
      { stepType: "wait", delayDays: 5, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Special comeback offer", bodyHtml: "<p>Exclusive offer for returning contacts…</p>" },
      { stepType: "wait", delayDays: 7, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Unsubscribe or stay?", bodyHtml: "<p>Reply STAY to keep hearing from us.</p>" },
    ],
  },
  {
    id: "tag-vip-onboarding",
    name: "VIP Tag → Premium Onboarding",
    description: "Automatización al etiquetar un contacto como VIP.",
    category: "welcome",
    triggerType: "tag_added",
    triggerConfig: { tag: "vip" },
    tags: ["vip", "tag", "onboarding"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Your VIP welcome", bodyHtml: "<p>Hi {{contact.name}},</p><p>Welcome to our VIP program — here are your benefits…</p>" },
      { stepType: "wait", delayDays: 1, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Your dedicated contact", bodyHtml: "<p>Your account manager will reach out shortly.</p>" },
    ],
  },
  {
    id: "sales-multichannel",
    name: "Sales Outreach (Email + SMS + WhatsApp)",
    description: "Secuencia multicanal: email, SMS y WhatsApp.",
    category: "multichannel",
    triggerType: "manual",
    tags: ["sms", "whatsapp", "outbound"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Quick question for {{contact.name}}", bodyHtml: "<p>I noticed your company… worth a 15-min chat?</p>" },
      { stepType: "wait", delayDays: 2, bodyHtml: "" },
      { stepType: "sms", delayDays: 0, bodyHtml: "Hi {{contact.name}}, sent you an email — open to a quick call this week?" },
      { stepType: "wait", delayDays: 3, bodyHtml: "" },
      { stepType: "whatsapp", delayDays: 0, bodyHtml: "Hi {{contact.name}}! Following up here in case email is easier on WhatsApp." },
    ],
  },
  {
    id: "appointment-reminder",
    name: "Appointment Reminders (SMS + email)",
    description: "Day-before email + same-day SMS reminder.",
    category: "multichannel",
    triggerType: "manual",
    tags: ["appointment", "calendar", "reminder"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Reminder: appointment tomorrow", bodyHtml: "<p>Hi {{contact.name}},</p><p>See you tomorrow at {{appointment_time}}.</p>" },
      { stepType: "wait", delayDays: 1, bodyHtml: "" },
      { stepType: "sms", delayDays: 0, bodyHtml: "Reminder: your appointment is today at {{appointment_time}}. Reply CONFIRM." },
    ],
  },
  {
    id: "webinar-followup",
    name: "Webinar Attendee Follow-up",
    description: "Post-webinar nurture: replay → offer → deadline.",
    category: "nurture",
    triggerType: "tag_added",
    triggerConfig: { tag: "webinar-attendee" },
    tags: ["webinar", "event"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Webinar replay + slides", bodyHtml: "<p>Thanks for attending! Replay link inside…</p>" },
      { stepType: "wait", delayDays: 2, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Special offer for attendees", bodyHtml: "<p>Exclusive discount for webinar participants…</p>" },
      { stepType: "wait", delayDays: 3, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Offer expires tonight", bodyHtml: "<p>Last chance to claim your attendee bonus.</p>" },
    ],
  },
  {
    id: "post-purchase-thanks",
    name: "Post-Purchase Thank You + Upsell",
    description: "Agradecimiento post-compra + email de cross-sell.",
    category: "sales",
    triggerType: "tag_added",
    triggerConfig: { tag: "customer" },
    tags: ["ecommerce", "upsell"],
    steps: [
      { stepType: "email", delayDays: 0, subject: "Thank you for your purchase!", bodyHtml: "<p>Hi {{contact.name}},</p><p>Order confirmed. Here is what happens next…</p>" },
      { stepType: "wait", delayDays: 7, bodyHtml: "" },
      { stepType: "email", delayDays: 0, subject: "Customers also love…", bodyHtml: "<p>Based on your purchase, you might like…</p>" },
    ],
  },
];

export class SaasSequenceTemplatesService {
  constructor(
    private readonly sequences = new SaasSequencesService(),
  ) {}

  list(category?: SequenceTemplateCategory): SequenceTemplate[] {
    if (!category) return [...OFFICIAL_TEMPLATES];
    return OFFICIAL_TEMPLATES.filter((t) => t.category === category);
  }

  get(id: string): SequenceTemplate {
    const t = OFFICIAL_TEMPLATES.find((x) => x.id === id);
    if (!t) throw new SaasSequenceTemplatesError("Template not found", "NOT_FOUND");
    return t;
  }

  async importTemplate(
    tenantId: string,
    templateId: string,
    overrideName?: string,
  ): Promise<{ sequenceId: string; name: string; stepsCreated: number }> {
    const template = this.get(templateId);
    const seq = await this.sequences.create(tenantId, {
      name: overrideName ?? template.name,
      description: template.description,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig ?? {},
    });

    let stepsCreated = 0;
    for (const step of template.steps) {
      await this.sequences.addStep(tenantId, seq.id, {
        stepType: step.stepType,
        delayDays: step.delayDays,
        delayHours: step.delayHours ?? 0,
        subject: step.subject ?? "",
        bodyHtml: step.bodyHtml,
      });
      stepsCreated++;
    }

    return { sequenceId: seq.id, name: seq.name, stepsCreated };
  }
}

let _instance: SaasSequenceTemplatesService | null = null;
export function getSaasSequenceTemplatesService(): SaasSequenceTemplatesService {
  if (!_instance) _instance = new SaasSequenceTemplatesService();
  return _instance;
}
export function resetSaasSequenceTemplatesServiceForTests(): void {
  _instance = null;
}
