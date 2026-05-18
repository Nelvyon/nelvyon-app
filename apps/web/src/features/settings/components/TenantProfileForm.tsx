"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { SETTINGS_TIMEZONES, tenantProfileSchema } from "@/features/settings/schema";
import { TenantSettingsUpdateInput } from "@/features/settings/types";

interface TenantProfileFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  initialName: string;
  initialLogoUrl?: string | null;
  initialTimezone: string;
  onSubmit: (values: TenantSettingsUpdateInput) => Promise<void> | void;
}

export function TenantProfileForm({
  canSubmit,
  isSubmitting = false,
  initialName,
  initialLogoUrl,
  initialTimezone,
  onSubmit,
}: TenantProfileFormProps) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [timezone, setTimezone] = useState(() =>
    SETTINGS_TIMEZONES.includes(initialTimezone as (typeof SETTINGS_TIMEZONES)[number])
      ? initialTimezone
      : "UTC",
  );
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setName(initialName);
    setLogoUrl(initialLogoUrl ?? "");
    setTimezone(
      SETTINGS_TIMEZONES.includes(initialTimezone as (typeof SETTINGS_TIMEZONES)[number])
        ? initialTimezone
        : "UTC",
    );
  }, [initialName, initialLogoUrl, initialTimezone]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = tenantProfileSchema.safeParse({
      name,
      logo_url: logoUrl,
      timezone,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    const payload: TenantSettingsUpdateInput = {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
    };
    if (parsed.data.logo_url) {
      payload.logo_url = parsed.data.logo_url;
    }
    await onSubmit(payload);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-name`}>
          Workspace name
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-name`}
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-logo`}>
          Logo URL
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-logo`}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          value={logoUrl}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-timezone`}>
          Timezone
        </label>
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          id={`${id}-timezone`}
          onChange={(e) => setTimezone(e.target.value)}
          value={timezone}
        >
          {SETTINGS_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canSubmit && <p className="text-sm text-warning-foreground">Only operator/admin can edit workspace profile.</p>}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save workspace"}
      </Button>
    </form>
  );
}
