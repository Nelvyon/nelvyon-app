"use client";

import { useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { parseHexColor, validateHttpsLogoUrl } from "@/features/branding/validation";
import { useBrandingPolicy } from "@/features/branding/policyHooks";
import { useTenantSettings } from "@/features/settings/hooks";

function stateForField(
  fields: { field: string; state: "enabled" | "blocked" | "inherited"; reason: string }[] | undefined,
  key: string,
) {
  return fields?.find((f) => f.field === key);
}

/** WHITE-LABEL / BRANDING v2 — Flow 3: local preview matrix governed by effective policy. */
export default function BrandingPreviewV2Page() {
  const policyQuery = useBrandingPolicy();
  const tenantQuery = useTenantSettings();
  const policy = policyQuery.data;
  const tenant = tenantQuery.data;

  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accent, setAccent] = useState("");

  const slugPolicy = stateForField(policy?.fields, "slug");
  const logoPolicy = stateForField(policy?.fields, "logo_url");
  const accentPolicy = stateForField(policy?.fields, "accent_color");
  const previewAccent = useMemo(() => parseHexColor(accent) ?? "#6366f1", [accent]);

  const slugBlocked = Boolean(slug.trim()) && slugPolicy && slugPolicy.state !== "enabled";
  const logoBlocked = Boolean(logoUrl.trim()) && logoPolicy && logoPolicy.state !== "enabled";
  const accentBlocked = Boolean(accent.trim()) && accentPolicy && accentPolicy.state !== "enabled";
  const logoValid = validateHttpsLogoUrl(logoUrl);
  const accentValid = !accent.trim() || Boolean(parseHexColor(accent));

  return (
    <ProtectedLayout module="branding">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Tenant preview matrix</h2>
            <Badge tone="neutral">WHITE-LABEL v2</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Local preview only. It validates inputs against effective tenant branding policy and shows blocked/allowed states
            without applying global runtime changes.
          </p>
        </header>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Policy matrix</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              { key: "slug", policy: slugPolicy },
              { key: "logo_url", policy: logoPolicy },
              { key: "accent_color", policy: accentPolicy },
            ].map(({ key, policy: p }) => (
              <article className="rounded-md border border-border p-3" key={key}>
                <p className="font-medium text-foreground">{p?.field || "loading"}</p>
                <p className="text-muted-foreground">state: {p?.state || "…"}</p>
                <p className="text-muted-foreground">reason: {p?.reason || "…"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Try combinations</h3>
          <label className="block space-y-1 text-sm">
            Slug
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(e) => setSlug(e.target.value)}
              placeholder={tenant?.slug || "workspace-slug"}
              value={slug}
            />
          </label>
          {slugBlocked ? <p className="text-sm text-destructive">Blocked by policy: {slugPolicy?.reason}</p> : null}

          <label className="block space-y-1 text-sm">
            Logo URL (HTTPS)
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={tenant?.logo_url || "https://cdn.example.com/logo.svg"}
              value={logoUrl}
            />
          </label>
          {logoBlocked ? <p className="text-sm text-destructive">Blocked by policy: {logoPolicy?.reason}</p> : null}
          {!logoBlocked && !logoValid.ok ? <p className="text-sm text-destructive">{logoValid.message}</p> : null}

          <label className="block space-y-1 text-sm">
            Accent color
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(e) => setAccent(e.target.value)}
              placeholder={tenant?.primary_color || "#0084fc"}
              value={accent}
            />
          </label>
          {accentBlocked ? <p className="text-sm text-destructive">Blocked by policy: {accentPolicy?.reason}</p> : null}
          {!accentBlocked && !accentValid ? (
            <p className="text-sm text-destructive">Use a valid 6-digit hex color.</p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Preview output</h3>
          {slugBlocked || logoBlocked || accentBlocked ? (
            <p className="text-sm text-destructive">Blocked by effective policy. No runtime branding changes are applied.</p>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4" style={{ borderTop: `4px solid ${previewAccent}` }}>
              <div className="flex items-center gap-3">
                {logoUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of tenant-provided URL
                  <img alt="" className="h-10 w-10 rounded-md border border-border bg-background p-1 object-contain" src={logoUrl.trim()} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    Logo
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{tenant?.name || "Workspace"}</p>
                  <p className="text-xs text-muted-foreground">{slug || tenant?.slug || "workspace"}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  );
}
