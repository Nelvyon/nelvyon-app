"use client";

import type { OsDeliverableCreateInput, OsDeliverableUpdateInput } from "@/features/os-shell/deliverables/types";
import type { OsCanonicalClient, OsCanonicalProject } from "@/features/os-shell/deliverables/types";
import { OS_DELIVERABLE_VISIBILITY_OPTIONS } from "@/features/os-shell/deliverables/deliverableStatus";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";

export function emptyDeliverableForm(
  preset?: Partial<OsDeliverableCreateInput>,
): OsDeliverableCreateInput {
  return {
    client_id: preset?.client_id ?? "",
    project_id: preset?.project_id ?? "",
    task_id: preset?.task_id,
    title: preset?.title ?? "",
    description: preset?.description ?? "",
    type: preset?.type ?? "document",
    visibility: preset?.visibility ?? "internal",
    file_url: preset?.file_url ?? "",
    review_notes: preset?.review_notes ?? "",
  };
}

export function OsDeliverableForm({
  value,
  onChange,
  clients,
  projects,
  disabled,
}: {
  value: OsDeliverableCreateInput | OsDeliverableUpdateInput;
  onChange: (next: OsDeliverableCreateInput | OsDeliverableUpdateInput) => void;
  clients: OsCanonicalClient[];
  projects: OsCanonicalProject[];
  disabled?: boolean;
}) {
  const filteredProjects = projects.filter(
    (p) => !value.client_id || p.client_id === value.client_id,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OsField label="Cliente *">
        <OsSelect
          value={value.client_id ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, client_id: e.target.value, project_id: "" })}
        >
          <option value="">Seleccionar…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Proyecto *">
        <OsSelect
          value={value.project_id ?? ""}
          disabled={disabled || !value.client_id}
          onChange={(e) => onChange({ ...value, project_id: e.target.value })}
        >
          <option value="">Seleccionar…</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <div className="md:col-span-2">
        <OsField label="Título *">
          <OsInput
            value={value.title ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </OsField>
      </div>
      <OsField label="Tipo">
        <OsInput
          value={value.type ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          placeholder="document, report, design…"
        />
      </OsField>
      <OsField label="Visibilidad">
        <OsSelect
          value={value.visibility ?? "internal"}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              visibility: e.target.value as "internal" | "client_visible",
            })
          }
        >
          {OS_DELIVERABLE_VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <div className="md:col-span-2">
        <OsField label="URL archivo">
          <OsInput
            value={value.file_url ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, file_url: e.target.value })}
            placeholder="https://…"
          />
        </OsField>
      </div>
      <div className="md:col-span-2">
        <OsField label="Descripción">
          <OsTextarea
            value={value.description ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
          />
        </OsField>
      </div>
      <div className="md:col-span-2">
        <OsField label="Notas internas">
          <OsTextarea
            value={value.review_notes ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, review_notes: e.target.value })}
          />
        </OsField>
      </div>
    </div>
  );
}
