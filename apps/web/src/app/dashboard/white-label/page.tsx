"use client";

import { CheckCircle2, Globe, Loader2, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { WHITELABEL_FONTS, type WhitelabelApplyConfig } from "@/core/whitelabel/types";
import { useWhitelabel } from "@/core/whitelabel/WhitelabelProvider";
import { dashboardStorageApi } from "@/features/dashboard/api";
import { whitelabelApi, type DnsInstructions, type WhitelabelConfig } from "@/features/whitelabel/api";

const DEFAULT_PRIMARY = "#6366f1";
const DEFAULT_SECONDARY = "#8b5cf6";

function PreviewPanel({ config }: { config: WhitelabelApplyConfig }) {
  const primary = config.primary_color ?? DEFAULT_PRIMARY;
  const secondary = config.secondary_color ?? DEFAULT_SECONDARY;
  const name = config.company_name || config.brand_name || "Tu empresa";

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="px-4 py-3 text-sm font-medium text-white" style={{ background: primary }}>
        Vista previa — {name}
      </div>
      <div className="flex min-h-[280px]">
        <aside className="w-44 border-r bg-muted/40 p-3">
          {config.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={name} className="mb-3 max-h-10 max-w-full object-contain" src={config.logo_url} />
          ) : (
            <p className="mb-3 text-sm font-semibold" style={{ color: primary }}>
              {name}
            </p>
          )}
          <div className="mb-2 h-8 rounded-md px-2 text-xs leading-8 text-white" style={{ background: primary }}>
            Dashboard
          </div>
          <div className="h-8 rounded-md px-2 text-xs leading-8 text-muted-foreground">CRM</div>
          <div className="h-8 rounded-md px-2 text-xs leading-8 text-muted-foreground">Campañas</div>
        </aside>
        <main className="flex-1 p-4" style={{ fontFamily: `"${config.font ?? "Inter"}", sans-serif` }}>
          <h2 className="text-lg font-semibold">Bienvenido</h2>
          <p className="mt-1 text-sm text-muted-foreground">Así verán tu marca tus usuarios.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Primary</p>
              <p className="font-bold" style={{ color: primary }}>
                {primary}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Secondary</p>
              <p className="font-bold" style={{ color: secondary }}>
                {secondary}
              </p>
            </div>
          </div>
          {!config.hide_nelvyon_branding ? (
            <p className="mt-4 text-xs text-muted-foreground">Branding NELVYON visible</p>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default function WhiteLabelPage() {
  const { refresh, setPreview } = useWhitelabel();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dns, setDns] = useState<DnsInstructions | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    custom_domain: "",
    logo_url: "",
    favicon_url: "",
    primary_color: DEFAULT_PRIMARY,
    secondary_color: DEFAULT_SECONDARY,
    font: "Inter" as (typeof WHITELABEL_FONTS)[number],
    support_email: "",
    custom_email_from_name: "",
    custom_email_from_address: "",
    hide_nelvyon_branding: false,
    custom_css: "",
    verified_domain: false,
  });

  const previewConfig = useMemo<WhitelabelApplyConfig>(
    () => ({
      company_name: form.company_name || "Tu empresa",
      brand_name: form.company_name || "Tu empresa",
      logo_url: form.logo_url || null,
      favicon_url: form.favicon_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      font: form.font,
      hide_nelvyon_branding: form.hide_nelvyon_branding,
      custom_css: form.custom_css,
      css_variables: {
        "--primary-color": form.primary_color,
        "--secondary-color": form.secondary_color,
        "--font-family": `"${form.font}", system-ui, sans-serif`,
      },
    }),
    [form],
  );

  useEffect(() => {
    setPreview(previewConfig);
    return () => setPreview(null);
  }, [previewConfig, setPreview]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await whitelabelApi.getConfig();
      setForm({
        company_name: cfg.brand_name ?? "",
        custom_domain: cfg.custom_domain ?? "",
        logo_url: cfg.logo_url ?? "",
        favicon_url: cfg.favicon_url ?? "",
        primary_color: cfg.primary_color ?? DEFAULT_PRIMARY,
        secondary_color: cfg.secondary_color ?? DEFAULT_SECONDARY,
        font: (WHITELABEL_FONTS.includes((cfg.font as typeof form.font) ?? "Inter")
          ? cfg.font
          : "Inter") as typeof form.font,
        support_email: cfg.support_email ?? "",
        custom_email_from_name: cfg.custom_email_from_name ?? "",
        custom_email_from_address: cfg.custom_email_from_address ?? "",
        hide_nelvyon_branding: Boolean(cfg.hide_nelvyon_branding),
        custom_css: cfg.custom_css ?? "",
        verified_domain: Boolean(cfg.verified_domain),
      });
      if (cfg.custom_domain) {
        whitelabelApi.dnsInstructions().then(setDns).catch(() => setDns(null));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function uploadLogo(file: File, field: "logo_url" | "favicon_url") {
    setMsg(null);
    const res = (await dashboardStorageApi.upload("whitelabel", file)) as { url?: string };
    if (res.url) {
      setForm((f) => ({ ...f, [field]: res.url! }));
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const body: Partial<WhitelabelConfig> & { company_name: string } = {
        company_name: form.company_name,
        brand_name: form.company_name,
        custom_domain: form.custom_domain || undefined,
        logo_url: form.logo_url || undefined,
        favicon_url: form.favicon_url || undefined,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        font: form.font,
        support_email: form.support_email || undefined,
        custom_email_from_name: form.custom_email_from_name || undefined,
        custom_email_from_address: form.custom_email_from_address || undefined,
        hide_nelvyon_branding: form.hide_nelvyon_branding,
        custom_css: form.custom_css || undefined,
      };
      await whitelabelApi.saveConfig(body);
      await refresh();
      if (form.custom_domain) {
        const instructions = await whitelabelApi.dnsInstructions();
        setDns(instructions);
      }
      setMsg("Configuración guardada");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function verifyDomain() {
    setVerifying(true);
    setMsg(null);
    try {
      const result = await whitelabelApi.verifyDomain(form.custom_domain || undefined);
      setVerifyResult(result);
      setForm((f) => ({ ...f, verified_domain: Boolean(result.verified) }));
      if (result.verified) {
        setMsg("Dominio verificado correctamente");
        await refresh();
      } else {
        setMsg("Dominio aún no verificado — revisa los registros DNS");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al verificar dominio");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <ProtectedLayout module="settings">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando white-label…
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="settings">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">White-label</h1>
            <p className="text-sm text-muted-foreground">
              Personaliza dominio, marca, emails y experiencia para tus clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/white-label/clients">Clientes partner</Link>
            </Button>
            <Button onClick={() => load()} type="button" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Recargar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border p-4">
            <h2 className="font-semibold">Identidad de marca</h2>
            <label className="block text-sm">
              Nombre de la empresa
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                value={form.company_name}
              />
            </label>
            <label className="block text-sm">
              Email de soporte
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
                placeholder="soporte@tuempresa.com"
                type="email"
                value={form.support_email}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Logo
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-xs"
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="URL del logo"
                    value={form.logo_url}
                  />
                  <label className="cursor-pointer rounded-lg border px-2 py-2 hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file, "logo_url");
                      }}
                      type="file"
                    />
                  </label>
                </div>
              </label>
              <label className="block text-sm">
                Favicon
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-xs"
                    onChange={(e) => setForm((f) => ({ ...f, favicon_url: e.target.value }))}
                    placeholder="URL favicon"
                    value={form.favicon_url}
                  />
                  <label className="cursor-pointer rounded-lg border px-2 py-2 hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file, "favicon_url");
                      }}
                      type="file"
                    />
                  </label>
                </div>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Color primario
                <input
                  className="mt-1 h-10 w-full rounded-lg border"
                  onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                  type="color"
                  value={form.primary_color}
                />
              </label>
              <label className="block text-sm">
                Color secundario
                <input
                  className="mt-1 h-10 w-full rounded-lg border"
                  onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                  type="color"
                  value={form.secondary_color}
                />
              </label>
            </div>
            <label className="block text-sm">
              Fuente
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                onChange={(e) => setForm((f) => ({ ...f, font: e.target.value as typeof form.font }))}
                value={form.font}
              >
                {WHITELABEL_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={form.hide_nelvyon_branding}
                onChange={(e) => setForm((f) => ({ ...f, hide_nelvyon_branding: e.target.checked }))}
                type="checkbox"
              />
              Ocultar branding NELVYON
            </label>
            <label className="block text-sm">
              CSS personalizado
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-lg border px-3 py-2 font-mono text-xs"
                onChange={(e) => setForm((f) => ({ ...f, custom_css: e.target.value }))}
                placeholder=":root { --radius: 0.5rem; }"
                value={form.custom_css}
              />
            </label>
          </div>

          <div className="space-y-4">
            <PreviewPanel config={previewConfig} />

            <div className="space-y-3 rounded-xl border p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <Globe className="h-4 w-4" /> Dominio personalizado
              </h2>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))}
                placeholder="app.tuempresa.com"
                value={form.custom_domain}
              />
              {form.verified_domain ? (
                <p className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Dominio verificado
                </p>
              ) : null}
              {dns ? (
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  <p className="font-medium">Registro TXT</p>
                  <p>
                    Host: <code>{dns.txt_host}</code>
                  </p>
                  <p>
                    Valor: <code>{dns.txt_value}</code>
                  </p>
                  <p className="mt-2 font-medium">CNAME (opcional)</p>
                  <p>
                    <code>{dns.domain}</code> → <code>{dns.cname_target}</code>
                  </p>
                </div>
              ) : null}
              <Button disabled={!form.custom_domain || verifying} onClick={() => void verifyDomain()} type="button">
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verificar dominio
              </Button>
              {verifyResult && !verifyResult.verified ? (
                <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(verifyResult, null, 2)}
                </pre>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <h2 className="font-semibold">Email white-label</h2>
              <label className="block text-sm">
                Nombre remitente (SMTP)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  onChange={(e) => setForm((f) => ({ ...f, custom_email_from_name: e.target.value }))}
                  value={form.custom_email_from_name}
                />
              </label>
              <label className="block text-sm">
                Email remitente
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  onChange={(e) => setForm((f) => ({ ...f, custom_email_from_address: e.target.value }))}
                  placeholder="noreply@tuempresa.com"
                  type="email"
                  value={form.custom_email_from_address}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Tras verificar el dominio, SES enviará campañas y reportes desde esta dirección.
              </p>
            </div>
          </div>
        </div>

        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar configuración
        </Button>
      </div>
    </ProtectedLayout>
  );
}
