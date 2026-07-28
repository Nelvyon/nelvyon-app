/**
 * Locale copy for billing dunning + cancellation lifecycle emails.
 * Completes PARTIAL gap documented in docs/ops/EMAIL_PDF_LOCALE_PARTIAL.md.
 * Legal/tax nuance remains HUMAN_REVIEW for PDF bodies — these are operational notices.
 */
import { resolveEmailLocale, type EmailLocale } from "../email/localeCopy";

export type BillingLifecycleCopy = {
  paymentFailed: {
    subject: string;
    greeting: (name: string) => string;
    body: (plan: string) => string;
    note: string;
    cta: string;
    text: (name: string, plan: string, url: string) => string;
  };
  secondNotice: {
    subject: string;
    greeting: (name: string) => string;
    body: (daysLeft: number) => string;
    cta: string;
    text: (name: string, daysLeft: number, url: string) => string;
  };
  finalWarning: {
    subject: string;
    greeting: (name: string) => string;
    body: string;
    cta: string;
    text: (name: string, url: string) => string;
  };
  suspension: {
    subject: string;
    greeting: (name: string) => string;
    body: string;
    cta: string;
    text: (name: string, url: string) => string;
  };
  reactivation: {
    subject: string;
    greeting: (name: string) => string;
    body: (plan: string) => string;
    cta: string;
    text: (name: string, plan: string, dash: string) => string;
  };
  cancellationScheduled: {
    subject: string;
    greeting: (name: string) => string;
    body: (plan: string, periodEnd: string) => string;
    note: string;
    cta: string;
    text: (name: string, plan: string, periodEnd: string, url: string) => string;
  };
  offboarding: {
    subject: string;
    greeting: (name: string) => string;
    body: string;
    retention: string;
    ctaExport: string;
    ctaBack: string;
    text: (name: string, exportUrl: string, pricingUrl: string) => string;
  };
};

const COPY: Record<EmailLocale, BillingLifecycleCopy> = {
  es: {
    paymentFailed: {
      subject: "Tu pago no se ha procesado — NELVYON",
      greeting: (n) => `Hola, ${n}`,
      body: (plan) =>
        `No hemos podido cobrar tu plan <strong style="color:#f4f4f5;">${plan}</strong>. Tu acceso sigue activo durante 7 días mientras actualizas el método de pago.`,
      note: "Se reintentará el cobro automáticamente. Si prefieres, puedes actualizar tu tarjeta ahora.",
      cta: "Actualizar método de pago",
      text: (n, plan, url) =>
        `Hola ${n}, no hemos podido cobrar tu plan ${plan}. Tienes 7 días de gracia. Actualiza tu pago: ${url}`,
    },
    secondNotice: {
      subject: "Segundo aviso — actualiza tu método de pago — NELVYON",
      greeting: (n) => `Segundo aviso, ${n}`,
      body: (d) =>
        `El segundo intento de cobro no se ha completado. Te quedan <strong style="color:#f59e0b;">${d} días</strong> antes de que suspendamos el acceso a los agentes.`,
      cta: "Actualizar método de pago",
      text: (n, d, url) => `Hola ${n}, segundo aviso de pago. Quedan ${d} días. Actualiza: ${url}`,
    },
    finalWarning: {
      subject: "Tu cuenta se suspende mañana — NELVYON",
      greeting: (n) => `Último aviso, ${n}`,
      body: "Mañana suspenderemos el acceso a la ejecución de agentes si no recibimos el pago. Podrás seguir viendo tu dashboard, pero no podrás lanzar agentes hasta reactivar.",
      cta: "Actualizar ahora",
      text: (n, url) => `Hola ${n}, tu cuenta se suspende mañana si no actualizas el pago: ${url}`,
    },
    suspension: {
      subject: "Tu cuenta ha sido suspendida — NELVYON",
      greeting: (n) => `Cuenta suspendida, ${n}`,
      body: "Hemos suspendido el acceso a los agentes por impago. Puedes consultar tu dashboard, pero necesitas reactivar la suscripción para volver a ejecutar agentes.",
      cta: "Reactivar suscripción",
      text: (n, url) => `Hola ${n}, tu cuenta está suspendida. Reactiva en: ${url}`,
    },
    reactivation: {
      subject: "Suscripción reactivada — NELVYON",
      greeting: (n) => `¡Bienvenido de nuevo, ${n}!`,
      body: (plan) =>
        `Tu plan <strong style="color:#6366f1;">${plan}</strong> está activo de nuevo. Ya puedes ejecutar todos tus agentes.`,
      cta: "Ir al dashboard",
      text: (n, plan, dash) => `Hola ${n}, tu plan ${plan} está activo de nuevo. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "Tu suscripción se cancelará al final del periodo — NELVYON",
      greeting: (n) => `Hola, ${n}`,
      body: (plan, end) =>
        `Hemos recibido tu solicitud de cancelación del plan <strong style="color:#f4f4f5;">${plan}</strong>. Seguirás teniendo acceso completo hasta el <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "Si cambias de opinión antes de esa fecha, puedes reactivar tu suscripción en un clic.",
      cta: "Gestionar suscripción",
      text: (n, plan, end, url) =>
        `Hola ${n}, tu plan ${plan} se cancelará el ${end}. Acceso completo hasta entonces. Reactivar: ${url}`,
    },
    offboarding: {
      subject: "Gracias por haber usado NELVYON",
      greeting: (n) => `Gracias, ${n}`,
      body: "Tu suscripción ha finalizado. Ha sido un placer acompañarte.",
      retention:
        'Tus datos permanecerán disponibles durante <strong style="color:#f4f4f5;">30 días</strong> por si necesitas exportarlos. Después se eliminarán de forma automática conforme al RGPD.',
      ctaExport: "Ver mis datos",
      ctaBack: "Volver a NELVYON",
      text: (n, exp, price) =>
        `Gracias ${n}. Tus datos estarán disponibles 30 días: ${exp}. Volver: ${price}`,
    },
  },
  en: {
    paymentFailed: {
      subject: "Your payment could not be processed — NELVYON",
      greeting: (n) => `Hi, ${n}`,
      body: (plan) =>
        `We could not charge your <strong style="color:#f4f4f5;">${plan}</strong> plan. Access stays active for 7 days while you update your payment method.`,
      note: "We will retry the charge automatically. You can update your card now if you prefer.",
      cta: "Update payment method",
      text: (n, plan, url) =>
        `Hi ${n}, we could not charge your ${plan} plan. You have 7 days of grace. Update payment: ${url}`,
    },
    secondNotice: {
      subject: "Second notice — update your payment method — NELVYON",
      greeting: (n) => `Second notice, ${n}`,
      body: (d) =>
        `The second charge attempt failed. You have <strong style="color:#f59e0b;">${d} days</strong> before we suspend agent access.`,
      cta: "Update payment method",
      text: (n, d, url) => `Hi ${n}, second payment notice. ${d} days left. Update: ${url}`,
    },
    finalWarning: {
      subject: "Your account suspends tomorrow — NELVYON",
      greeting: (n) => `Final warning, ${n}`,
      body: "Tomorrow we will suspend agent execution if payment is not received. You can still view your dashboard, but you will not be able to run agents until you reactivate.",
      cta: "Update now",
      text: (n, url) => `Hi ${n}, your account suspends tomorrow unless you update payment: ${url}`,
    },
    suspension: {
      subject: "Your account has been suspended — NELVYON",
      greeting: (n) => `Account suspended, ${n}`,
      body: "We suspended agent access due to non-payment. You can view your dashboard, but you need to reactivate your subscription to run agents again.",
      cta: "Reactivate subscription",
      text: (n, url) => `Hi ${n}, your account is suspended. Reactivate at: ${url}`,
    },
    reactivation: {
      subject: "Subscription reactivated — NELVYON",
      greeting: (n) => `Welcome back, ${n}!`,
      body: (plan) =>
        `Your <strong style="color:#6366f1;">${plan}</strong> plan is active again. You can run all your agents.`,
      cta: "Go to dashboard",
      text: (n, plan, dash) => `Hi ${n}, your ${plan} plan is active again. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "Your subscription will cancel at period end — NELVYON",
      greeting: (n) => `Hi, ${n}`,
      body: (plan, end) =>
        `We received your cancellation request for <strong style="color:#f4f4f5;">${plan}</strong>. You keep full access until <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "If you change your mind before then, you can reactivate in one click.",
      cta: "Manage subscription",
      text: (n, plan, end, url) =>
        `Hi ${n}, your ${plan} plan cancels on ${end}. Full access until then. Reactivate: ${url}`,
    },
    offboarding: {
      subject: "Thank you for using NELVYON",
      greeting: (n) => `Thank you, ${n}`,
      body: "Your subscription has ended. It has been a pleasure working with you.",
      retention:
        'Your data remains available for <strong style="color:#f4f4f5;">30 days</strong> if you need to export it. It will then be deleted automatically under GDPR.',
      ctaExport: "View my data",
      ctaBack: "Back to NELVYON",
      text: (n, exp, price) =>
        `Thank you ${n}. Your data is available for 30 days: ${exp}. Return: ${price}`,
    },
  },
  fr: {
    paymentFailed: {
      subject: "Votre paiement n'a pas pu être traité — NELVYON",
      greeting: (n) => `Bonjour, ${n}`,
      body: (plan) =>
        `Nous n'avons pas pu facturer votre plan <strong style="color:#f4f4f5;">${plan}</strong>. Votre accès reste actif 7 jours le temps de mettre à jour votre moyen de paiement.`,
      note: "Nous réessaierons automatiquement. Vous pouvez aussi mettre à jour votre carte maintenant.",
      cta: "Mettre à jour le moyen de paiement",
      text: (n, plan, url) =>
        `Bonjour ${n}, impossible de facturer le plan ${plan}. 7 jours de grâce. Mettez à jour: ${url}`,
    },
    secondNotice: {
      subject: "Deuxième avis — mettez à jour votre paiement — NELVYON",
      greeting: (n) => `Deuxième avis, ${n}`,
      body: (d) =>
        `La deuxième tentative a échoué. Il vous reste <strong style="color:#f59e0b;">${d} jours</strong> avant suspension des agents.`,
      cta: "Mettre à jour le moyen de paiement",
      text: (n, d, url) => `Bonjour ${n}, 2e avis. ${d} jours restants. Mettez à jour: ${url}`,
    },
    finalWarning: {
      subject: "Votre compte sera suspendu demain — NELVYON",
      greeting: (n) => `Dernier avis, ${n}`,
      body: "Demain nous suspendrons l'exécution des agents sans paiement. Le tableau de bord restera visible, mais pas les agents.",
      cta: "Mettre à jour maintenant",
      text: (n, url) => `Bonjour ${n}, suspension demain sans mise à jour: ${url}`,
    },
    suspension: {
      subject: "Votre compte a été suspendu — NELVYON",
      greeting: (n) => `Compte suspendu, ${n}`,
      body: "Accès agents suspendu pour impayé. Dashboard consultable; réactivez pour exécuter des agents.",
      cta: "Réactiver l'abonnement",
      text: (n, url) => `Bonjour ${n}, compte suspendu. Réactivez: ${url}`,
    },
    reactivation: {
      subject: "Abonnement réactivé — NELVYON",
      greeting: (n) => `Bon retour, ${n}!`,
      body: (plan) =>
        `Votre plan <strong style="color:#6366f1;">${plan}</strong> est de nouveau actif.`,
      cta: "Aller au tableau de bord",
      text: (n, plan, dash) => `Bonjour ${n}, plan ${plan} actif. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "Votre abonnement sera annulé en fin de période — NELVYON",
      greeting: (n) => `Bonjour, ${n}`,
      body: (plan, end) =>
        `Demande d'annulation du plan <strong style="color:#f4f4f5;">${plan}</strong> reçue. Accès jusqu'au <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "Vous pouvez réactiver en un clic avant cette date.",
      cta: "Gérer l'abonnement",
      text: (n, plan, end, url) =>
        `Bonjour ${n}, plan ${plan} annulé le ${end}. Réactiver: ${url}`,
    },
    offboarding: {
      subject: "Merci d'avoir utilisé NELVYON",
      greeting: (n) => `Merci, ${n}`,
      body: "Votre abonnement est terminé.",
      retention:
        'Vos données restent disponibles <strong style="color:#f4f4f5;">30 jours</strong> pour export, puis suppression RGPD.',
      ctaExport: "Voir mes données",
      ctaBack: "Retour à NELVYON",
      text: (n, exp, price) => `Merci ${n}. Données 30 jours: ${exp}. Retour: ${price}`,
    },
  },
  de: {
    paymentFailed: {
      subject: "Ihre Zahlung konnte nicht verarbeitet werden — NELVYON",
      greeting: (n) => `Hallo, ${n}`,
      body: (plan) =>
        `Wir konnten Ihren Plan <strong style="color:#f4f4f5;">${plan}</strong> nicht abbuchen. Zugang bleibt 7 Tage aktiv, während Sie die Zahlungsmethode aktualisieren.`,
      note: "Wir versuchen die Abbuchung automatisch erneut. Sie können die Karte jetzt aktualisieren.",
      cta: "Zahlungsmethode aktualisieren",
      text: (n, plan, url) =>
        `Hallo ${n}, Plan ${plan} nicht abgebucht. 7 Tage Frist. Aktualisieren: ${url}`,
    },
    secondNotice: {
      subject: "Zweite Mahnung — Zahlungsmethode aktualisieren — NELVYON",
      greeting: (n) => `Zweite Mahnung, ${n}`,
      body: (d) =>
        `Zweiter Versuch fehlgeschlagen. Noch <strong style="color:#f59e0b;">${d} Tage</strong> bis zur Agenten-Sperre.`,
      cta: "Zahlungsmethode aktualisieren",
      text: (n, d, url) => `Hallo ${n}, 2. Mahnung. ${d} Tage. Aktualisieren: ${url}`,
    },
    finalWarning: {
      subject: "Ihr Konto wird morgen gesperrt — NELVYON",
      greeting: (n) => `Letzte Warnung, ${n}`,
      body: "Morgen sperren wir die Agentenausführung ohne Zahlung. Dashboard bleibt sichtbar.",
      cta: "Jetzt aktualisieren",
      text: (n, url) => `Hallo ${n}, Sperre morgen ohne Update: ${url}`,
    },
    suspension: {
      subject: "Ihr Konto wurde gesperrt — NELVYON",
      greeting: (n) => `Konto gesperrt, ${n}`,
      body: "Agentenzugriff wegen Zahlungsverzug gesperrt. Reaktivieren Sie das Abo für Agenten.",
      cta: "Abo reaktivieren",
      text: (n, url) => `Hallo ${n}, Konto gesperrt. Reaktivieren: ${url}`,
    },
    reactivation: {
      subject: "Abo reaktiviert — NELVYON",
      greeting: (n) => `Willkommen zurück, ${n}!`,
      body: (plan) =>
        `Ihr Plan <strong style="color:#6366f1;">${plan}</strong> ist wieder aktiv.`,
      cta: "Zum Dashboard",
      text: (n, plan, dash) => `Hallo ${n}, Plan ${plan} aktiv. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "Ihr Abo endet zum Periodenende — NELVYON",
      greeting: (n) => `Hallo, ${n}`,
      body: (plan, end) =>
        `Kündigung für <strong style="color:#f4f4f5;">${plan}</strong> erhalten. Voller Zugang bis <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "Sie können vor diesem Datum mit einem Klick reaktivieren.",
      cta: "Abo verwalten",
      text: (n, plan, end, url) =>
        `Hallo ${n}, Plan ${plan} endet am ${end}. Reaktivieren: ${url}`,
    },
    offboarding: {
      subject: "Danke, dass Sie NELVYON genutzt haben",
      greeting: (n) => `Danke, ${n}`,
      body: "Ihr Abo ist beendet.",
      retention:
        'Daten bleiben <strong style="color:#f4f4f5;">30 Tage</strong> exportierbar, danach DSGVO-Löschung.',
      ctaExport: "Meine Daten ansehen",
      ctaBack: "Zurück zu NELVYON",
      text: (n, exp, price) => `Danke ${n}. Daten 30 Tage: ${exp}. Zurück: ${price}`,
    },
  },
  it: {
    paymentFailed: {
      subject: "Il pagamento non è stato elaborato — NELVYON",
      greeting: (n) => `Ciao, ${n}`,
      body: (plan) =>
        `Non siamo riusciti ad addebitare il piano <strong style="color:#f4f4f5;">${plan}</strong>. L'accesso resta attivo 7 giorni mentre aggiorni il metodo di pagamento.`,
      note: "Ritentiamo automaticamente. Puoi aggiornare la carta ora.",
      cta: "Aggiorna metodo di pagamento",
      text: (n, plan, url) =>
        `Ciao ${n}, addebito piano ${plan} fallito. 7 giorni di grazia. Aggiorna: ${url}`,
    },
    secondNotice: {
      subject: "Secondo avviso — aggiorna il pagamento — NELVYON",
      greeting: (n) => `Secondo avviso, ${n}`,
      body: (d) =>
        `Secondo tentativo fallito. Ti restano <strong style="color:#f59e0b;">${d} giorni</strong> prima della sospensione degli agenti.`,
      cta: "Aggiorna metodo di pagamento",
      text: (n, d, url) => `Ciao ${n}, 2° avviso. ${d} giorni. Aggiorna: ${url}`,
    },
    finalWarning: {
      subject: "L'account sarà sospeso domani — NELVYON",
      greeting: (n) => `Ultimo avviso, ${n}`,
      body: "Domani sospendiamo l'esecuzione agenti senza pagamento. La dashboard resta visibile.",
      cta: "Aggiorna ora",
      text: (n, url) => `Ciao ${n}, sospensione domani senza aggiornamento: ${url}`,
    },
    suspension: {
      subject: "Il tuo account è stato sospeso — NELVYON",
      greeting: (n) => `Account sospeso, ${n}`,
      body: "Accesso agenti sospeso per mancato pagamento. Riattiva l'abbonamento per eseguire agenti.",
      cta: "Riattiva abbonamento",
      text: (n, url) => `Ciao ${n}, account sospeso. Riattiva: ${url}`,
    },
    reactivation: {
      subject: "Abbonamento riattivato — NELVYON",
      greeting: (n) => `Bentornato, ${n}!`,
      body: (plan) =>
        `Il piano <strong style="color:#6366f1;">${plan}</strong> è di nuovo attivo.`,
      cta: "Vai alla dashboard",
      text: (n, plan, dash) => `Ciao ${n}, piano ${plan} attivo. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "L'abbonamento terminerà a fine periodo — NELVYON",
      greeting: (n) => `Ciao, ${n}`,
      body: (plan, end) =>
        `Richiesta di cancellazione del piano <strong style="color:#f4f4f5;">${plan}</strong> ricevuta. Accesso fino al <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "Puoi riattivare con un clic prima di quella data.",
      cta: "Gestisci abbonamento",
      text: (n, plan, end, url) =>
        `Ciao ${n}, piano ${plan} termina il ${end}. Riattiva: ${url}`,
    },
    offboarding: {
      subject: "Grazie per aver usato NELVYON",
      greeting: (n) => `Grazie, ${n}`,
      body: "Il tuo abbonamento è terminato.",
      retention:
        'I dati restano disponibili <strong style="color:#f4f4f5;">30 giorni</strong> per export, poi cancellazione GDPR.',
      ctaExport: "Vedi i miei dati",
      ctaBack: "Torna a NELVYON",
      text: (n, exp, price) => `Grazie ${n}. Dati 30 giorni: ${exp}. Torna: ${price}`,
    },
  },
  pt: {
    paymentFailed: {
      subject: "O seu pagamento não foi processado — NELVYON",
      greeting: (n) => `Olá, ${n}`,
      body: (plan) =>
        `Não foi possível cobrar o plano <strong style="color:#f4f4f5;">${plan}</strong>. O acesso mantém-se 7 dias enquanto atualiza o método de pagamento.`,
      note: "Vamos tentar novamente automaticamente. Pode atualizar o cartão agora.",
      cta: "Atualizar método de pagamento",
      text: (n, plan, url) =>
        `Olá ${n}, cobrança do plano ${plan} falhou. 7 dias de carência. Atualize: ${url}`,
    },
    secondNotice: {
      subject: "Segundo aviso — atualize o pagamento — NELVYON",
      greeting: (n) => `Segundo aviso, ${n}`,
      body: (d) =>
        `A segunda tentativa falhou. Restam <strong style="color:#f59e0b;">${d} dias</strong> antes de suspendermos os agentes.`,
      cta: "Atualizar método de pagamento",
      text: (n, d, url) => `Olá ${n}, 2.º aviso. ${d} dias. Atualize: ${url}`,
    },
    finalWarning: {
      subject: "A sua conta suspende amanhã — NELVYON",
      greeting: (n) => `Último aviso, ${n}`,
      body: "Amanhã suspendemos a execução de agentes sem pagamento. O dashboard continua visível.",
      cta: "Atualizar agora",
      text: (n, url) => `Olá ${n}, suspensão amanhã sem atualização: ${url}`,
    },
    suspension: {
      subject: "A sua conta foi suspensa — NELVYON",
      greeting: (n) => `Conta suspensa, ${n}`,
      body: "Acesso a agentes suspenso por falta de pagamento. Reative a subscrição para executar agentes.",
      cta: "Reativar subscrição",
      text: (n, url) => `Olá ${n}, conta suspensa. Reative: ${url}`,
    },
    reactivation: {
      subject: "Subscrição reativada — NELVYON",
      greeting: (n) => `Bem-vindo de volta, ${n}!`,
      body: (plan) =>
        `O plano <strong style="color:#6366f1;">${plan}</strong> está ativo novamente.`,
      cta: "Ir ao dashboard",
      text: (n, plan, dash) => `Olá ${n}, plano ${plan} ativo. Dashboard: ${dash}`,
    },
    cancellationScheduled: {
      subject: "A sua subscrição termina no fim do período — NELVYON",
      greeting: (n) => `Olá, ${n}`,
      body: (plan, end) =>
        `Pedido de cancelamento do plano <strong style="color:#f4f4f5;">${plan}</strong> recebido. Acesso até <strong style="color:#f4f4f5;">${end}</strong>.`,
      note: "Pode reativar com um clique antes dessa data.",
      cta: "Gerir subscrição",
      text: (n, plan, end, url) =>
        `Olá ${n}, plano ${plan} termina em ${end}. Reativar: ${url}`,
    },
    offboarding: {
      subject: "Obrigado por usar a NELVYON",
      greeting: (n) => `Obrigado, ${n}`,
      body: "A sua subscrição terminou.",
      retention:
        'Os dados ficam disponíveis <strong style="color:#f4f4f5;">30 dias</strong> para exportação; depois eliminação RGPD.',
      ctaExport: "Ver os meus dados",
      ctaBack: "Voltar à NELVYON",
      text: (n, exp, price) => `Obrigado ${n}. Dados 30 dias: ${exp}. Voltar: ${price}`,
    },
  },
};

export function getBillingLifecycleCopy(locale?: string | null): BillingLifecycleCopy {
  return COPY[resolveEmailLocale(locale)];
}

export function billingHtmlLang(locale?: string | null): string {
  return resolveEmailLocale(locale);
}
