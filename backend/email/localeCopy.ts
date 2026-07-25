/**
 * Locale-aware copy for transactional email templates that are wired to it.
 *
 * Honest scope (do NOT claim FULL_VERIFIED for email):
 *  - Wired (es/en/fr/de/it/pt): welcome, passwordReset, invoice, jobCompleted,
 *    onboardingComplete, and SES catalog payment_failed + cancellation
 *    (`backend/email/templates.ts`).
 *  - Still Spanish-only (PARTIAL gap): other SES catalog templates
 *    (email_verify, plan_activated, data_export_confirm, …) and billing-lifecycle
 *    templates in `backend/billing/dunningEmailTemplates.ts` /
 *    `cancellationEmailTemplates.ts` (second notice, suspension, offboarding, …).
 */

export type EmailLocale = "es" | "en" | "fr" | "de" | "it" | "pt";

export type WelcomeCopy = {
  subject: (name: string) => string;
  title: (name: string) => string;
  body: (companyName: string) => string;
  detailHtml: string;
  cta: string;
};

export type PasswordResetCopy = {
  subject: string;
  title: string;
  body: (name: string) => string;
  detailHtml: string;
  cta: string;
};

export type InvoiceCopy = {
  subject: (plan: string) => string;
  title: (plan: string) => string;
  body: (name: string) => string;
  detailHtml: (plan: string, amountFormatted: string, dateFormatted: string) => string;
  cta: string;
  dateLocale: string;
};

export type JobCompletedCopy = {
  subject: (serviceId: string) => string;
  title: (serviceId: string) => string;
  body: (name: string) => string;
  summaryLabel: string;
  jobIdLabel: string;
  cta: string;
};

export type OnboardingCompleteCopy = {
  subject: (companyName: string) => string;
  title: (companyName: string) => string;
  body: (name: string, companyName: string) => string;
  detailHtml: string;
  cta: string;
};

export type PaymentFailedCopy = {
  subject: string;
  title: string;
  body: string;
  cta: string;
  text: (appUrl: string) => string;
};

export type CancellationCopy = {
  subject: string;
  title: string;
  body: string;
  accessUntil: (accessUntil: string) => string;
  cta: string;
  text: (accessUntil: string) => string;
};

const WELCOME: Record<EmailLocale, WelcomeCopy> = {
  es: {
    subject: (name) => `Bienvenido a NELVYON, ${name}`,
    title: (name) => `Bienvenido a NELVYON, ${name}`,
    body: (companyName) =>
      `Tu cuenta en ${companyName} esta activa. Completa tu onboarding para empezar.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Activa tu espacio y configura tus primeros servicios premium.</p>`,
    cta: "Ir al onboarding",
  },
  en: {
    subject: (name) => `Welcome to NELVYON, ${name}`,
    title: (name) => `Welcome to NELVYON, ${name}`,
    body: (companyName) =>
      `Your account at ${companyName} is active. Complete onboarding to get started.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Activate your workspace and set up your first premium services.</p>`,
    cta: "Go to onboarding",
  },
  fr: {
    subject: (name) => `Bienvenue sur NELVYON, ${name}`,
    title: (name) => `Bienvenue sur NELVYON, ${name}`,
    body: (companyName) =>
      `Votre compte chez ${companyName} est actif. Terminez l'onboarding pour commencer.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Activez votre espace et configurez vos premiers services premium.</p>`,
    cta: "Aller à l'onboarding",
  },
  de: {
    subject: (name) => `Willkommen bei NELVYON, ${name}`,
    title: (name) => `Willkommen bei NELVYON, ${name}`,
    body: (companyName) =>
      `Ihr Konto bei ${companyName} ist aktiv. Schließen Sie das Onboarding ab, um zu starten.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Aktivieren Sie Ihren Workspace und richten Sie Ihre ersten Premium-Services ein.</p>`,
    cta: "Zum Onboarding",
  },
  it: {
    subject: (name) => `Benvenuto su NELVYON, ${name}`,
    title: (name) => `Benvenuto su NELVYON, ${name}`,
    body: (companyName) =>
      `Il tuo account su ${companyName} è attivo. Completa l'onboarding per iniziare.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Attiva il tuo spazio e configura i primi servizi premium.</p>`,
    cta: "Vai all'onboarding",
  },
  pt: {
    subject: (name) => `Bem-vindo à NELVYON, ${name}`,
    title: (name) => `Bem-vindo à NELVYON, ${name}`,
    body: (companyName) =>
      `A sua conta em ${companyName} está ativa. Conclua o onboarding para começar.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Ative o seu espaço e configure os primeiros serviços premium.</p>`,
    cta: "Ir para o onboarding",
  },
};

const PASSWORD_RESET: Record<EmailLocale, PasswordResetCopy> = {
  es: {
    subject: "Restablece tu contrasena NELVYON",
    title: "Restablece tu contrasena NELVYON",
    body: (name) => `Hola ${name}, has solicitado restablecer tu contrasena.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Este enlace expira en 1 hora.</p>`,
    cta: "Restablecer contrasena",
  },
  en: {
    subject: "Reset your NELVYON password",
    title: "Reset your NELVYON password",
    body: (name) => `Hi ${name}, you requested a password reset.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">This link expires in 1 hour.</p>`,
    cta: "Reset password",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe NELVYON",
    title: "Réinitialisez votre mot de passe NELVYON",
    body: (name) => `Bonjour ${name}, vous avez demandé à réinitialiser votre mot de passe.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Ce lien expire dans 1 heure.</p>`,
    cta: "Réinitialiser le mot de passe",
  },
  de: {
    subject: "NELVYON-Passwort zurücksetzen",
    title: "NELVYON-Passwort zurücksetzen",
    body: (name) => `Hallo ${name}, Sie haben das Zurücksetzen Ihres Passworts angefordert.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Dieser Link läuft in 1 Stunde ab.</p>`,
    cta: "Passwort zurücksetzen",
  },
  it: {
    subject: "Reimposta la password NELVYON",
    title: "Reimposta la password NELVYON",
    body: (name) => `Ciao ${name}, hai richiesto di reimpostare la password.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Questo link scade tra 1 ora.</p>`,
    cta: "Reimposta password",
  },
  pt: {
    subject: "Redefina a sua palavra-passe NELVYON",
    title: "Redefina a sua palavra-passe NELVYON",
    body: (name) => `Olá ${name}, pediu para redefinir a sua palavra-passe.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Este link expira em 1 hora.</p>`,
    cta: "Redefinir palavra-passe",
  },
};

const INVOICE: Record<EmailLocale, InvoiceCopy> = {
  es: {
    subject: (plan) => `Factura NELVYON - Plan ${plan}`,
    title: (plan) => `Factura NELVYON - Plan ${plan}`,
    body: (name) => `Hola ${name}, aqui tienes el detalle de tu factura.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plan: ${plan}</li>
       <li>Importe: €${amount}</li>
       <li>Fecha: ${date}</li>
     </ul>`,
    cta: "Ver factura",
    dateLocale: "es-ES",
  },
  en: {
    subject: (plan) => `NELVYON invoice - ${plan} plan`,
    title: (plan) => `NELVYON invoice - ${plan} plan`,
    body: (name) => `Hi ${name}, here are the details of your invoice.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plan: ${plan}</li>
       <li>Amount: €${amount}</li>
       <li>Date: ${date}</li>
     </ul>`,
    cta: "View invoice",
    dateLocale: "en-GB",
  },
  fr: {
    subject: (plan) => `Facture NELVYON - Plan ${plan}`,
    title: (plan) => `Facture NELVYON - Plan ${plan}`,
    body: (name) => `Bonjour ${name}, voici le détail de votre facture.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plan : ${plan}</li>
       <li>Montant : €${amount}</li>
       <li>Date : ${date}</li>
     </ul>`,
    cta: "Voir la facture",
    dateLocale: "fr-FR",
  },
  de: {
    subject: (plan) => `NELVYON-Rechnung - Plan ${plan}`,
    title: (plan) => `NELVYON-Rechnung - Plan ${plan}`,
    body: (name) => `Hallo ${name}, hier sind die Details Ihrer Rechnung.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plan: ${plan}</li>
       <li>Betrag: €${amount}</li>
       <li>Datum: ${date}</li>
     </ul>`,
    cta: "Rechnung ansehen",
    dateLocale: "de-DE",
  },
  it: {
    subject: (plan) => `Fattura NELVYON - Piano ${plan}`,
    title: (plan) => `Fattura NELVYON - Piano ${plan}`,
    body: (name) => `Ciao ${name}, ecco i dettagli della tua fattura.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Piano: ${plan}</li>
       <li>Importo: €${amount}</li>
       <li>Data: ${date}</li>
     </ul>`,
    cta: "Vedi fattura",
    dateLocale: "it-IT",
  },
  pt: {
    subject: (plan) => `Fatura NELVYON - Plano ${plan}`,
    title: (plan) => `Fatura NELVYON - Plano ${plan}`,
    body: (name) => `Olá ${name}, aqui está o detalhe da sua fatura.`,
    detailHtml: (plan, amount, date) =>
      `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plano: ${plan}</li>
       <li>Valor: €${amount}</li>
       <li>Data: ${date}</li>
     </ul>`,
    cta: "Ver fatura",
    dateLocale: "pt-PT",
  },
};

const JOB_COMPLETED: Record<EmailLocale, JobCompletedCopy> = {
  es: {
    subject: (serviceId) => `Tu servicio ${serviceId} esta listo`,
    title: (serviceId) => `Tu servicio ${serviceId} esta listo`,
    body: (name) => `Hola ${name}, NELVYON OS ha completado tu servicio.`,
    summaryLabel: "Resumen:",
    jobIdLabel: "Job ID:",
    cta: "Ver resultado",
  },
  en: {
    subject: (serviceId) => `Your ${serviceId} service is ready`,
    title: (serviceId) => `Your ${serviceId} service is ready`,
    body: (name) => `Hi ${name}, NELVYON OS has completed your service.`,
    summaryLabel: "Summary:",
    jobIdLabel: "Job ID:",
    cta: "View result",
  },
  fr: {
    subject: (serviceId) => `Votre service ${serviceId} est prêt`,
    title: (serviceId) => `Votre service ${serviceId} est prêt`,
    body: (name) => `Bonjour ${name}, NELVYON OS a terminé votre service.`,
    summaryLabel: "Résumé :",
    jobIdLabel: "Job ID :",
    cta: "Voir le résultat",
  },
  de: {
    subject: (serviceId) => `Ihr Service ${serviceId} ist fertig`,
    title: (serviceId) => `Ihr Service ${serviceId} ist fertig`,
    body: (name) => `Hallo ${name}, NELVYON OS hat Ihren Service abgeschlossen.`,
    summaryLabel: "Zusammenfassung:",
    jobIdLabel: "Job-ID:",
    cta: "Ergebnis ansehen",
  },
  it: {
    subject: (serviceId) => `Il tuo servizio ${serviceId} è pronto`,
    title: (serviceId) => `Il tuo servizio ${serviceId} è pronto`,
    body: (name) => `Ciao ${name}, NELVYON OS ha completato il tuo servizio.`,
    summaryLabel: "Riepilogo:",
    jobIdLabel: "Job ID:",
    cta: "Vedi risultato",
  },
  pt: {
    subject: (serviceId) => `O seu serviço ${serviceId} está pronto`,
    title: (serviceId) => `O seu serviço ${serviceId} está pronto`,
    body: (name) => `Olá ${name}, o NELVYON OS concluiu o seu serviço.`,
    summaryLabel: "Resumo:",
    jobIdLabel: "Job ID:",
    cta: "Ver resultado",
  },
};

const ONBOARDING_COMPLETE: Record<EmailLocale, OnboardingCompleteCopy> = {
  es: {
    subject: (companyName) => `${companyName} esta lista en NELVYON`,
    title: (companyName) => `${companyName} esta lista en NELVYON`,
    body: (name, companyName) =>
      `Hola ${name}, tu empresa ${companyName} esta configurada. El OS esta listo para trabajar.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Ya puedes lanzar servicios, flujos y campanas desde tu panel.</p>`,
    cta: "Ir al dashboard",
  },
  en: {
    subject: (companyName) => `${companyName} is ready on NELVYON`,
    title: (companyName) => `${companyName} is ready on NELVYON`,
    body: (name, companyName) =>
      `Hi ${name}, your company ${companyName} is set up. The OS is ready to work.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">You can now launch services, workflows, and campaigns from your dashboard.</p>`,
    cta: "Go to dashboard",
  },
  fr: {
    subject: (companyName) => `${companyName} est prête sur NELVYON`,
    title: (companyName) => `${companyName} est prête sur NELVYON`,
    body: (name, companyName) =>
      `Bonjour ${name}, votre entreprise ${companyName} est configurée. L'OS est prêt à travailler.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Vous pouvez lancer services, flux et campagnes depuis votre tableau de bord.</p>`,
    cta: "Aller au tableau de bord",
  },
  de: {
    subject: (companyName) => `${companyName} ist bei NELVYON bereit`,
    title: (companyName) => `${companyName} ist bei NELVYON bereit`,
    body: (name, companyName) =>
      `Hallo ${name}, Ihr Unternehmen ${companyName} ist eingerichtet. Das OS ist einsatzbereit.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Sie können Services, Workflows und Kampagnen jetzt über Ihr Dashboard starten.</p>`,
    cta: "Zum Dashboard",
  },
  it: {
    subject: (companyName) => `${companyName} è pronta su NELVYON`,
    title: (companyName) => `${companyName} è pronta su NELVYON`,
    body: (name, companyName) =>
      `Ciao ${name}, la tua azienda ${companyName} è configurata. L'OS è pronto a lavorare.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Puoi già avviare servizi, flussi e campagne dal tuo pannello.</p>`,
    cta: "Vai alla dashboard",
  },
  pt: {
    subject: (companyName) => `${companyName} está pronta na NELVYON`,
    title: (companyName) => `${companyName} está pronta na NELVYON`,
    body: (name, companyName) =>
      `Olá ${name}, a sua empresa ${companyName} está configurada. O OS está pronto para trabalhar.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Já pode lançar serviços, fluxos e campanhas a partir do painel.</p>`,
    cta: "Ir para o dashboard",
  },
};

const PAYMENT_FAILED: Record<EmailLocale, PaymentFailedCopy> = {
  es: {
    subject: "Problema con tu pago — NELVYON",
    title: "Problema con tu pago",
    body: "No hemos podido procesar tu pago. Actualiza tu método de pago para mantener el acceso a NELVYON.",
    cta: "Actualizar método de pago →",
    text: (appUrl) => `Hubo un problema con tu pago. Actualiza tu método de pago en ${appUrl}/billing`,
  },
  en: {
    subject: "Payment problem — NELVYON",
    title: "Payment problem",
    body: "We could not process your payment. Update your payment method to keep access to NELVYON.",
    cta: "Update payment method →",
    text: (appUrl) => `There was a problem with your payment. Update your payment method at ${appUrl}/billing`,
  },
  fr: {
    subject: "Problème de paiement — NELVYON",
    title: "Problème de paiement",
    body: "Nous n'avons pas pu traiter votre paiement. Mettez à jour votre moyen de paiement pour conserver l'accès à NELVYON.",
    cta: "Mettre à jour le moyen de paiement →",
    text: (appUrl) =>
      `Un problème est survenu avec votre paiement. Mettez à jour votre moyen de paiement sur ${appUrl}/billing`,
  },
  de: {
    subject: "Zahlungsproblem — NELVYON",
    title: "Zahlungsproblem",
    body: "Wir konnten Ihre Zahlung nicht verarbeiten. Aktualisieren Sie Ihre Zahlungsmethode, um den Zugang zu NELVYON zu behalten.",
    cta: "Zahlungsmethode aktualisieren →",
    text: (appUrl) =>
      `Es gab ein Problem mit Ihrer Zahlung. Aktualisieren Sie Ihre Zahlungsmethode unter ${appUrl}/billing`,
  },
  it: {
    subject: "Problema con il pagamento — NELVYON",
    title: "Problema con il pagamento",
    body: "Non siamo riusciti a elaborare il pagamento. Aggiorna il metodo di pagamento per mantenere l'accesso a NELVYON.",
    cta: "Aggiorna metodo di pagamento →",
    text: (appUrl) =>
      `C'è stato un problema con il pagamento. Aggiorna il metodo di pagamento su ${appUrl}/billing`,
  },
  pt: {
    subject: "Problema com o pagamento — NELVYON",
    title: "Problema com o pagamento",
    body: "Não conseguimos processar o seu pagamento. Atualize o método de pagamento para manter o acesso à NELVYON.",
    cta: "Atualizar método de pagamento →",
    text: (appUrl) =>
      `Houve um problema com o seu pagamento. Atualize o método de pagamento em ${appUrl}/billing`,
  },
};

const CANCELLATION: Record<EmailLocale, CancellationCopy> = {
  es: {
    subject: "Tu suscripción ha sido cancelada — NELVYON",
    title: "Suscripción cancelada",
    body: "Tu suscripción ha sido cancelada correctamente.",
    accessUntil: (accessUntil) =>
      `Seguirás teniendo acceso hasta: <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Reactivar plan →",
    text: (accessUntil) => `Tu suscripción ha sido cancelada. Tienes acceso hasta ${accessUntil}.`,
  },
  en: {
    subject: "Your subscription has been cancelled — NELVYON",
    title: "Subscription cancelled",
    body: "Your subscription has been cancelled successfully.",
    accessUntil: (accessUntil) =>
      `You will keep access until: <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Reactivate plan →",
    text: (accessUntil) => `Your subscription has been cancelled. You have access until ${accessUntil}.`,
  },
  fr: {
    subject: "Votre abonnement a été annulé — NELVYON",
    title: "Abonnement annulé",
    body: "Votre abonnement a été annulé avec succès.",
    accessUntil: (accessUntil) =>
      `Vous conserverez l'accès jusqu'au : <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Réactiver le plan →",
    text: (accessUntil) => `Votre abonnement a été annulé. Vous avez accès jusqu'au ${accessUntil}.`,
  },
  de: {
    subject: "Ihr Abonnement wurde gekündigt — NELVYON",
    title: "Abonnement gekündigt",
    body: "Ihr Abonnement wurde erfolgreich gekündigt.",
    accessUntil: (accessUntil) =>
      `Sie behalten den Zugang bis: <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Plan reaktivieren →",
    text: (accessUntil) => `Ihr Abonnement wurde gekündigt. Sie haben Zugang bis ${accessUntil}.`,
  },
  it: {
    subject: "Il tuo abbonamento è stato cancellato — NELVYON",
    title: "Abbonamento cancellato",
    body: "Il tuo abbonamento è stato cancellato correttamente.",
    accessUntil: (accessUntil) =>
      `Manterrai l'accesso fino al: <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Riattiva piano →",
    text: (accessUntil) => `Il tuo abbonamento è stato cancellato. Hai accesso fino al ${accessUntil}.`,
  },
  pt: {
    subject: "A sua subscrição foi cancelada — NELVYON",
    title: "Subscrição cancelada",
    body: "A sua subscrição foi cancelada com sucesso.",
    accessUntil: (accessUntil) =>
      `Manterá o acesso até: <strong style="color:#f4f4f5;">${accessUntil}</strong>`,
    cta: "Reativar plano →",
    text: (accessUntil) => `A sua subscrição foi cancelada. Tem acesso até ${accessUntil}.`,
  },
};

export function resolveEmailLocale(locale?: string | null): EmailLocale {
  if (locale === "en" || locale === "fr" || locale === "de" || locale === "it" || locale === "pt") {
    return locale;
  }
  return "es";
}

export function getWelcomeCopy(locale?: string | null): WelcomeCopy {
  return WELCOME[resolveEmailLocale(locale)];
}

export function getPasswordResetCopy(locale?: string | null): PasswordResetCopy {
  return PASSWORD_RESET[resolveEmailLocale(locale)];
}

export function getInvoiceCopy(locale?: string | null): InvoiceCopy {
  return INVOICE[resolveEmailLocale(locale)];
}

export function getJobCompletedCopy(locale?: string | null): JobCompletedCopy {
  return JOB_COMPLETED[resolveEmailLocale(locale)];
}

export function getOnboardingCompleteCopy(locale?: string | null): OnboardingCompleteCopy {
  return ONBOARDING_COMPLETE[resolveEmailLocale(locale)];
}

export function getPaymentFailedCopy(locale?: string | null): PaymentFailedCopy {
  return PAYMENT_FAILED[resolveEmailLocale(locale)];
}

export function getCancellationCopy(locale?: string | null): CancellationCopy {
  return CANCELLATION[resolveEmailLocale(locale)];
}
