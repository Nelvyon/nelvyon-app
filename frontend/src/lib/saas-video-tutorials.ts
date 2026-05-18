import {
  LayoutDashboard, Users, Target, Mail, Megaphone, Layers, Share2,
  HeadphonesIcon, MessageSquare, Phone, Workflow, Bot, Calendar,
  FileText, Database, Globe, Palette, BookOpen, ShoppingCart,
  CreditCard, BarChart3, PieChart, Handshake, Settings,
  MousePointer, CheckCircle, ArrowRight, Zap, Eye, Edit3,
  Download, Upload, Filter, Search, Bell, Lock, Star,
  type LucideIcon,
} from "lucide-react";

export interface TutorialStep {
  title: Record<string, string>;
  description: Record<string, string>;
  icon: LucideIcon;
  highlight: string; // CSS gradient for the step visual
  animationType: "click" | "type" | "drag" | "scroll" | "toggle" | "select";
  duration: number; // seconds for this step
}

export interface SectionTutorial {
  sectionId: string;
  sectionName: Record<string, string>;
  icon: LucideIcon;
  color: string;
  gradient: string;
  totalDuration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: TutorialStep[];
}

/* ─── Helper for multi-lang text ─── */
function t(es: string, en: string, pt: string, fr: string, de: string): Record<string, string> {
  return { es, en, pt, fr, de };
}

export const sectionTutorials: SectionTutorial[] = [
  {
    sectionId: "dashboard",
    sectionName: t("Dashboard", "Dashboard", "Dashboard", "Tableau de bord", "Dashboard"),
    icon: LayoutDashboard,
    color: "#3B82F6",
    gradient: "from-blue-500 to-indigo-600",
    totalDuration: "2:30",
    difficulty: "beginner",
    steps: [
      {
        title: t("Accede al Dashboard", "Access the Dashboard", "Acesse o Dashboard", "Accédez au tableau de bord", "Zugriff auf das Dashboard"),
        description: t(
          "Haz clic en 'Dashboard' en el menú lateral izquierdo. Verás un resumen completo de tu negocio con métricas en tiempo real.",
          "Click 'Dashboard' in the left sidebar menu. You'll see a complete overview of your business with real-time metrics.",
          "Clique em 'Dashboard' no menu lateral esquerdo. Você verá um resumo completo do seu negócio com métricas em tempo real.",
          "Cliquez sur 'Tableau de bord' dans le menu latéral gauche. Vous verrez un aperçu complet de votre entreprise.",
          "Klicken Sie auf 'Dashboard' im linken Seitenmenü. Sie sehen eine vollständige Übersicht Ihres Geschäfts."
        ),
        icon: MousePointer,
        highlight: "from-blue-500/20 to-indigo-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Interpreta los KPIs", "Understand the KPIs", "Interprete os KPIs", "Comprenez les KPIs", "Verstehen Sie die KPIs"),
        description: t(
          "Los KPIs principales muestran: Clientes Activos, Proyectos en Curso, Ingresos Estimados y Tasa de Conversión. Cada tarjeta tiene un indicador de tendencia (↑ verde = mejora, ↓ rojo = baja).",
          "Main KPIs show: Active Clients, Ongoing Projects, Estimated Revenue, and Conversion Rate. Each card has a trend indicator (↑ green = improving, ↓ red = declining).",
          "Os KPIs principais mostram: Clientes Ativos, Projetos em Andamento, Receita Estimada e Taxa de Conversão.",
          "Les KPIs principaux montrent : Clients actifs, Projets en cours, Revenus estimés et Taux de conversion.",
          "Die Haupt-KPIs zeigen: Aktive Kunden, Laufende Projekte, Geschätzter Umsatz und Konversionsrate."
        ),
        icon: Eye,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "scroll",
        duration: 8,
      },
      {
        title: t("Revisa los gráficos", "Review the charts", "Revise os gráficos", "Examinez les graphiques", "Überprüfen Sie die Diagramme"),
        description: t(
          "Desplázate hacia abajo para ver gráficos de rendimiento: línea temporal de ingresos, distribución de leads por fuente, y actividad del equipo. Puedes cambiar el rango de fechas con el selector superior.",
          "Scroll down to see performance charts: revenue timeline, lead distribution by source, and team activity. Change the date range with the top selector.",
          "Role para baixo para ver gráficos de desempenho: linha do tempo de receita, distribuição de leads por fonte e atividade da equipe.",
          "Faites défiler vers le bas pour voir les graphiques de performance : chronologie des revenus, distribution des leads par source.",
          "Scrollen Sie nach unten, um Leistungsdiagramme zu sehen: Umsatzzeitlinie, Lead-Verteilung nach Quelle."
        ),
        icon: BarChart3,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "scroll",
        duration: 7,
      },
      {
        title: t("Acciones rápidas", "Quick actions", "Ações rápidas", "Actions rapides", "Schnellaktionen"),
        description: t(
          "Usa los botones de acción rápida para: crear nuevo contacto, enviar campaña, ver reportes o acceder a cualquier módulo directamente desde el dashboard.",
          "Use quick action buttons to: create new contact, send campaign, view reports, or access any module directly from the dashboard.",
          "Use os botões de ação rápida para: criar novo contato, enviar campanha, ver relatórios ou acessar qualquer módulo.",
          "Utilisez les boutons d'action rapide pour : créer un contact, envoyer une campagne, voir les rapports.",
          "Verwenden Sie Schnellaktionsschaltflächen zum: Erstellen eines Kontakts, Senden einer Kampagne, Anzeigen von Berichten."
        ),
        icon: Zap,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("¡Listo! Dashboard dominado", "Done! Dashboard mastered", "Pronto! Dashboard dominado", "Terminé ! Tableau de bord maîtrisé", "Fertig! Dashboard gemeistert"),
        description: t(
          "Ya sabes navegar el Dashboard. Recuerda que se actualiza en tiempo real cada 30 segundos. Puedes personalizar qué widgets ver y en qué orden.",
          "You now know how to navigate the Dashboard. Remember it updates in real-time every 30 seconds. You can customize which widgets to show.",
          "Agora você sabe navegar o Dashboard. Lembre-se que ele atualiza em tempo real a cada 30 segundos.",
          "Vous savez maintenant naviguer dans le tableau de bord. Il se met à jour en temps réel toutes les 30 secondes.",
          "Sie wissen jetzt, wie Sie das Dashboard navigieren. Es aktualisiert sich alle 30 Sekunden in Echtzeit."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "crm",
    sectionName: t("CRM & Contactos", "CRM & Contacts", "CRM & Contatos", "CRM & Contacts", "CRM & Kontakte"),
    icon: Users,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    totalDuration: "3:00",
    difficulty: "beginner",
    steps: [
      {
        title: t("Accede al CRM", "Access the CRM", "Acesse o CRM", "Accédez au CRM", "Zugriff auf das CRM"),
        description: t(
          "Navega a 'CRM' desde el menú lateral. Verás tu lista de contactos con filtros, búsqueda y opciones de vista (lista, tarjetas, tabla).",
          "Navigate to 'CRM' from the sidebar. You'll see your contact list with filters, search, and view options (list, cards, table).",
          "Navegue até 'CRM' no menu lateral. Você verá sua lista de contatos com filtros, busca e opções de visualização.",
          "Naviguez vers 'CRM' depuis le menu latéral. Vous verrez votre liste de contacts avec filtres et recherche.",
          "Navigieren Sie zum 'CRM' über das Seitenmenü. Sie sehen Ihre Kontaktliste mit Filtern und Suche."
        ),
        icon: MousePointer,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Añadir un contacto", "Add a contact", "Adicionar um contato", "Ajouter un contact", "Kontakt hinzufügen"),
        description: t(
          "Haz clic en '+ Nuevo Contacto'. Rellena nombre, email, teléfono y empresa. Puedes añadir campos personalizados como sector, presupuesto o fuente de captación.",
          "Click '+ New Contact'. Fill in name, email, phone, and company. You can add custom fields like industry, budget, or lead source.",
          "Clique em '+ Novo Contato'. Preencha nome, email, telefone e empresa. Você pode adicionar campos personalizados.",
          "Cliquez sur '+ Nouveau Contact'. Remplissez nom, email, téléphone et entreprise. Ajoutez des champs personnalisés.",
          "Klicken Sie auf '+ Neuer Kontakt'. Füllen Sie Name, E-Mail, Telefon und Unternehmen aus."
        ),
        icon: Edit3,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "type",
        duration: 8,
      },
      {
        title: t("Importar contactos", "Import contacts", "Importar contatos", "Importer des contacts", "Kontakte importieren"),
        description: t(
          "Para importar masivamente, haz clic en 'Importar' → sube tu CSV → mapea las columnas → confirma. Soporta hasta 100.000 contactos por importación.",
          "To bulk import, click 'Import' → upload your CSV → map columns → confirm. Supports up to 100,000 contacts per import.",
          "Para importar em massa, clique em 'Importar' → suba seu CSV → mapeie as colunas → confirme.",
          "Pour importer en masse, cliquez sur 'Importer' → téléchargez votre CSV → mappez les colonnes → confirmez.",
          "Für Massenimport klicken Sie auf 'Importieren' → laden Sie Ihre CSV hoch → ordnen Sie Spalten zu → bestätigen Sie."
        ),
        icon: Upload,
        highlight: "from-blue-500/20 to-cyan-500/20",
        animationType: "drag",
        duration: 7,
      },
      {
        title: t("Segmentar y filtrar", "Segment and filter", "Segmentar e filtrar", "Segmenter et filtrer", "Segmentieren und filtern"),
        description: t(
          "Usa los filtros avanzados para segmentar: por etiqueta, fuente, fecha, actividad, puntuación de lead, etc. Guarda segmentos para reutilizarlos en campañas.",
          "Use advanced filters to segment: by tag, source, date, activity, lead score, etc. Save segments to reuse in campaigns.",
          "Use filtros avançados para segmentar: por tag, fonte, data, atividade, pontuação de lead, etc.",
          "Utilisez les filtres avancés pour segmenter : par tag, source, date, activité, score de lead, etc.",
          "Verwenden Sie erweiterte Filter zum Segmentieren: nach Tag, Quelle, Datum, Aktivität, Lead-Score, etc."
        ),
        icon: Filter,
        highlight: "from-pink-500/20 to-rose-500/20",
        animationType: "select",
        duration: 7,
      },
      {
        title: t("¡CRM dominado!", "CRM mastered!", "CRM dominado!", "CRM maîtrisé !", "CRM gemeistert!"),
        description: t(
          "Ya sabes gestionar contactos en el CRM. Explora las automatizaciones para hacer seguimiento automático de leads y nunca perder una oportunidad.",
          "You now know how to manage contacts in the CRM. Explore automations for automatic lead follow-up and never miss an opportunity.",
          "Agora você sabe gerenciar contatos no CRM. Explore as automações para acompanhamento automático de leads.",
          "Vous savez maintenant gérer les contacts dans le CRM. Explorez les automatisations pour le suivi automatique.",
          "Sie wissen jetzt, wie Sie Kontakte im CRM verwalten. Erkunden Sie Automatisierungen für automatisches Lead-Follow-up."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "campaigns",
    sectionName: t("Campañas", "Campaigns", "Campanhas", "Campagnes", "Kampagnen"),
    icon: Megaphone,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    totalDuration: "3:30",
    difficulty: "intermediate",
    steps: [
      {
        title: t("Accede a Campañas", "Access Campaigns", "Acesse Campanhas", "Accédez aux Campagnes", "Zugriff auf Kampagnen"),
        description: t(
          "Ve a 'Campañas' en el menú. Verás un resumen de todas tus campañas activas, pausadas y finalizadas con métricas de rendimiento.",
          "Go to 'Campaigns' in the menu. You'll see an overview of all your active, paused, and completed campaigns with performance metrics.",
          "Vá para 'Campanhas' no menu. Você verá um resumo de todas as suas campanhas ativas, pausadas e finalizadas.",
          "Allez dans 'Campagnes' dans le menu. Vous verrez un aperçu de toutes vos campagnes actives, en pause et terminées.",
          "Gehen Sie zu 'Kampagnen' im Menü. Sie sehen eine Übersicht aller aktiven, pausierten und abgeschlossenen Kampagnen."
        ),
        icon: MousePointer,
        highlight: "from-red-500/20 to-rose-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Crear nueva campaña", "Create new campaign", "Criar nova campanha", "Créer une nouvelle campagne", "Neue Kampagne erstellen"),
        description: t(
          "Haz clic en '+ Nueva Campaña'. Elige el canal (Meta, Google, Email, SMS), define tu audiencia objetivo, establece presupuesto y fechas.",
          "Click '+ New Campaign'. Choose the channel (Meta, Google, Email, SMS), define your target audience, set budget and dates.",
          "Clique em '+ Nova Campanha'. Escolha o canal (Meta, Google, Email, SMS), defina seu público-alvo, orçamento e datas.",
          "Cliquez sur '+ Nouvelle Campagne'. Choisissez le canal, définissez votre audience cible, budget et dates.",
          "Klicken Sie auf '+ Neue Kampagne'. Wählen Sie den Kanal, definieren Sie Ihre Zielgruppe, Budget und Daten."
        ),
        icon: Edit3,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "type",
        duration: 8,
      },
      {
        title: t("Diseñar el contenido", "Design the content", "Desenhar o conteúdo", "Concevoir le contenu", "Inhalt gestalten"),
        description: t(
          "Usa el editor visual para crear tu anuncio o email. Arrastra elementos, añade imágenes, texto y CTAs. Nelvyon puede generar variantes automáticamente.",
          "Use the visual editor to create your ad or email. Drag elements, add images, text, and CTAs. Nelvyon can auto-generate variants.",
          "Use o editor visual para criar seu anúncio ou email. Arraste elementos, adicione imagens, texto e CTAs.",
          "Utilisez l'éditeur visuel pour créer votre annonce ou email. Glissez des éléments, ajoutez images et texte.",
          "Verwenden Sie den visuellen Editor, um Ihre Anzeige oder E-Mail zu erstellen. Ziehen Sie Elemente, fügen Sie Bilder hinzu."
        ),
        icon: Palette,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "drag",
        duration: 8,
      },
      {
        title: t("Lanzar y monitorear", "Launch and monitor", "Lançar e monitorar", "Lancer et surveiller", "Starten und überwachen"),
        description: t(
          "Revisa todo y haz clic en 'Lanzar'. Monitorea en tiempo real: impresiones, clics, conversiones, CPC, ROAS. Ajusta el presupuesto sobre la marcha.",
          "Review everything and click 'Launch'. Monitor in real-time: impressions, clicks, conversions, CPC, ROAS. Adjust budget on the fly.",
          "Revise tudo e clique em 'Lançar'. Monitore em tempo real: impressões, cliques, conversões, CPC, ROAS.",
          "Vérifiez tout et cliquez sur 'Lancer'. Surveillez en temps réel : impressions, clics, conversions, CPC, ROAS.",
          "Überprüfen Sie alles und klicken Sie auf 'Starten'. Überwachen Sie in Echtzeit: Impressionen, Klicks, Conversions."
        ),
        icon: Eye,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "toggle",
        duration: 7,
      },
      {
        title: t("¡Campaña lanzada!", "Campaign launched!", "Campanha lançada!", "Campagne lancée !", "Kampagne gestartet!"),
        description: t(
          "Tu campaña está activa. Revisa los reportes diarios para optimizar. Nelvyon sugiere ajustes automáticos de presupuesto y audiencia para maximizar ROAS.",
          "Your campaign is live. Check daily reports to optimize. Nelvyon suggests automatic budget and audience adjustments to maximize ROAS.",
          "Sua campanha está ativa. Verifique relatórios diários para otimizar. Nelvyon sugere ajustes automáticos.",
          "Votre campagne est active. Consultez les rapports quotidiens pour optimiser. L'IA suggère des ajustements automatiques.",
          "Ihre Kampagne ist aktiv. Überprüfen Sie tägliche Berichte zur Optimierung. KI schlägt automatische Anpassungen vor."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "email-marketing",
    sectionName: t("Email Marketing", "Email Marketing", "Email Marketing", "Email Marketing", "E-Mail-Marketing"),
    icon: Mail,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    totalDuration: "3:00",
    difficulty: "beginner",
    steps: [
      {
        title: t("Accede a Email Marketing", "Access Email Marketing", "Acesse Email Marketing", "Accédez à l'Email Marketing", "Zugriff auf E-Mail-Marketing"),
        description: t(
          "Navega a 'Email Marketing' en el menú. Verás tus campañas de email, secuencias automatizadas y métricas de entregabilidad.",
          "Navigate to 'Email Marketing' in the menu. You'll see your email campaigns, automated sequences, and deliverability metrics.",
          "Navegue até 'Email Marketing' no menu. Você verá suas campanhas de email, sequências automatizadas e métricas.",
          "Naviguez vers 'Email Marketing'. Vous verrez vos campagnes email, séquences automatisées et métriques.",
          "Navigieren Sie zu 'E-Mail-Marketing'. Sie sehen Ihre E-Mail-Kampagnen, automatisierte Sequenzen und Metriken."
        ),
        icon: MousePointer,
        highlight: "from-pink-500/20 to-rose-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Crear campaña de email", "Create email campaign", "Criar campanha de email", "Créer une campagne email", "E-Mail-Kampagne erstellen"),
        description: t(
          "Clic en '+ Nueva Campaña'. Elige un template, personaliza con el editor drag & drop, escribe el asunto (Nelvyon sugiere variantes) y selecciona la lista de destinatarios.",
          "Click '+ New Campaign'. Choose a template, customize with drag & drop editor, write the subject (AI suggests variants), select recipient list.",
          "Clique em '+ Nova Campanha'. Escolha um template, personalize com o editor drag & drop, escreva o assunto.",
          "Cliquez sur '+ Nouvelle Campagne'. Choisissez un template, personnalisez avec l'éditeur, écrivez l'objet.",
          "Klicken Sie auf '+ Neue Kampagne'. Wählen Sie eine Vorlage, passen Sie mit dem Editor an, schreiben Sie den Betreff."
        ),
        icon: Edit3,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "type",
        duration: 8,
      },
      {
        title: t("Configurar secuencia", "Set up sequence", "Configurar sequência", "Configurer une séquence", "Sequenz einrichten"),
        description: t(
          "Para automatizar, ve a 'Secuencias' → '+ Nueva'. Define los emails, intervalos entre envíos, y condiciones (si abre, si hace clic, si no responde).",
          "To automate, go to 'Sequences' → '+ New'. Define emails, intervals between sends, and conditions (opens, clicks, no response).",
          "Para automatizar, vá em 'Sequências' → '+ Nova'. Defina os emails, intervalos e condições.",
          "Pour automatiser, allez dans 'Séquences' → '+ Nouvelle'. Définissez les emails, intervalles et conditions.",
          "Zum Automatisieren gehen Sie zu 'Sequenzen' → '+ Neu'. Definieren Sie E-Mails, Intervalle und Bedingungen."
        ),
        icon: Workflow,
        highlight: "from-cyan-500/20 to-blue-500/20",
        animationType: "drag",
        duration: 8,
      },
      {
        title: t("Analizar resultados", "Analyze results", "Analisar resultados", "Analyser les résultats", "Ergebnisse analysieren"),
        description: t(
          "Revisa las métricas: tasa de apertura, tasa de clic, rebotes, bajas. Compara campañas y optimiza basándote en los datos.",
          "Review metrics: open rate, click rate, bounces, unsubscribes. Compare campaigns and optimize based on data.",
          "Revise as métricas: taxa de abertura, taxa de clique, rejeições, cancelamentos.",
          "Examinez les métriques : taux d'ouverture, taux de clic, rebonds, désabonnements.",
          "Überprüfen Sie Metriken: Öffnungsrate, Klickrate, Bounces, Abmeldungen."
        ),
        icon: BarChart3,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "scroll",
        duration: 7,
      },
      {
        title: t("¡Email Marketing dominado!", "Email Marketing mastered!", "Email Marketing dominado!", "Email Marketing maîtrisé !", "E-Mail-Marketing gemeistert!"),
        description: t(
          "Ya dominas el email marketing. Experimenta con A/B testing para optimizar asuntos y contenido. Nelvyon te ayuda a mejorar continuamente.",
          "You've mastered email marketing. Experiment with A/B testing to optimize subjects and content. Nelvyon helps you improve continuously.",
          "Você domina o email marketing. Experimente A/B testing para otimizar assuntos e conteúdo.",
          "Vous maîtrisez l'email marketing. Expérimentez avec l'A/B testing pour optimiser.",
          "Sie beherrschen E-Mail-Marketing. Experimentieren Sie mit A/B-Tests zur Optimierung."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "funnels",
    sectionName: t("Funnels", "Funnels", "Funis", "Entonnoirs", "Funnels"),
    icon: Layers,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    totalDuration: "3:30",
    difficulty: "intermediate",
    steps: [
      {
        title: t("Accede a Funnels", "Access Funnels", "Acesse Funis", "Accédez aux Entonnoirs", "Zugriff auf Funnels"),
        description: t(
          "Ve a 'Funnels' en el menú. Verás tus embudos de venta con estadísticas de conversión por paso.",
          "Go to 'Funnels' in the menu. You'll see your sales funnels with conversion stats per step.",
          "Vá para 'Funis' no menu. Você verá seus funis de vendas com estatísticas de conversão por etapa.",
          "Allez dans 'Entonnoirs'. Vous verrez vos entonnoirs de vente avec les stats de conversion par étape.",
          "Gehen Sie zu 'Funnels'. Sie sehen Ihre Verkaufstrichter mit Konversionsstatistiken pro Schritt."
        ),
        icon: MousePointer,
        highlight: "from-cyan-500/20 to-teal-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Crear un funnel", "Create a funnel", "Criar um funil", "Créer un entonnoir", "Einen Funnel erstellen"),
        description: t(
          "Clic en '+ Nuevo Funnel'. Elige una plantilla o empieza desde cero. Define las páginas: captura, ventas, checkout, upsell, gracias.",
          "Click '+ New Funnel'. Choose a template or start from scratch. Define pages: capture, sales, checkout, upsell, thank you.",
          "Clique em '+ Novo Funil'. Escolha um template ou comece do zero. Defina as páginas.",
          "Cliquez sur '+ Nouvel Entonnoir'. Choisissez un template ou partez de zéro. Définissez les pages.",
          "Klicken Sie auf '+ Neuer Funnel'. Wählen Sie eine Vorlage oder starten Sie von Grund auf."
        ),
        icon: Layers,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "drag",
        duration: 8,
      },
      {
        title: t("Diseñar cada página", "Design each page", "Desenhar cada página", "Concevoir chaque page", "Jede Seite gestalten"),
        description: t(
          "Usa el editor visual para cada página del funnel. Añade headlines, imágenes, testimonios, CTAs, formularios y botones de pago.",
          "Use the visual editor for each funnel page. Add headlines, images, testimonials, CTAs, forms, and payment buttons.",
          "Use o editor visual para cada página do funil. Adicione títulos, imagens, depoimentos, CTAs.",
          "Utilisez l'éditeur visuel pour chaque page. Ajoutez titres, images, témoignages, CTAs.",
          "Verwenden Sie den visuellen Editor für jede Seite. Fügen Sie Überschriften, Bilder, Testimonials hinzu."
        ),
        icon: Edit3,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "type",
        duration: 8,
      },
      {
        title: t("Publicar y optimizar", "Publish and optimize", "Publicar e otimizar", "Publier et optimiser", "Veröffentlichen und optimieren"),
        description: t(
          "Conecta tu dominio, publica el funnel y monitorea las conversiones. Usa A/B testing para optimizar cada paso del embudo.",
          "Connect your domain, publish the funnel, and monitor conversions. Use A/B testing to optimize each funnel step.",
          "Conecte seu domínio, publique o funil e monitore as conversões. Use A/B testing para otimizar.",
          "Connectez votre domaine, publiez l'entonnoir et surveillez les conversions. Utilisez l'A/B testing.",
          "Verbinden Sie Ihre Domain, veröffentlichen Sie den Funnel und überwachen Sie Conversions."
        ),
        icon: Globe,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "toggle",
        duration: 7,
      },
      {
        title: t("¡Funnel activo!", "Funnel live!", "Funil ativo!", "Entonnoir actif !", "Funnel aktiv!"),
        description: t(
          "Tu funnel está generando leads y ventas. Revisa las métricas diarias y optimiza continuamente para maximizar conversiones.",
          "Your funnel is generating leads and sales. Review daily metrics and continuously optimize to maximize conversions.",
          "Seu funil está gerando leads e vendas. Revise as métricas diárias e otimize continuamente.",
          "Votre entonnoir génère des leads et des ventes. Consultez les métriques quotidiennes.",
          "Ihr Funnel generiert Leads und Verkäufe. Überprüfen Sie tägliche Metriken."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "calendar",
    sectionName: t("Calendario", "Calendar", "Calendário", "Calendrier", "Kalender"),
    icon: Calendar,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-blue-600",
    totalDuration: "2:30",
    difficulty: "beginner",
    steps: [
      {
        title: t("Accede al Calendario", "Access the Calendar", "Acesse o Calendário", "Accédez au Calendrier", "Zugriff auf den Kalender"),
        description: t(
          "Ve a 'Calendario' en el menú. Verás tu agenda con citas, eventos y disponibilidad del equipo en vista diaria, semanal o mensual.",
          "Go to 'Calendar' in the menu. You'll see your schedule with appointments, events, and team availability in daily, weekly, or monthly view.",
          "Vá para 'Calendário' no menu. Você verá sua agenda com compromissos e disponibilidade da equipe.",
          "Allez dans 'Calendrier'. Vous verrez votre agenda avec rendez-vous et disponibilité de l'équipe.",
          "Gehen Sie zum 'Kalender'. Sie sehen Ihren Zeitplan mit Terminen und Team-Verfügbarkeit."
        ),
        icon: MousePointer,
        highlight: "from-cyan-500/20 to-blue-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Configurar disponibilidad", "Set availability", "Configurar disponibilidade", "Configurer la disponibilité", "Verfügbarkeit einrichten"),
        description: t(
          "Ve a Configuración → Disponibilidad. Define tus horarios laborales, duración de citas, buffer entre citas y días no disponibles.",
          "Go to Settings → Availability. Define your working hours, appointment duration, buffer between appointments, and unavailable days.",
          "Vá em Configurações → Disponibilidade. Defina seus horários de trabalho, duração de consultas e dias indisponíveis.",
          "Allez dans Paramètres → Disponibilité. Définissez vos heures de travail, durée des rendez-vous.",
          "Gehen Sie zu Einstellungen → Verfügbarkeit. Definieren Sie Ihre Arbeitszeiten, Termindauer."
        ),
        icon: Settings,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "select",
        duration: 7,
      },
      {
        title: t("Compartir link de reservas", "Share booking link", "Compartilhar link de reservas", "Partager le lien de réservation", "Buchungslink teilen"),
        description: t(
          "Copia tu link de reservas personalizado y compártelo con clientes. Ellos verán tu disponibilidad y podrán agendar directamente.",
          "Copy your personalized booking link and share with clients. They'll see your availability and can book directly.",
          "Copie seu link de reservas personalizado e compartilhe com clientes. Eles verão sua disponibilidade.",
          "Copiez votre lien de réservation personnalisé et partagez-le avec vos clients.",
          "Kopieren Sie Ihren personalisierten Buchungslink und teilen Sie ihn mit Kunden."
        ),
        icon: Share2,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "click",
        duration: 6,
      },
      {
        title: t("Recordatorios automáticos", "Automatic reminders", "Lembretes automáticos", "Rappels automatiques", "Automatische Erinnerungen"),
        description: t(
          "Activa recordatorios por email y SMS: 24h antes, 1h antes, y confirmación post-cita. Reduce no-shows hasta un 80%.",
          "Enable email and SMS reminders: 24h before, 1h before, and post-appointment confirmation. Reduce no-shows by up to 80%.",
          "Ative lembretes por email e SMS: 24h antes, 1h antes, e confirmação pós-consulta.",
          "Activez les rappels par email et SMS : 24h avant, 1h avant, et confirmation post-rendez-vous.",
          "Aktivieren Sie E-Mail- und SMS-Erinnerungen: 24h vorher, 1h vorher und Nachbestätigung."
        ),
        icon: Bell,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "toggle",
        duration: 6,
      },
      {
        title: t("¡Calendario listo!", "Calendar ready!", "Calendário pronto!", "Calendrier prêt !", "Kalender bereit!"),
        description: t(
          "Tu sistema de citas está activo. Los clientes pueden reservar 24/7 y recibirás notificaciones automáticas de cada nueva reserva.",
          "Your appointment system is live. Clients can book 24/7 and you'll get automatic notifications for each new booking.",
          "Seu sistema de agendamento está ativo. Os clientes podem reservar 24/7.",
          "Votre système de rendez-vous est actif. Les clients peuvent réserver 24/7.",
          "Ihr Terminsystem ist aktiv. Kunden können rund um die Uhr buchen."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "conversations",
    sectionName: t("Conversaciones", "Conversations", "Conversas", "Conversations", "Konversationen"),
    icon: MessageSquare,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-indigo-600",
    totalDuration: "2:30",
    difficulty: "beginner",
    steps: [
      {
        title: t("Inbox unificado", "Unified inbox", "Inbox unificado", "Boîte de réception unifiée", "Einheitlicher Posteingang"),
        description: t(
          "Accede a 'Conversaciones' para ver todos los mensajes de WhatsApp, Messenger, Instagram, email y chat web en un solo lugar.",
          "Access 'Conversations' to see all messages from WhatsApp, Messenger, Instagram, email, and web chat in one place.",
          "Acesse 'Conversas' para ver todas as mensagens de WhatsApp, Messenger, Instagram, email e chat web em um só lugar.",
          "Accédez à 'Conversations' pour voir tous les messages de WhatsApp, Messenger, Instagram, email et chat web.",
          "Greifen Sie auf 'Konversationen' zu, um alle Nachrichten von WhatsApp, Messenger, Instagram, E-Mail und Web-Chat zu sehen."
        ),
        icon: MessageSquare,
        highlight: "from-violet-500/20 to-indigo-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Responder mensajes", "Reply to messages", "Responder mensagens", "Répondre aux messages", "Nachrichten beantworten"),
        description: t(
          "Selecciona una conversación y responde. Usa respuestas rápidas predefinidas, adjunta archivos, o deja que Nelvyon sugiera respuestas.",
          "Select a conversation and reply. Use predefined quick replies, attach files, or let Nelvyon suggest responses.",
          "Selecione uma conversa e responda. Use respostas rápidas predefinidas, anexe arquivos ou deixe Nelvyon sugerir.",
          "Sélectionnez une conversation et répondez. Utilisez des réponses rapides, joignez des fichiers ou laissez l'IA suggérer.",
          "Wählen Sie eine Konversation und antworten Sie. Verwenden Sie Schnellantworten, hängen Sie Dateien an."
        ),
        icon: Edit3,
        highlight: "from-blue-500/20 to-cyan-500/20",
        animationType: "type",
        duration: 7,
      },
      {
        title: t("Chatbot automático", "Automatic chatbot", "Chatbot automático", "Chatbot automatique", "Automatischer Chatbot"),
        description: t(
          "Configura un chatbot para responder preguntas frecuentes automáticamente. Ve a Configuración → Chatbot → Crear flujo conversacional.",
          "Set up a chatbot to answer FAQs automatically. Go to Settings → Chatbot → Create conversational flow.",
          "Configure um chatbot para responder perguntas frequentes automaticamente.",
          "Configurez un chatbot pour répondre automatiquement aux questions fréquentes.",
          "Richten Sie einen Chatbot ein, um häufige Fragen automatisch zu beantworten."
        ),
        icon: Bot,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "drag",
        duration: 7,
      },
      {
        title: t("¡Conversaciones dominadas!", "Conversations mastered!", "Conversas dominadas!", "Conversations maîtrisées !", "Konversationen gemeistert!"),
        description: t(
          "Ya gestionas todas tus conversaciones desde un solo inbox. Activa el chatbot Nelvyon para responder 24/7 y nunca perder un cliente.",
          "You now manage all conversations from one inbox. Enable Nelvyon chatbot to respond 24/7 and never lose a client.",
          "Agora você gerencia todas as conversas de um único inbox. Ative o chatbot Nelvyon para responder 24/7.",
          "Vous gérez maintenant toutes les conversations depuis une seule boîte. Activez le chatbot Nelvyon 24/7.",
          "Sie verwalten jetzt alle Konversationen aus einem Posteingang. Aktivieren Sie den KI-Chatbot 24/7."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "social",
    sectionName: t("Social Media", "Social Media", "Mídias Sociais", "Réseaux Sociaux", "Social Media"),
    icon: Share2,
    color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    totalDuration: "2:30",
    difficulty: "beginner",
    steps: [
      {
        title: t("Conectar redes", "Connect networks", "Conectar redes", "Connecter les réseaux", "Netzwerke verbinden"),
        description: t(
          "Ve a 'Social Media' → 'Conectar Cuentas'. Vincula Instagram, Facebook, Twitter/X, LinkedIn, TikTok y YouTube.",
          "Go to 'Social Media' → 'Connect Accounts'. Link Instagram, Facebook, Twitter/X, LinkedIn, TikTok, and YouTube.",
          "Vá em 'Mídias Sociais' → 'Conectar Contas'. Vincule Instagram, Facebook, Twitter/X, LinkedIn, TikTok e YouTube.",
          "Allez dans 'Réseaux Sociaux' → 'Connecter les comptes'. Liez Instagram, Facebook, Twitter/X, LinkedIn.",
          "Gehen Sie zu 'Social Media' → 'Konten verbinden'. Verknüpfen Sie Instagram, Facebook, Twitter/X, LinkedIn."
        ),
        icon: Share2,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "click",
        duration: 6,
      },
      {
        title: t("Crear y programar posts", "Create and schedule posts", "Criar e agendar posts", "Créer et programmer des posts", "Posts erstellen und planen"),
        description: t(
          "Crea un post, elige las redes donde publicar, programa fecha y hora. Nelvyon genera textos, hashtags y sugiere los mejores horarios.",
          "Create a post, choose networks to publish on, schedule date and time. Nelvyon generates texts, hashtags, and suggests best times.",
          "Crie um post, escolha as redes, agende data e hora. Nelvyon gera textos, hashtags e sugere os melhores horários.",
          "Créez un post, choisissez les réseaux, programmez date et heure. L'IA génère textes et hashtags.",
          "Erstellen Sie einen Post, wählen Sie Netzwerke, planen Sie Datum und Uhrzeit. KI generiert Texte und Hashtags."
        ),
        icon: Edit3,
        highlight: "from-blue-500/20 to-indigo-500/20",
        animationType: "type",
        duration: 7,
      },
      {
        title: t("Analizar engagement", "Analyze engagement", "Analisar engajamento", "Analyser l'engagement", "Engagement analysieren"),
        description: t(
          "Revisa las métricas de cada publicación: likes, comentarios, compartidos, alcance. Identifica qué contenido funciona mejor.",
          "Review metrics for each post: likes, comments, shares, reach. Identify what content works best.",
          "Revise as métricas de cada publicação: curtidas, comentários, compartilhamentos, alcance.",
          "Examinez les métriques de chaque publication : likes, commentaires, partages, portée.",
          "Überprüfen Sie Metriken für jeden Post: Likes, Kommentare, Shares, Reichweite."
        ),
        icon: BarChart3,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "scroll",
        duration: 6,
      },
      {
        title: t("¡Social Media dominado!", "Social Media mastered!", "Mídias Sociais dominadas!", "Réseaux Sociaux maîtrisés !", "Social Media gemeistert!"),
        description: t(
          "Ya gestionas todas tus redes desde un solo lugar. Usa el calendario editorial para planificar contenido mensual.",
          "You now manage all networks from one place. Use the editorial calendar to plan monthly content.",
          "Agora você gerencia todas as redes de um só lugar. Use o calendário editorial para planejar conteúdo.",
          "Vous gérez maintenant tous les réseaux depuis un seul endroit. Utilisez le calendrier éditorial.",
          "Sie verwalten jetzt alle Netzwerke von einem Ort aus. Nutzen Sie den Redaktionskalender."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "reports",
    sectionName: t("Reportes", "Reports", "Relatórios", "Rapports", "Berichte"),
    icon: PieChart,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    totalDuration: "2:00",
    difficulty: "beginner",
    steps: [
      {
        title: t("Accede a Reportes", "Access Reports", "Acesse Relatórios", "Accédez aux Rapports", "Zugriff auf Berichte"),
        description: t(
          "Ve a 'Reportes' en el menú. Verás reportes predefinidos y la opción de crear reportes personalizados.",
          "Go to 'Reports' in the menu. You'll see predefined reports and the option to create custom reports.",
          "Vá para 'Relatórios' no menu. Você verá relatórios predefinidos e a opção de criar personalizados.",
          "Allez dans 'Rapports'. Vous verrez des rapports prédéfinis et l'option de créer des rapports personnalisés.",
          "Gehen Sie zu 'Berichte'. Sie sehen vordefinierte Berichte und die Option, benutzerdefinierte zu erstellen."
        ),
        icon: MousePointer,
        highlight: "from-pink-500/20 to-rose-500/20",
        animationType: "click",
        duration: 5,
      },
      {
        title: t("Generar reporte", "Generate report", "Gerar relatório", "Générer un rapport", "Bericht generieren"),
        description: t(
          "Selecciona el tipo de reporte, rango de fechas, métricas y formato. Haz clic en 'Generar' para crear el reporte al instante.",
          "Select report type, date range, metrics, and format. Click 'Generate' to create the report instantly.",
          "Selecione o tipo de relatório, período, métricas e formato. Clique em 'Gerar'.",
          "Sélectionnez le type de rapport, la période, les métriques et le format. Cliquez sur 'Générer'.",
          "Wählen Sie Berichtstyp, Zeitraum, Metriken und Format. Klicken Sie auf 'Generieren'."
        ),
        icon: Download,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "click",
        duration: 6,
      },
      {
        title: t("Exportar y compartir", "Export and share", "Exportar e compartilhar", "Exporter et partager", "Exportieren und teilen"),
        description: t(
          "Exporta a PDF, Excel o CSV. Programa envíos automáticos semanales o mensuales a tu equipo o clientes.",
          "Export to PDF, Excel, or CSV. Schedule automatic weekly or monthly sends to your team or clients.",
          "Exporte para PDF, Excel ou CSV. Programe envios automáticos semanais ou mensais.",
          "Exportez en PDF, Excel ou CSV. Programmez des envois automatiques hebdomadaires ou mensuels.",
          "Exportieren Sie als PDF, Excel oder CSV. Planen Sie automatische wöchentliche oder monatliche Sendungen."
        ),
        icon: Share2,
        highlight: "from-emerald-500/20 to-green-500/20",
        animationType: "click",
        duration: 6,
      },
      {
        title: t("¡Reportes dominados!", "Reports mastered!", "Relatórios dominados!", "Rapports maîtrisés !", "Berichte gemeistert!"),
        description: t(
          "Ya generas reportes profesionales. Configura reportes automáticos para ahorrar tiempo y mantener a todos informados.",
          "You now generate professional reports. Set up automatic reports to save time and keep everyone informed.",
          "Agora você gera relatórios profissionais. Configure relatórios automáticos para economizar tempo.",
          "Vous générez maintenant des rapports professionnels. Configurez des rapports automatiques.",
          "Sie erstellen jetzt professionelle Berichte. Richten Sie automatische Berichte ein."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
  {
    sectionId: "partners",
    sectionName: t("Partners", "Partners", "Parceiros", "Partenaires", "Partner"),
    icon: Handshake,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    totalDuration: "3:00",
    difficulty: "intermediate",
    steps: [
      {
        title: t("Programa Partners", "Partner Program", "Programa de Parceiros", "Programme Partenaires", "Partnerprogramm"),
        description: t(
          "Accede a 'Partners' para ver los planes disponibles: Silver, Gold, Platinum y Diamond. Cada uno con diferentes niveles de white-label y márgenes.",
          "Access 'Partners' to see available plans: Silver, Gold, Platinum, and Diamond. Each with different white-label levels and margins.",
          "Acesse 'Parceiros' para ver os planos disponíveis: Silver, Gold, Platinum e Diamond.",
          "Accédez à 'Partenaires' pour voir les plans disponibles : Silver, Gold, Platinum et Diamond.",
          "Greifen Sie auf 'Partner' zu, um verfügbare Pläne zu sehen: Silver, Gold, Platinum und Diamond."
        ),
        icon: Handshake,
        highlight: "from-amber-500/20 to-orange-500/20",
        animationType: "click",
        duration: 6,
      },
      {
        title: t("Elegir plan", "Choose plan", "Escolher plano", "Choisir un plan", "Plan wählen"),
        description: t(
          "Compara los planes y elige el que mejor se adapte a tu negocio. Considera: número de sub-cuentas, nivel de white-label, soporte y precio.",
          "Compare plans and choose the best fit for your business. Consider: number of sub-accounts, white-label level, support, and price.",
          "Compare os planos e escolha o melhor para seu negócio. Considere: número de sub-contas, nível de white-label.",
          "Comparez les plans et choisissez celui qui convient le mieux. Considérez : nombre de sous-comptes, niveau white-label.",
          "Vergleichen Sie Pläne und wählen Sie den besten für Ihr Geschäft. Berücksichtigen Sie: Anzahl der Unterkonten."
        ),
        icon: Star,
        highlight: "from-violet-500/20 to-purple-500/20",
        animationType: "select",
        duration: 7,
      },
      {
        title: t("Configurar white-label", "Set up white-label", "Configurar white-label", "Configurer le white-label", "White-Label einrichten"),
        description: t(
          "Personaliza tu plataforma: sube tu logo, elige colores, configura tu dominio personalizado. Tu marca, tu plataforma.",
          "Customize your platform: upload your logo, choose colors, set up your custom domain. Your brand, your platform.",
          "Personalize sua plataforma: suba seu logo, escolha cores, configure seu domínio personalizado.",
          "Personnalisez votre plateforme : téléchargez votre logo, choisissez les couleurs, configurez votre domaine.",
          "Passen Sie Ihre Plattform an: laden Sie Ihr Logo hoch, wählen Sie Farben, richten Sie Ihre Domain ein."
        ),
        icon: Palette,
        highlight: "from-pink-500/20 to-rose-500/20",
        animationType: "drag",
        duration: 8,
      },
      {
        title: t("Invitar clientes", "Invite clients", "Convidar clientes", "Inviter des clients", "Kunden einladen"),
        description: t(
          "Crea sub-cuentas para tus clientes. Ellos verán TU marca, TU dominio, TU soporte. Tú facturas, tú decides el precio.",
          "Create sub-accounts for your clients. They'll see YOUR brand, YOUR domain, YOUR support. You invoice, you set the price.",
          "Crie sub-contas para seus clientes. Eles verão SUA marca, SEU domínio, SEU suporte.",
          "Créez des sous-comptes pour vos clients. Ils verront VOTRE marque, VOTRE domaine, VOTRE support.",
          "Erstellen Sie Unterkonten für Ihre Kunden. Sie sehen IHRE Marke, IHRE Domain, IHREN Support."
        ),
        icon: Users,
        highlight: "from-blue-500/20 to-cyan-500/20",
        animationType: "type",
        duration: 7,
      },
      {
        title: t("¡Eres Partner!", "You're a Partner!", "Você é Parceiro!", "Vous êtes Partenaire !", "Sie sind Partner!"),
        description: t(
          "Ya puedes revender la plataforma con tu marca. Márgenes del 300-500%. Soporte prioritario y formación incluida.",
          "You can now resell the platform under your brand. 300-500% margins. Priority support and training included.",
          "Agora você pode revender a plataforma com sua marca. Margens de 300-500%.",
          "Vous pouvez maintenant revendre la plateforme sous votre marque. Marges de 300-500%.",
          "Sie können die Plattform jetzt unter Ihrer Marke weiterverkaufen. 300-500% Margen."
        ),
        icon: CheckCircle,
        highlight: "from-emerald-500/20 to-teal-500/20",
        animationType: "toggle",
        duration: 5,
      },
    ],
  },
];

/* ─── Find tutorial by section ID ─── */
export function findTutorialBySection(sectionId: string): SectionTutorial | null {
  return sectionTutorials.find(t => t.sectionId === sectionId) || null;
}

/* ─── Find tutorial by path ─── */
export function findTutorialByPath(pathname: string): SectionTutorial | null {
  const pathMap: Record<string, string> = {
    "/saas/dashboard": "dashboard",
    "/saas/crm": "crm",
    "/saas/campaigns": "campaigns",
    "/saas/email-marketing": "email-marketing",
    "/saas/funnels": "funnels",
    "/saas/calendar": "calendar",
    "/saas/conversations": "conversations",
    "/saas/social": "social",
    "/saas/reports": "reports",
    "/saas/partners": "partners",
  };
  const sectionId = Object.entries(pathMap).find(([p]) => pathname.startsWith(p))?.[1];
  return sectionId ? findTutorialBySection(sectionId) : null;
}

/* ─── Language labels for selector ─── */
export const tutorialLanguages = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];