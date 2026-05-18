"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import type { IntakeField } from "@/lib/os/intakeTypes";
import { isPremiumServiceId } from "@/lib/os/premiumServiceIds";

const FIELD_TU_EMPRESA = new Set(["clientName", "industry", "targetAudience"]);
const FIELD_IDENTIDAD = new Set(["tone", "competitors", "primaryColor", "secondaryColor", "logoUrl", "referenceUrls"]);
const FIELD_FINALES = new Set(["budget", "deadline", "additionalNotes"]);

function sectionKey(name: string): "empresa" | "identidad" | "proyecto" | "finales" {
  if (FIELD_TU_EMPRESA.has(name)) return "empresa";
  if (FIELD_IDENTIDAD.has(name)) return "identidad";
  if (FIELD_FINALES.has(name)) return "finales";
  return "proyecto";
}

function buildSubmissionRecord(fields: IntakeField[], values: Record<string, string>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name] ?? "";
    if (f.type === "multiselect") {
      o[f.name] = v
        .split(/\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (f.type === "boolean") {
      o[f.name] = v === "true";
    } else if (f.type === "number") {
      o[f.name] = v.trim() === "" ? "" : Number(v);
    } else {
      o[f.name] = v;
    }
  }
  return o;
}

function groupFields(fields: IntakeField[]) {
  const empresa: IntakeField[] = [];
  const identidad: IntakeField[] = [];
  const proyecto: IntakeField[] = [];
  const finales: IntakeField[] = [];
  for (const f of fields) {
    const s = sectionKey(f.name);
    if (s === "empresa") empresa.push(f);
    else if (s === "identidad") identidad.push(f);
    else if (s === "finales") finales.push(f);
    else proyecto.push(f);
  }
  return { empresa, identidad, proyecto, finales };
}

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-card outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring";

function FieldBlock({
  f,
  value,
  onChange,
  error,
}: {
  f: IntakeField;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const labelText = (
    <span className="text-sm font-medium text-foreground">
      {f.label}
      {f.required ? <span className="text-destructive"> *</span> : null}
    </span>
  );

  let control: ReactNode;
  switch (f.type) {
    case "textarea":
      control = (
        <textarea
          id={f.name}
          className={`${inputClass} min-h-[96px] resize-y`}
          required={f.required}
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
      break;
    case "select":
      control = (
        <select
          id={f.name}
          className={`${inputClass} h-10`}
          required={f.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">{f.placeholder ?? "—"}</option>
          {(f.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;
    case "multiselect":
      control = (
        <textarea
          id={f.name}
          className={`${inputClass} min-h-[88px] resize-y`}
          required={f.required}
          placeholder={f.placeholder ?? "Un valor por línea"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
      break;
    case "boolean":
      control = (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-border bg-card text-primary shadow-card"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            aria-invalid={Boolean(error)}
          />
          <span>Marcar como sí</span>
        </label>
      );
      break;
    case "number":
      control = (
        <input
          id={f.name}
          type="number"
          min={0}
          className={`${inputClass} h-10`}
          required={f.required}
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
      break;
    case "color":
      control = (
        <input
          id={f.name}
          type="color"
          className="h-12 w-full max-w-[120px] cursor-pointer rounded-md border border-border bg-card p-1 shadow-card"
          required={f.required}
          value={value.length >= 4 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
      break;
    case "url":
      control = (
        <input
          id={f.name}
          type="url"
          inputMode="url"
          className={`${inputClass} h-10`}
          required={f.required}
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
      break;
    default:
      control = (
        <input
          id={f.name}
          type="text"
          className={`${inputClass} h-10`}
          required={f.required}
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      );
  }

  if (f.type === "boolean") {
    return (
      <div className="flex flex-col gap-1.5">
        {labelText}
        {control}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5" htmlFor={f.name}>
        {labelText}
        {control}
      </label>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function OsIntakePage() {
  const params = useParams();
  const serviceIdRaw = typeof params?.serviceId === "string" ? params.serviceId : "";
  const serviceId = serviceIdRaw;
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? "";

  const [fields, setFields] = useState<IntakeField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serviceLabel, setServiceLabel] = useState(serviceId);

  const grouped = useMemo(() => groupFields(fields), [fields]);

  useEffect(() => {
    if (!isPremiumServiceId(serviceId)) {
      setFields([]);
      setLoadError("Servicio no reconocido.");
      return;
    }
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/os/intake/${encodeURIComponent(serviceId)}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setLoadError(`No se pudo cargar el formulario (${res.status})`);
          return;
        }
        const data = (await res.json()) as { fields?: IntakeField[]; serviceLabel?: string };
        const list = Array.isArray(data.fields) ? data.fields : [];
        if (!cancelled) {
          if (typeof data.serviceLabel === "string" && data.serviceLabel.length > 0) {
            setServiceLabel(data.serviceLabel);
          }
          setFields(list);
          setValues((prev) => {
            const next = { ...prev };
            for (const f of list) {
              if (next[f.name] !== undefined) continue;
              if (f.type === "color") {
                next[f.name] = f.name === "primaryColor" ? "#0f172a" : "#64748b";
              } else if (f.type === "boolean") {
                next[f.name] = "false";
              } else {
                next[f.name] = "";
              }
            }
            return next;
          });
        }
      } catch {
        if (!cancelled) setLoadError("Error de red al cargar el formulario.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const setField = useCallback((name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!isPremiumServiceId(serviceId) || !tenantId) return;

      const record = buildSubmissionRecord(fields, values);
      setFieldErrors({});

      setSubmitting(true);
      try {
        const res = await fetch(`/api/os/intake/${encodeURIComponent(serviceId)}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const body = (await res.json()) as { valid?: boolean; intakeId?: string; errors?: Record<string, string> };
        if (!res.ok) {
          setFormError(`HTTP ${res.status}`);
          return;
        }
        if (body.valid === false && body.errors) {
          setFieldErrors(body.errors);
          return;
        }
        if (body.valid !== true || typeof body.intakeId !== "string" || body.intakeId.length === 0) {
          setFormError("Respuesta inválida del servidor.");
          return;
        }

        window.location.assign(`/pricing?intakeId=${encodeURIComponent(body.intakeId)}&serviceId=${encodeURIComponent(serviceId)}`);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Error al enviar");
      } finally {
        setSubmitting(false);
      }
    },
    [fields, serviceId, tenantId, values],
  );

  if (!isPremiumServiceId(serviceId)) {
    return (
      <ProtectedLayout module="os">
        <div className="mx-auto max-w-3xl space-y-6 p-4 text-foreground md:p-8">
          <NelvyonDsCard title="Intake no disponible">
            <p className="text-sm text-muted-foreground">El identificador de servicio no es válido para OS premium.</p>
          </NelvyonDsCard>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-3xl space-y-8 p-4 text-foreground md:p-8">
        <NelvyonDsSectionHeader
          eyebrow="NELVYON OS"
          title={`Cuéntanos sobre tu proyecto — ${serviceLabel}`}
          subtitle="Completa el briefing antes del pago. Estos datos se entregan al agente OS como contexto de nivel agencia."
        />

        {loadError ? (
          <NelvyonDsCard title="Error">
            <p className="text-sm text-destructive">{loadError}</p>
          </NelvyonDsCard>
        ) : fields.length === 0 ? (
          <NelvyonDsCard title="Cargando">
            <p className="text-sm text-muted-foreground">Preparando formulario…</p>
          </NelvyonDsCard>
        ) : (
          <form className="space-y-8" onSubmit={(ev) => void onSubmit(ev)}>
            <NelvyonDsCard title="Tu empresa">
              <div className="flex flex-col gap-4">
                {grouped.empresa.map((f) => (
                  <FieldBlock key={f.name} f={f} value={values[f.name] ?? ""} onChange={(v) => setField(f.name, v)} error={fieldErrors[f.name]} />
                ))}
              </div>
            </NelvyonDsCard>

            <NelvyonDsCard title="Tu identidad visual">
              <div className="flex flex-col gap-4">
                {grouped.identidad.map((f) => (
                  <FieldBlock key={f.name} f={f} value={values[f.name] ?? ""} onChange={(v) => setField(f.name, v)} error={fieldErrors[f.name]} />
                ))}
              </div>
            </NelvyonDsCard>

            {grouped.proyecto.length > 0 ? (
              <NelvyonDsCard title="Tu proyecto">
                <div className="flex flex-col gap-4">
                  {grouped.proyecto.map((f) => (
                    <FieldBlock key={f.name} f={f} value={values[f.name] ?? ""} onChange={(v) => setField(f.name, v)} error={fieldErrors[f.name]} />
                  ))}
                </div>
              </NelvyonDsCard>
            ) : null}

            <NelvyonDsCard title="Detalles finales">
              <div className="flex flex-col gap-4">
                {grouped.finales.map((f) => (
                  <FieldBlock key={f.name} f={f} value={values[f.name] ?? ""} onChange={(v) => setField(f.name, v)} error={fieldErrors[f.name]} />
                ))}
              </div>
            </NelvyonDsCard>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <NelvyonDsButton type="submit" disabled={submitting || !tenantId}>
              {submitting ? "Procesando…" : "Continuar al pago"}
            </NelvyonDsButton>
          </form>
        )}
      </div>
    </ProtectedLayout>
  );
}
