import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { eliteSocialIntakeStrings } from "../agents/elitePayloadStrings";
import type { OsJobPayload } from "../types";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type SocialMediaFileMap = Record<string, string>;

const PLATFORMS = ["instagram", "linkedin", "tiktok", "facebook", "x"] as const;

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

function designJsonFromPayload(payload: Record<string, unknown>): string {
  const b = eliteSocialIntakeStrings(payload as OsJobPayload);
  return JSON.stringify({
    colorPalette: { primary: b.primaryColor, secondary: b.secondaryColor, accent: "#e11d48" },
  });
}

type CalendarDay = { day: string; theme: string; format: string; hook: string; cta: string; platform: string };

function normalizeCalendarDays(calendarJson: string, strategyJson: string): CalendarDay[] {
  const cal = parseLooseJson<Record<string, unknown>>(calendarJson, {});
  const strat = parseLooseJson<Record<string, unknown>>(strategyJson, {});
  const playbooks = Array.isArray(strat.platformPlaybooks) ? strat.platformPlaybooks : [];
  const defaultPlatform =
    playbooks[0] && typeof playbooks[0] === "object"
      ? String((playbooks[0] as Record<string, unknown>).platform ?? "instagram")
      : "instagram";

  const days: CalendarDay[] = [];
  const weeks = Array.isArray(cal.weeks) ? cal.weeks : [];
  for (const week of weeks) {
    const w = week && typeof week === "object" ? (week as Record<string, unknown>) : {};
    const weekDays = Array.isArray(w.days) ? w.days : [];
    for (const d of weekDays) {
      const o = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
      days.push({
        day: String(o.day ?? `Día ${days.length + 1}`),
        theme: String(o.theme ?? "Contenido de valor"),
        format: String(o.format ?? "feed"),
        hook: String(o.hook ?? "Hook orientado a engagement"),
        cta: String(o.cta ?? "Comenta o guarda"),
        platform: String(o.platform ?? defaultPlatform),
      });
    }
  }

  if (days.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({
      day: `Día ${i + 1}`,
      theme: "Educación + prueba social",
      format: i % 3 === 0 ? "reel" : "feed",
      hook: `Idea ${i + 1} para tu audiencia`,
      cta: "Síguenos para más",
      platform: PLATFORMS[i % PLATFORMS.length]!,
    }));
  }
  return days;
}

function postHtml(day: CalendarDay, brand: string): string {
  const hashtags = `#${brand.replace(/\s+/g, "")} #marketing #${day.platform}`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(day.day)} — ${escapeHtml(day.platform)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 2rem auto; padding: 1.5rem; background: #fafafa; }
    .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 999px; background: #e11d48; color: #fff; font-size: 0.75rem; text-transform: uppercase; }
    h1 { font-size: 1.25rem; margin: 0.75rem 0 0.5rem; }
    .hook { font-size: 1.1rem; line-height: 1.5; margin: 1rem 0; }
    .meta { color: #64748b; font-size: 0.875rem; }
    .cta { margin-top: 1rem; font-weight: 700; color: #0f172a; }
    .tags { margin-top: 1rem; color: #7c3aed; font-size: 0.9rem; }
  </style>
</head>
<body>
  <span class="badge">${escapeHtml(day.platform)} · ${escapeHtml(day.format)}</span>
  <h1>${escapeHtml(day.theme)}</h1>
  <p class="meta">${escapeHtml(day.day)} · ${escapeHtml(brand)}</p>
  <p class="hook">${escapeHtml(day.hook)}</p>
  <p class="cta">${escapeHtml(day.cta)}</p>
  <p class="tags">${escapeHtml(hashtags)}</p>
</body>
</html>`;
}

export function buildSocialMediaFiles(
  calendarJson: string,
  strategyJson: string,
  payload: Record<string, unknown>,
): SocialMediaFileMap {
  const intake = eliteSocialIntakeStrings(payload as OsJobPayload);
  const brand = intake.clientName;
  const tokens = extractDesignTokens(designJsonFromPayload(payload), brand);
  const days = normalizeCalendarDays(calendarJson, strategyJson);

  const files: SocialMediaFileMap = {
    "README.txt": `Calendario social — ${brand}\n${days.length} posts HTML listos para revisión.\n`,
  };

  const calendarRows = days
    .map(
      (d, i) =>
        `<tr><td>${escapeHtml(d.day)}</td><td>${escapeHtml(d.platform)}</td><td>${escapeHtml(d.format)}</td><td>${escapeHtml(d.theme)}</td><td><a href="posts/post-${padIndex(i + 1)}.html">Ver post</a></td></tr>`,
    )
    .join("");

  files["calendar.html"] = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Calendario editorial — ${escapeHtml(brand)}</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <header class="doc-header"><h1>Calendario editorial (30 días)</h1><p>${escapeHtml(brand)} · ${escapeHtml(intake.socialPlatforms)}</p></header>
  <main class="doc-main">
    <table class="calendar-table">
      <thead><tr><th>Día</th><th>Plataforma</th><th>Formato</th><th>Tema</th><th>Post</th></tr></thead>
      <tbody>${calendarRows}</tbody>
    </table>
  </main>
</body>
</html>`;

  days.forEach((day, idx) => {
    files[`posts/post-${padIndex(idx + 1)}.html`] = postHtml(day, brand);
  });

  files["assets/styles.css"] = `${buildStylesCss(tokens)}
.doc-header { padding: 2rem 1.5rem; border-bottom: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.doc-main { max-width: 64rem; margin: 0 auto; padding: 2rem 1.5rem; overflow-x: auto; }
.calendar-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
.calendar-table th, .calendar-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent); text-align: left; }
.calendar-table th { background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg)); font-weight: 700; }
.calendar-table a { color: var(--color-accent); font-weight: 600; }
`;

  return files;
}

export function runSocialCalendarCodegen(
  calendarJson: string,
  strategyJson: string,
  payload: Record<string, unknown>,
): string {
  const files = buildSocialMediaFiles(calendarJson, strategyJson, payload);
  if (!isValidHtmlDocument(files["calendar.html"]!)) {
    throw new Error("socialMediaBuilder: invalid calendar.html");
  }
  const postFiles = Object.keys(files).filter((k) => k.startsWith("posts/") && k.endsWith(".html"));
  return JSON.stringify({ calendar: "calendar.html", posts: postFiles, count: postFiles.length });
}

export async function publishSocialBundleZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: SocialMediaFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "social-bundle", ...options });
}
