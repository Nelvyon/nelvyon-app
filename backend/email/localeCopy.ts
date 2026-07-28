/**
 * Locale-aware copy for transactional email templates that are wired to it.
 *
 * Honest scope (do NOT claim FULL_VERIFIED for email):
 *  - Wired (es/en/fr/de/it/pt): welcome, passwordReset, invoice (Resend + SES),
 *    jobCompleted, onboardingComplete, and full SES catalog in
 *    `backend/email/templates.ts` (email_verify, plan_activated, payment_failed,
 *    cancellation, data_export_confirm, account_deleted, nps_thank_you).
 *  - Billing lifecycle: `backend/billing/billingLifecycleLocale.ts` (dunning +
 *    cancellation scheduled/offboarding).
 *  - PARTIAL gap: PDF legal/tax body copy (HUMAN_REVIEW_REQUIRED).
 */

export type EmailLocale = "es" | "en" | "fr" | "de" | "it" | "pt";

export type WelcomeCopy = {
  subject: (name: string) => string;
  title: (name: string) => string;
  body: (companyName: string) => string;
  detailHtml: string;
  cta: string;
  sesSubject: string;
  sesDashboardBody: string;
  sesDashboardCta: string;
  sesText: (name: string, appUrl: string) => string;
};

export type PasswordResetCopy = {
  subject: string;
  title: string;
  body: (name: string) => string;
  detailHtml: string;
  cta: string;
  ignoreNote: string;
  text: (name: string, resetUrl: string) => string;
};

export type InvoiceCopy = {
  subject: (plan: string) => string;
  title: (plan: string) => string;
  body: (name: string) => string;
  detailHtml: (plan: string, amountFormatted: string, dateFormatted: string) => string;
  cta: string;
  dateLocale: string;
};

export type InvoiceSesCopy = {
  subject: (period: string) => string;
  title: string;
  invoiceNumberLabel: string;
  periodLabel: string;
  planLabel: string;
  amountLabel: string;
  paddleNote: string;
  text: (invoiceId: string, amount: string, period: string) => string;
};

export type EmailVerifyCopy = {
  subject: string;
  title: (name: string) => string;
  body: string;
  cta: string;
  ignoreNote: string;
  text: (name: string, verifyUrl: string) => string;
};

export type PlanActivatedStepCopy = {
  title: string;
  desc: string;
};

export type PlanActivatedCopy = {
  subject: (plan: string) => string;
  pageTitle: (planLabel: string) => string;
  headline: (planLabel: string) => string;
  intro: string;
  steps: PlanActivatedStepCopy[];
  renewalPrefix: string;
  cta: string;
  helpPrefix: string;
  text: (plan: string, periodEnd: string) => string;
};

export type DataExportConfirmCopy = {
  subject: string;
  title: string;
  body: (name: string) => string;
  exportedAtLabel: string;
  securityNote: string;
  legalLink: string;
  text: (name: string, exportedAt: string, appUrl: string) => string;
};

export type AccountDeletedCopy = {
  subject: string;
  title: string;
  greeting: (name: string) => string;
  retentionNote: string;
  defaultSummary: string;
  text: (summary: string) => string;
};

export type NpsThankYouCopy = {
  subject: string;
  title: (name: string) => string;
  body: (score: string) => string;
  commentNote: string;
  cta: string;
  text: (name: string, score: string) => string;
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
    sesSubject: "Bienvenido a NELVYON",
    sesDashboardBody:
      "Tu cuenta NELVYON esta activa. Accede a tu dashboard y empieza a usar todos los agentes de IA ahora mismo.",
    sesDashboardCta: "Ir al dashboard →",
    sesText: (name, appUrl) => `Bienvenido a NELVYON, ${name}. Tu cuenta esta activa. Accede en ${appUrl}`,
  },
  en: {
    subject: (name) => `Welcome to NELVYON, ${name}`,
    title: (name) => `Welcome to NELVYON, ${name}`,
    body: (companyName) =>
      `Your account at ${companyName} is active. Complete onboarding to get started.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Activate your workspace and set up your first premium services.</p>`,
    cta: "Go to onboarding",
    sesSubject: "Welcome to NELVYON",
    sesDashboardBody:
      "Your NELVYON account is active. Go to your dashboard and start using all AI agents right now.",
    sesDashboardCta: "Go to dashboard →",
    sesText: (name, appUrl) => `Welcome to NELVYON, ${name}. Your account is active. Sign in at ${appUrl}`,
  },
  fr: {
    subject: (name) => `Bienvenue sur NELVYON, ${name}`,
    title: (name) => `Bienvenue sur NELVYON, ${name}`,
    body: (companyName) =>
      `Votre compte chez ${companyName} est actif. Terminez l'onboarding pour commencer.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Activez votre espace et configurez vos premiers services premium.</p>`,
    cta: "Aller à l'onboarding",
    sesSubject: "Bienvenue sur NELVYON",
    sesDashboardBody:
      "Votre compte NELVYON est actif. Accédez à votre tableau de bord et commencez à utiliser tous les agents IA.",
    sesDashboardCta: "Aller au tableau de bord →",
    sesText: (name, appUrl) =>
      `Bienvenue sur NELVYON, ${name}. Votre compte est actif. Connectez-vous sur ${appUrl}`,
  },
  de: {
    subject: (name) => `Willkommen bei NELVYON, ${name}`,
    title: (name) => `Willkommen bei NELVYON, ${name}`,
    body: (companyName) =>
      `Ihr Konto bei ${companyName} ist aktiv. Schließen Sie das Onboarding ab, um zu starten.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Aktivieren Sie Ihren Workspace und richten Sie Ihre ersten Premium-Services ein.</p>`,
    cta: "Zum Onboarding",
    sesSubject: "Willkommen bei NELVYON",
    sesDashboardBody:
      "Ihr NELVYON-Konto ist aktiv. Öffnen Sie Ihr Dashboard und nutzen Sie sofort alle KI-Agenten.",
    sesDashboardCta: "Zum Dashboard →",
    sesText: (name, appUrl) =>
      `Willkommen bei NELVYON, ${name}. Ihr Konto ist aktiv. Melden Sie sich an unter ${appUrl}`,
  },
  it: {
    subject: (name) => `Benvenuto su NELVYON, ${name}`,
    title: (name) => `Benvenuto su NELVYON, ${name}`,
    body: (companyName) =>
      `Il tuo account su ${companyName} è attivo. Completa l'onboarding per iniziare.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Attiva il tuo spazio e configura i primi servizi premium.</p>`,
    cta: "Vai all'onboarding",
    sesSubject: "Benvenuto su NELVYON",
    sesDashboardBody:
      "Il tuo account NELVYON è attivo. Accedi alla dashboard e inizia a usare tutti gli agenti IA.",
    sesDashboardCta: "Vai alla dashboard →",
    sesText: (name, appUrl) =>
      `Benvenuto su NELVYON, ${name}. Il tuo account è attivo. Accedi su ${appUrl}`,
  },
  pt: {
    subject: (name) => `Bem-vindo à NELVYON, ${name}`,
    title: (name) => `Bem-vindo à NELVYON, ${name}`,
    body: (companyName) =>
      `A sua conta em ${companyName} está ativa. Conclua o onboarding para começar.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Ative o seu espaço e configure os primeiros serviços premium.</p>`,
    cta: "Ir para o onboarding",
    sesSubject: "Bem-vindo à NELVYON",
    sesDashboardBody:
      "A sua conta NELVYON está ativa. Aceda ao painel e comece a usar todos os agentes de IA.",
    sesDashboardCta: "Ir para o dashboard →",
    sesText: (name, appUrl) =>
      `Bem-vindo à NELVYON, ${name}. A sua conta está ativa. Aceda em ${appUrl}`,
  },
};

const PASSWORD_RESET: Record<EmailLocale, PasswordResetCopy> = {
  es: {
    subject: "Restablece tu contrasena NELVYON",
    title: "Restablece tu contrasena NELVYON",
    body: (name) => `Hola ${name}, has solicitado restablecer tu contrasena.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Este enlace expira en 1 hora.</p>`,
    cta: "Restablecer contrasena",
    ignoreNote: "Si no solicitaste este cambio, ignora este mensaje. Tu contrasena actual seguira siendo valida.",
    text: (name, resetUrl) => `Hola ${name}, restablece tu contrasena en NELVYON: ${resetUrl}`,
  },
  en: {
    subject: "Reset your NELVYON password",
    title: "Reset your NELVYON password",
    body: (name) => `Hi ${name}, you requested a password reset.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">This link expires in 1 hour.</p>`,
    cta: "Reset password",
    ignoreNote: "If you did not request this change, ignore this message. Your current password will remain valid.",
    text: (name, resetUrl) => `Hi ${name}, reset your NELVYON password: ${resetUrl}`,
  },
  fr: {
    subject: "Réinitialisez votre mot de passe NELVYON",
    title: "Réinitialisez votre mot de passe NELVYON",
    body: (name) => `Bonjour ${name}, vous avez demandé à réinitialiser votre mot de passe.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Ce lien expire dans 1 heure.</p>`,
    cta: "Réinitialiser le mot de passe",
    ignoreNote:
      "Si vous n'avez pas demandé ce changement, ignorez ce message. Votre mot de passe actuel restera valide.",
    text: (name, resetUrl) => `Bonjour ${name}, réinitialisez votre mot de passe NELVYON : ${resetUrl}`,
  },
  de: {
    subject: "NELVYON-Passwort zurücksetzen",
    title: "NELVYON-Passwort zurücksetzen",
    body: (name) => `Hallo ${name}, Sie haben das Zurücksetzen Ihres Passworts angefordert.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Dieser Link läuft in 1 Stunde ab.</p>`,
    cta: "Passwort zurücksetzen",
    ignoreNote:
      "Wenn Sie diese Änderung nicht angefordert haben, ignorieren Sie diese Nachricht. Ihr aktuelles Passwort bleibt gültig.",
    text: (name, resetUrl) => `Hallo ${name}, setzen Sie Ihr NELVYON-Passwort zurück: ${resetUrl}`,
  },
  it: {
    subject: "Reimposta la password NELVYON",
    title: "Reimposta la password NELVYON",
    body: (name) => `Ciao ${name}, hai richiesto di reimpostare la password.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Questo link scade tra 1 ora.</p>`,
    cta: "Reimposta password",
    ignoreNote:
      "Se non hai richiesto questa modifica, ignora questo messaggio. La password attuale resterà valida.",
    text: (name, resetUrl) => `Ciao ${name}, reimposta la password NELVYON: ${resetUrl}`,
  },
  pt: {
    subject: "Redefina a sua palavra-passe NELVYON",
    title: "Redefina a sua palavra-passe NELVYON",
    body: (name) => `Olá ${name}, pediu para redefinir a sua palavra-passe.`,
    detailHtml: `<p style="margin:0; color:#D1D5DB;">Este link expira em 1 hora.</p>`,
    cta: "Redefinir palavra-passe",
    ignoreNote:
      "Se não pediu esta alteração, ignore esta mensagem. A sua palavra-passe atual continuará válida.",
    text: (name, resetUrl) => `Olá ${name}, redefina a sua palavra-passe NELVYON: ${resetUrl}`,
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

const INVOICE_SES: Record<EmailLocale, InvoiceSesCopy> = {
  es: {
    subject: (period) => `Factura NELVYON — ${period}`,
    title: "Factura",
    invoiceNumberLabel: "Nº Factura",
    periodLabel: "Período",
    planLabel: "Plan",
    amountLabel: "Importe",
    paddleNote: "La factura fiscal la gestiona Paddle como Merchant of Record.",
    text: (invoiceId, amount, period) => `Factura ${invoiceId} por ${amount}. Período: ${period}.`,
  },
  en: {
    subject: (period) => `NELVYON invoice — ${period}`,
    title: "Invoice",
    invoiceNumberLabel: "Invoice no.",
    periodLabel: "Period",
    planLabel: "Plan",
    amountLabel: "Amount",
    paddleNote: "The tax invoice is handled by Paddle as Merchant of Record.",
    text: (invoiceId, amount, period) => `Invoice ${invoiceId} for ${amount}. Period: ${period}.`,
  },
  fr: {
    subject: (period) => `Facture NELVYON — ${period}`,
    title: "Facture",
    invoiceNumberLabel: "Nº facture",
    periodLabel: "Période",
    planLabel: "Plan",
    amountLabel: "Montant",
    paddleNote: "La facture fiscale est gérée par Paddle en tant que Merchant of Record.",
    text: (invoiceId, amount, period) => `Facture ${invoiceId} pour ${amount}. Période : ${period}.`,
  },
  de: {
    subject: (period) => `NELVYON-Rechnung — ${period}`,
    title: "Rechnung",
    invoiceNumberLabel: "Rechnungsnr.",
    periodLabel: "Zeitraum",
    planLabel: "Plan",
    amountLabel: "Betrag",
    paddleNote: "Die Steuerrechnung wird von Paddle als Merchant of Record verwaltet.",
    text: (invoiceId, amount, period) => `Rechnung ${invoiceId} über ${amount}. Zeitraum: ${period}.`,
  },
  it: {
    subject: (period) => `Fattura NELVYON — ${period}`,
    title: "Fattura",
    invoiceNumberLabel: "Nº fattura",
    periodLabel: "Periodo",
    planLabel: "Piano",
    amountLabel: "Importo",
    paddleNote: "La fattura fiscale è gestita da Paddle come Merchant of Record.",
    text: (invoiceId, amount, period) => `Fattura ${invoiceId} per ${amount}. Periodo: ${period}.`,
  },
  pt: {
    subject: (period) => `Fatura NELVYON — ${period}`,
    title: "Fatura",
    invoiceNumberLabel: "Nº fatura",
    periodLabel: "Período",
    planLabel: "Plano",
    amountLabel: "Valor",
    paddleNote: "A fatura fiscal é gerida pela Paddle como Merchant of Record.",
    text: (invoiceId, amount, period) => `Fatura ${invoiceId} por ${amount}. Período: ${period}.`,
  },
};

const EMAIL_VERIFY: Record<EmailLocale, EmailVerifyCopy> = {
  es: {
    subject: "Confirma tu email — NELVYON",
    title: (name) => `Confirma tu email, ${name}`,
    body: "Haz clic en el botón para verificar tu dirección de correo y activar tu cuenta NELVYON. El enlace caduca en 48 horas.",
    cta: "Confirmar email →",
    ignoreNote: "Si no creaste esta cuenta, ignora este mensaje.",
    text: (name, verifyUrl) => `Hola ${name}, confirma tu email en NELVYON: ${verifyUrl}`,
  },
  en: {
    subject: "Confirm your email — NELVYON",
    title: (name) => `Confirm your email, ${name}`,
    body: "Click the button to verify your email address and activate your NELVYON account. The link expires in 48 hours.",
    cta: "Confirm email →",
    ignoreNote: "If you did not create this account, ignore this message.",
    text: (name, verifyUrl) => `Hi ${name}, confirm your NELVYON email: ${verifyUrl}`,
  },
  fr: {
    subject: "Confirmez votre e-mail — NELVYON",
    title: (name) => `Confirmez votre e-mail, ${name}`,
    body: "Cliquez sur le bouton pour vérifier votre adresse e-mail et activer votre compte NELVYON. Le lien expire dans 48 heures.",
    cta: "Confirmer l'e-mail →",
    ignoreNote: "Si vous n'avez pas créé ce compte, ignorez ce message.",
    text: (name, verifyUrl) => `Bonjour ${name}, confirmez votre e-mail NELVYON : ${verifyUrl}`,
  },
  de: {
    subject: "E-Mail bestätigen — NELVYON",
    title: (name) => `E-Mail bestätigen, ${name}`,
    body: "Klicken Sie auf die Schaltfläche, um Ihre E-Mail-Adresse zu bestätigen und Ihr NELVYON-Konto zu aktivieren. Der Link läuft in 48 Stunden ab.",
    cta: "E-Mail bestätigen →",
    ignoreNote: "Wenn Sie dieses Konto nicht erstellt haben, ignorieren Sie diese Nachricht.",
    text: (name, verifyUrl) => `Hallo ${name}, bestätigen Sie Ihre NELVYON-E-Mail: ${verifyUrl}`,
  },
  it: {
    subject: "Conferma la tua email — NELVYON",
    title: (name) => `Conferma la tua email, ${name}`,
    body: "Clicca il pulsante per verificare il tuo indirizzo email e attivare il tuo account NELVYON. Il link scade tra 48 ore.",
    cta: "Conferma email →",
    ignoreNote: "Se non hai creato questo account, ignora questo messaggio.",
    text: (name, verifyUrl) => `Ciao ${name}, conferma la tua email NELVYON: ${verifyUrl}`,
  },
  pt: {
    subject: "Confirme o seu email — NELVYON",
    title: (name) => `Confirme o seu email, ${name}`,
    body: "Clique no botão para verificar o seu endereço de email e ativar a sua conta NELVYON. O link expira em 48 horas.",
    cta: "Confirmar email →",
    ignoreNote: "Se não criou esta conta, ignore esta mensagem.",
    text: (name, verifyUrl) => `Olá ${name}, confirme o seu email NELVYON: ${verifyUrl}`,
  },
};

const PLAN_STEP_PATHS = [
  "/saas/settings",
  "/saas/crm",
  "/saas/campanias",
  "/saas/social",
  "/saas/workflows",
] as const;

const PLAN_ACTIVATED: Record<EmailLocale, PlanActivatedCopy> = {
  es: {
    subject: (plan) => `Plan ${plan} activado — NELVYON`,
    pageTitle: (planLabel) => `¡Bienvenido a NELVYON ${planLabel}!`,
    headline: (planLabel) => `🎉 Tu plan <span style="color:#6366f1;">${planLabel}</span> está activo`,
    intro: "Tienes acceso completo a todos los módulos de NELVYON. Sigue estos 5 pasos para arrancar hoy mismo:",
    steps: [
      { title: "Completa tu perfil", desc: "Añade el nombre de tu empresa y logotipo." },
      { title: "Importa tus contactos", desc: "Sube tu CSV o conéctalos desde tu CRM anterior." },
      { title: "Crea tu primera campaña", desc: "Email, SMS o WhatsApp — en 2 minutos." },
      { title: "Activa tus redes sociales", desc: "Conecta Instagram, Facebook, LinkedIn y TikTok." },
      { title: "Configura tu primera automatización", desc: "Workflows que trabajan mientras duermes." },
    ],
    renewalPrefix: "Próxima renovación:",
    cta: "Ir al dashboard →",
    helpPrefix: "¿Necesitas ayuda? Escríbenos a",
    text: (plan, periodEnd) => `Tu plan ${plan} está activo. Próxima renovación: ${periodEnd}.`,
  },
  en: {
    subject: (plan) => `${plan} plan activated — NELVYON`,
    pageTitle: (planLabel) => `Welcome to NELVYON ${planLabel}!`,
    headline: (planLabel) => `🎉 Your <span style="color:#6366f1;">${planLabel}</span> plan is active`,
    intro: "You have full access to all NELVYON modules. Follow these 5 steps to get started today:",
    steps: [
      { title: "Complete your profile", desc: "Add your company name and logo." },
      { title: "Import your contacts", desc: "Upload a CSV or connect from your previous CRM." },
      { title: "Create your first campaign", desc: "Email, SMS or WhatsApp — in 2 minutes." },
      { title: "Connect your social channels", desc: "Link Instagram, Facebook, LinkedIn and TikTok." },
      { title: "Set up your first automation", desc: "Workflows that work while you sleep." },
    ],
    renewalPrefix: "Next renewal:",
    cta: "Go to dashboard →",
    helpPrefix: "Need help? Email us at",
    text: (plan, periodEnd) => `Your ${plan} plan is active. Next renewal: ${periodEnd}.`,
  },
  fr: {
    subject: (plan) => `Plan ${plan} activé — NELVYON`,
    pageTitle: (planLabel) => `Bienvenue sur NELVYON ${planLabel} !`,
    headline: (planLabel) => `🎉 Votre plan <span style="color:#6366f1;">${planLabel}</span> est actif`,
    intro: "Vous avez accès à tous les modules NELVYON. Suivez ces 5 étapes pour démarrer dès aujourd'hui :",
    steps: [
      { title: "Complétez votre profil", desc: "Ajoutez le nom de votre entreprise et votre logo." },
      { title: "Importez vos contacts", desc: "Téléversez un CSV ou connectez votre ancien CRM." },
      { title: "Créez votre première campagne", desc: "E-mail, SMS ou WhatsApp — en 2 minutes." },
      { title: "Connectez vos réseaux sociaux", desc: "Liez Instagram, Facebook, LinkedIn et TikTok." },
      { title: "Configurez votre première automatisation", desc: "Des workflows qui travaillent pendant que vous dormez." },
    ],
    renewalPrefix: "Prochain renouvellement :",
    cta: "Aller au tableau de bord →",
    helpPrefix: "Besoin d'aide ? Écrivez-nous à",
    text: (plan, periodEnd) => `Votre plan ${plan} est actif. Prochain renouvellement : ${periodEnd}.`,
  },
  de: {
    subject: (plan) => `Plan ${plan} aktiviert — NELVYON`,
    pageTitle: (planLabel) => `Willkommen bei NELVYON ${planLabel}!`,
    headline: (planLabel) => `🎉 Ihr <span style="color:#6366f1;">${planLabel}</span>-Plan ist aktiv`,
    intro: "Sie haben vollen Zugriff auf alle NELVYON-Module. Folgen Sie diesen 5 Schritten, um heute zu starten:",
    steps: [
      { title: "Profil vervollständigen", desc: "Fügen Sie Firmenname und Logo hinzu." },
      { title: "Kontakte importieren", desc: "CSV hochladen oder aus Ihrem bisherigen CRM verbinden." },
      { title: "Erste Kampagne erstellen", desc: "E-Mail, SMS oder WhatsApp — in 2 Minuten." },
      { title: "Social-Media-Kanäle verbinden", desc: "Instagram, Facebook, LinkedIn und TikTok verknüpfen." },
      { title: "Erste Automatisierung einrichten", desc: "Workflows, die arbeiten, während Sie schlafen." },
    ],
    renewalPrefix: "Nächste Verlängerung:",
    cta: "Zum Dashboard →",
    helpPrefix: "Brauchen Sie Hilfe? Schreiben Sie uns an",
    text: (plan, periodEnd) => `Ihr ${plan}-Plan ist aktiv. Nächste Verlängerung: ${periodEnd}.`,
  },
  it: {
    subject: (plan) => `Piano ${plan} attivato — NELVYON`,
    pageTitle: (planLabel) => `Benvenuto su NELVYON ${planLabel}!`,
    headline: (planLabel) => `🎉 Il tuo piano <span style="color:#6366f1;">${planLabel}</span> è attivo`,
    intro: "Hai accesso completo a tutti i moduli NELVYON. Segui questi 5 passi per iniziare oggi:",
    steps: [
      { title: "Completa il profilo", desc: "Aggiungi nome azienda e logo." },
      { title: "Importa i contatti", desc: "Carica un CSV o collega il CRM precedente." },
      { title: "Crea la prima campagna", desc: "Email, SMS o WhatsApp — in 2 minuti." },
      { title: "Collega i social", desc: "Connetti Instagram, Facebook, LinkedIn e TikTok." },
      { title: "Configura la prima automazione", desc: "Workflow che lavorano mentre dormi." },
    ],
    renewalPrefix: "Prossimo rinnovo:",
    cta: "Vai alla dashboard →",
    helpPrefix: "Serve aiuto? Scrivici a",
    text: (plan, periodEnd) => `Il tuo piano ${plan} è attivo. Prossimo rinnovo: ${periodEnd}.`,
  },
  pt: {
    subject: (plan) => `Plano ${plan} ativado — NELVYON`,
    pageTitle: (planLabel) => `Bem-vindo à NELVYON ${planLabel}!`,
    headline: (planLabel) => `🎉 O seu plano <span style="color:#6366f1;">${planLabel}</span> está ativo`,
    intro: "Tem acesso completo a todos os módulos NELVYON. Siga estes 5 passos para começar hoje:",
    steps: [
      { title: "Complete o perfil", desc: "Adicione o nome da empresa e o logótipo." },
      { title: "Importe os contactos", desc: "Carregue um CSV ou ligue o CRM anterior." },
      { title: "Crie a primeira campanha", desc: "Email, SMS ou WhatsApp — em 2 minutos." },
      { title: "Ligue as redes sociais", desc: "Conecte Instagram, Facebook, LinkedIn e TikTok." },
      { title: "Configure a primeira automação", desc: "Workflows que trabalham enquanto dorme." },
    ],
    renewalPrefix: "Próxima renovação:",
    cta: "Ir para o dashboard →",
    helpPrefix: "Precisa de ajuda? Escreva para",
    text: (plan, periodEnd) => `O seu plano ${plan} está ativo. Próxima renovação: ${periodEnd}.`,
  },
};

const DATA_EXPORT_CONFIRM: Record<EmailLocale, DataExportConfirmCopy> = {
  es: {
    subject: "Has exportado tus datos — NELVYON",
    title: "Copia de tus datos",
    body: (name) =>
      `Hola ${name}, confirmamos que has solicitado y descargado una copia de tus datos personales almacenados en NELVYON (Art. 15 y 20 RGPD).`,
    exportedAtLabel: "Fecha de la exportación:",
    securityNote: "Conserva el archivo JSON en un lugar seguro. Si no fuiste tú, contacta con soporte de inmediato.",
    legalLink: "Legal y privacidad",
    text: (name, exportedAt, appUrl) =>
      `Hola ${name}, adjuntamos confirmación: has descargado una copia de tus datos NELVYON el ${exportedAt}. Más info: ${appUrl}/legal`,
  },
  en: {
    subject: "You exported your data — NELVYON",
    title: "Copy of your data",
    body: (name) =>
      `Hi ${name}, we confirm that you requested and downloaded a copy of your personal data stored in NELVYON (GDPR Arts. 15 and 20).`,
    exportedAtLabel: "Export date:",
    securityNote: "Keep the JSON file in a safe place. If this was not you, contact support immediately.",
    legalLink: "Legal and privacy",
    text: (name, exportedAt, appUrl) =>
      `Hi ${name}, confirmation: you downloaded a copy of your NELVYON data on ${exportedAt}. More info: ${appUrl}/legal`,
  },
  fr: {
    subject: "Vous avez exporté vos données — NELVYON",
    title: "Copie de vos données",
    body: (name) =>
      `Bonjour ${name}, nous confirmons que vous avez demandé et téléchargé une copie de vos données personnelles stockées dans NELVYON (RGPD art. 15 et 20).`,
    exportedAtLabel: "Date de l'export :",
    securityNote: "Conservez le fichier JSON en lieu sûr. Si ce n'était pas vous, contactez le support immédiatement.",
    legalLink: "Mentions légales et confidentialité",
    text: (name, exportedAt, appUrl) =>
      `Bonjour ${name}, confirmation : vous avez téléchargé une copie de vos données NELVYON le ${exportedAt}. Plus d'infos : ${appUrl}/legal`,
  },
  de: {
    subject: "Sie haben Ihre Daten exportiert — NELVYON",
    title: "Kopie Ihrer Daten",
    body: (name) =>
      `Hallo ${name}, wir bestätigen, dass Sie eine Kopie Ihrer in NELVYON gespeicherten personenbezogenen Daten angefordert und heruntergeladen haben (DSGVO Art. 15 und 20).`,
    exportedAtLabel: "Exportdatum:",
    securityNote: "Bewahren Sie die JSON-Datei sicher auf. Wenn Sie das nicht waren, kontaktieren Sie sofort den Support.",
    legalLink: "Rechtliches und Datenschutz",
    text: (name, exportedAt, appUrl) =>
      `Hallo ${name}, Bestätigung: Sie haben am ${exportedAt} eine Kopie Ihrer NELVYON-Daten heruntergeladen. Mehr Info: ${appUrl}/legal`,
  },
  it: {
    subject: "Hai esportato i tuoi dati — NELVYON",
    title: "Copia dei tuoi dati",
    body: (name) =>
      `Ciao ${name}, confermiamo che hai richiesto e scaricato una copia dei tuoi dati personali conservati in NELVYON (GDPR artt. 15 e 20).`,
    exportedAtLabel: "Data dell'export:",
    securityNote: "Conserva il file JSON in un luogo sicuro. Se non sei stato tu, contatta subito il supporto.",
    legalLink: "Legale e privacy",
    text: (name, exportedAt, appUrl) =>
      `Ciao ${name}, conferma: hai scaricato una copia dei tuoi dati NELVYON il ${exportedAt}. Info: ${appUrl}/legal`,
  },
  pt: {
    subject: "Exportou os seus dados — NELVYON",
    title: "Cópia dos seus dados",
    body: (name) =>
      `Olá ${name}, confirmamos que solicitou e descarregou uma cópia dos seus dados pessoais armazenados na NELVYON (RGPD arts. 15 e 20).`,
    exportedAtLabel: "Data da exportação:",
    securityNote: "Guarde o ficheiro JSON num local seguro. Se não foi você, contacte o suporte de imediato.",
    legalLink: "Legal e privacidade",
    text: (name, exportedAt, appUrl) =>
      `Olá ${name}, confirmação: descarregou uma cópia dos seus dados NELVYON em ${exportedAt}. Mais info: ${appUrl}/legal`,
  },
};

const ACCOUNT_DELETED: Record<EmailLocale, AccountDeletedCopy> = {
  es: {
    subject: "Tu cuenta NELVYON ha sido eliminada",
    title: "Cuenta solicitada para eliminación",
    greeting: (name) => `Hola ${name}, tu cuenta NELVYON ha sido procesada según tu solicitud.`,
    retentionNote:
      "Los registros necesarios por obligaciones legales y fiscales (pago, facturación) se conservan el tiempo legal aplicable, anonimizados o separados de tu cuenta personal cuando proceda.",
    defaultSummary:
      "Tu perfil ha sido anonimizado y el acceso desactivado. Los resultados de agentes marcados pasan a retención de 30 días antes de su eliminación. Los datos relativos a facturación se conservan el plazo legal sin vincularse a tu cuenta activa.",
    text: (summary) => `Tu cuenta NELVYON ha sido solicitada para eliminación. ${summary}`,
  },
  en: {
    subject: "Your NELVYON account has been deleted",
    title: "Account scheduled for deletion",
    greeting: (name) => `Hi ${name}, your NELVYON account has been processed as requested.`,
    retentionNote:
      "Records required for legal and tax obligations (payments, invoicing) are retained for the applicable legal period, anonymized or separated from your personal account where appropriate.",
    defaultSummary:
      "Your profile has been anonymized and access disabled. Marked agent results enter a 30-day retention window before deletion. Billing-related data is retained for the legal period without linking to your active account.",
    text: (summary) => `Your NELVYON account deletion was requested. ${summary}`,
  },
  fr: {
    subject: "Votre compte NELVYON a été supprimé",
    title: "Compte demandé pour suppression",
    greeting: (name) => `Bonjour ${name}, votre compte NELVYON a été traité conformément à votre demande.`,
    retentionNote:
      "Les enregistrements requis pour les obligations légales et fiscales (paiements, facturation) sont conservés pendant la durée légale applicable, anonymisés ou séparés de votre compte personnel le cas échéant.",
    defaultSummary:
      "Votre profil a été anonymisé et l'accès désactivé. Les résultats d'agents marqués passent en rétention de 30 jours avant suppression. Les données de facturation sont conservées pour la durée légale sans lien avec votre compte actif.",
    text: (summary) => `La suppression de votre compte NELVYON a été demandée. ${summary}`,
  },
  de: {
    subject: "Ihr NELVYON-Konto wurde gelöscht",
    title: "Konto zur Löschung vorgemerkt",
    greeting: (name) => `Hallo ${name}, Ihr NELVYON-Konto wurde gemäß Ihrer Anfrage verarbeitet.`,
    retentionNote:
      "Für gesetzliche und steuerliche Pflichten erforderliche Aufzeichnungen (Zahlungen, Rechnungen) werden für die geltende gesetzliche Frist aufbewahrt, anonymisiert oder von Ihrem persönlichen Konto getrennt, sofern zutreffend.",
    defaultSummary:
      "Ihr Profil wurde anonymisiert und der Zugang deaktiviert. Markierte Agentenergebnisse gehen in eine 30-tägige Aufbewahrung vor der Löschung. Abrechnungsdaten werden für die gesetzliche Frist ohne Verknüpfung zu Ihrem aktiven Konto aufbewahrt.",
    text: (summary) => `Die Löschung Ihres NELVYON-Kontos wurde angefordert. ${summary}`,
  },
  it: {
    subject: "Il tuo account NELVYON è stato eliminato",
    title: "Account richiesto per l'eliminazione",
    greeting: (name) => `Ciao ${name}, il tuo account NELVYON è stato elaborato come richiesto.`,
    retentionNote:
      "I registri necessari per obblighi legali e fiscali (pagamenti, fatturazione) sono conservati per il periodo legale applicabile, anonimizzati o separati dal tuo account personale quando appropriato.",
    defaultSummary:
      "Il tuo profilo è stato anonimizzato e l'accesso disattivato. I risultati degli agent contrassegnati passano a una retention di 30 giorni prima dell'eliminazione. I dati di fatturazione sono conservati per il periodo legale senza collegamento al tuo account attivo.",
    text: (summary) => `L'eliminazione del tuo account NELVYON è stata richiesta. ${summary}`,
  },
  pt: {
    subject: "A sua conta NELVYON foi eliminada",
    title: "Conta solicitada para eliminação",
    greeting: (name) => `Olá ${name}, a sua conta NELVYON foi processada conforme o pedido.`,
    retentionNote:
      "Os registos necessários por obrigações legais e fiscais (pagamentos, faturação) são conservados pelo período legal aplicável, anonimizados ou separados da sua conta pessoal quando aplicável.",
    defaultSummary:
      "O seu perfil foi anonimizado e o acesso desativado. Os resultados de agentes marcados passam a retenção de 30 dias antes da eliminação. Os dados de faturação são conservados pelo prazo legal sem vínculo à sua conta ativa.",
    text: (summary) => `A eliminação da sua conta NELVYON foi solicitada. ${summary}`,
  },
};

const NPS_THANK_YOU: Record<EmailLocale, NpsThankYouCopy> = {
  es: {
    subject: "Gracias por tu feedback — NELVYON",
    title: (name) => `¡Gracias, ${name}!`,
    body: (score) =>
      `Hemos recibido tu valoración <strong style="color:#f4f4f5;">${score}/10</strong>. Tu opinión hace que NELVYON sea mejor cada día.`,
    commentNote: "Si dejaste un comentario, nuestro equipo lo revisará para priorizar mejoras en el producto.",
    cta: "Volver al dashboard →",
    text: (name, score) =>
      `Hola ${name}, gracias por valorar NELVYON con ${score}/10. Tu opinión nos ayuda a mejorar cada día.`,
  },
  en: {
    subject: "Thanks for your feedback — NELVYON",
    title: (name) => `Thank you, ${name}!`,
    body: (score) =>
      `We received your rating of <strong style="color:#f4f4f5;">${score}/10</strong>. Your feedback helps make NELVYON better every day.`,
    commentNote: "If you left a comment, our team will review it to prioritize product improvements.",
    cta: "Back to dashboard →",
    text: (name, score) =>
      `Hi ${name}, thanks for rating NELVYON ${score}/10. Your feedback helps us improve every day.`,
  },
  fr: {
    subject: "Merci pour votre avis — NELVYON",
    title: (name) => `Merci, ${name} !`,
    body: (score) =>
      `Nous avons reçu votre note de <strong style="color:#f4f4f5;">${score}/10</strong>. Votre avis rend NELVYON meilleur chaque jour.`,
    commentNote: "Si vous avez laissé un commentaire, notre équipe l'examinera pour prioriser les améliorations.",
    cta: "Retour au tableau de bord →",
    text: (name, score) =>
      `Bonjour ${name}, merci d'avoir noté NELVYON ${score}/10. Votre avis nous aide à nous améliorer.`,
  },
  de: {
    subject: "Danke für Ihr Feedback — NELVYON",
    title: (name) => `Danke, ${name}!`,
    body: (score) =>
      `Wir haben Ihre Bewertung <strong style="color:#f4f4f5;">${score}/10</strong> erhalten. Ihr Feedback macht NELVYON jeden Tag besser.`,
    commentNote: "Wenn Sie einen Kommentar hinterlassen haben, prüft unser Team ihn zur Priorisierung von Verbesserungen.",
    cta: "Zurück zum Dashboard →",
    text: (name, score) =>
      `Hallo ${name}, danke für Ihre NELVYON-Bewertung ${score}/10. Ihr Feedback hilft uns, uns zu verbessern.`,
  },
  it: {
    subject: "Grazie per il feedback — NELVYON",
    title: (name) => `Grazie, ${name}!`,
    body: (score) =>
      `Abbiamo ricevuto la tua valutazione <strong style="color:#f4f4f5;">${score}/10</strong>. La tua opinione rende NELVYON migliore ogni giorno.`,
    commentNote: "Se hai lasciato un commento, il nostro team lo esaminerà per prioritizzare i miglioramenti.",
    cta: "Torna alla dashboard →",
    text: (name, score) =>
      `Ciao ${name}, grazie per aver valutato NELVYON ${score}/10. La tua opinione ci aiuta a migliorare.`,
  },
  pt: {
    subject: "Obrigado pelo seu feedback — NELVYON",
    title: (name) => `Obrigado, ${name}!`,
    body: (score) =>
      `Recebemos a sua avaliação de <strong style="color:#f4f4f5;">${score}/10</strong>. A sua opinião torna a NELVYON melhor todos os dias.`,
    commentNote: "Se deixou um comentário, a nossa equipa irá revê-lo para priorizar melhorias no produto.",
    cta: "Voltar ao dashboard →",
    text: (name, score) =>
      `Olá ${name}, obrigado por avaliar a NELVYON com ${score}/10. A sua opinião ajuda-nos a melhorar.`,
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

export function getInvoiceSesCopy(locale?: string | null): InvoiceSesCopy {
  return INVOICE_SES[resolveEmailLocale(locale)];
}

export function getEmailVerifyCopy(locale?: string | null): EmailVerifyCopy {
  return EMAIL_VERIFY[resolveEmailLocale(locale)];
}

export function getPlanActivatedCopy(locale?: string | null): PlanActivatedCopy {
  return PLAN_ACTIVATED[resolveEmailLocale(locale)];
}

export function getPlanActivatedStepPaths(): readonly string[] {
  return PLAN_STEP_PATHS;
}

export function getDataExportConfirmCopy(locale?: string | null): DataExportConfirmCopy {
  return DATA_EXPORT_CONFIRM[resolveEmailLocale(locale)];
}

export function getAccountDeletedCopy(locale?: string | null): AccountDeletedCopy {
  return ACCOUNT_DELETED[resolveEmailLocale(locale)];
}

export function getNpsThankYouCopy(locale?: string | null): NpsThankYouCopy {
  return NPS_THANK_YOU[resolveEmailLocale(locale)];
}

export type EmailChromeCopy = {
  rightsReserved: string;
  legal: string;
};

const EMAIL_CHROME: Record<EmailLocale, EmailChromeCopy> = {
  es: { rightsReserved: "Todos los derechos reservados", legal: "Legal" },
  en: { rightsReserved: "All rights reserved", legal: "Legal" },
  fr: { rightsReserved: "Tous droits réservés", legal: "Mentions légales" },
  de: { rightsReserved: "Alle Rechte vorbehalten", legal: "Rechtliches" },
  it: { rightsReserved: "Tutti i diritti riservati", legal: "Legale" },
  pt: { rightsReserved: "Todos os direitos reservados", legal: "Legal" },
};

export function getEmailChromeCopy(locale?: string | null): EmailChromeCopy {
  return EMAIL_CHROME[resolveEmailLocale(locale)];
}
