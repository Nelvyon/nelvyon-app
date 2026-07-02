"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { parseHexColor, validateHttpsLogoUrl } from "@/features/branding/validation";
import { useTenantSettings, useUpdateTenantSettings } from "@/features/settings/hooks";

export default function WorkspaceBrandingV1Page() {
  const { user } = useAuth();
  const tenantQuery = useTenantSettings();
  const updateTenant = useUpdateTenantSettings();
  const canEdit = user ? canPerformAction(user.role, "branding", "edit") : false;

  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accent, setAccent] = useState("");
  const [accentError, setAccentError] = useState<string | null>(null);
  const [logoUrlError, setLogoUrlError] = useState<string | null>(null);

  useEffect(() => {
    const d = tenantQuery.data;
    if (!d) return;
    setSlug(d.slug ?? "");
    setLogoUrl(d.logo_url ?? "");
    setAccent(d.primary_color ?? "");
  }, [tenantQuery.data]);

  const previewAccent = useMemo(() => parseHexColor(accent) ?? "#6366f1", [accent]);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setAccentError(null);
    setLogoUrlError(null);
    const trimmedAccent = accent.trim();
    if (trimmedAccent && !parseHexColor(trimmedAccent)) {
      setAccentError("Use a 6-digit hex color (for example #0084fc or 2563eb).");
      return;
    }
    const logoCheck = validateHttpsLogoUrl(logoUrl);
    if (!logoCheck.ok) {
      setLogoUrlError(logoCheck.message);
      return;
    }
    await updateTenant.mutateAsync({
      slug: slug.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
      primary_color: trimmedAccent ? parseHexColor(trimmedAccent)! : undefined,
    });
  };

  const tenant = tenantQuery.data;

  return (
    <ProtectedLayout module="branding">
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Workspace branding</h2>
            <Badge tone="neutral">NELVYON v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            White-label v1 stores your public-facing markers on the workspace tenant record: slug, logo URL, and accent
            color. Custom domains, CDN asset hosting, and a full shell re-skin are not claimed here—they ship as separate
            layers when ready.
          </p>
          <p className="text-xs text-muted-foreground">
            Branding v2 advanced policy surfaces are available at{" "}
            <Link className="text-link underline" href="/app/branding/policy">
              /app/branding/policy
            </Link>{" "}
            and{" "}
            <Link className="text-link underline" href="/app/branding/preview-v2">
              /app/branding/preview-v2
            </Link>
            .
          </p>
        </header>

        {tenantQuery.error instanceof ApiError && tenantQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Branding data is not available for this workspace with your current role or workspace selection.</p>
          </ForbiddenNotice>
        ) : null}
        {tenantQuery.error && !(tenantQuery.error instanceof ApiError && tenantQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>We could not load tenant branding. Retry after confirming workspace context.</p>
          </ErrorNotice>
        ) : null}

        {tenant ? (
          <>
            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Flow 1 · Current workspace markers</h3>
              <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide">Workspace name</dt>
                  <dd className="font-medium text-foreground">{tenant.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">Slug</dt>
                  <dd className="font-medium text-foreground">{tenant.slug || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide">Logo URL</dt>
                  <dd className="break-all font-medium text-foreground">{tenant.logo_url || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">Accent color</dt>
                  <dd className="font-medium text-foreground">{tenant.primary_color || "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Flow 2 · Update markers</h3>
              <p className="text-xs text-muted-foreground">
                Operators can save changes. Members can review values here; ask an operator to adjust fields if needed.
              </p>
              <form className="space-y-4" onSubmit={onSave}>
                <label className="block space-y-1 text-sm text-foreground">
                  Public slug
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!canEdit}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="acme-workspace"
                    value={slug}
                  />
                </label>
                <label className="block space-y-1 text-sm text-foreground">
                  Logo URL (HTTPS)
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!canEdit}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/logo.svg"
                    type="url"
                    value={logoUrl}
                  />
                </label>
                <label className="block space-y-1 text-sm text-foreground">
                  Accent color (hex)
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!canEdit}
                    onChange={(e) => {
                      setAccent(e.target.value);
                      setAccentError(null);
                    }}
                    placeholder="#0084fc"
                    value={accent}
                  />
                </label>
                {logoUrlError ? <p className="text-sm text-destructive">{logoUrlError}</p> : null}
                {accentError ? <p className="text-sm text-destructive">{accentError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!canEdit || updateTenant.isPending} type="submit">
                    {updateTenant.isPending ? "Saving…" : "Save branding"}
                  </Button>
                </div>
                {updateTenant.error instanceof ApiError && updateTenant.error.status === 403 ? (
                  <p className="text-sm text-warning-foreground">Your role cannot update branding fields.</p>
                ) : null}
                {updateTenant.error && !(updateTenant.error instanceof ApiError && updateTenant.error.status === 403) ? (
                  <p className="text-sm text-destructive">Save failed. Check values and try again.</p>
                ) : null}
              </form>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">Flow 3 · Preview (local only)</h3>
              <p className="text-xs text-muted-foreground">
                This card shows how accent and logo could read on a simple client header. It does not re-theme the entire
                product shell yet.
              </p>
              <div
                className="rounded-lg border border-border bg-muted/30 p-4"
                style={{ borderTop: `4px solid ${previewAccent}` }}
              >
                <div className="flex items-center gap-3">
                  {logoUrl.trim() ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                      { }
                      <img alt="" className="h-full w-full object-contain p-1" src={logoUrl.trim()} />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                      Logo
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{slug || tenant.slug || "workspace"}</p>
                  </div>
                </div>
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              Timezone, locale, and security review stay in{" "}
              <Link className="text-link underline" href="/settings">
                workspace settings
              </Link>
              .
            </p>
          </>
        ) : tenantQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading branding…</p>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
