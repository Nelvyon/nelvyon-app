"use client";

import { OS_DEAL_STATUS_OPTIONS } from "@/features/os-shell/constants";
import { OsAssigneeInput } from "@/features/os-shell/components/OsAssigneeInput";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";
import type { OsClientPickerRow } from "@/features/os-shell/clients/types";
import type { OsProject } from "@/features/os-shell/projects/types";

import type { OsDealWriteInput } from "./types";

export function OsDealForm({
  value,
  onChange,
  clients,
  projects,
  disabled,
}: {
  value: OsDealWriteInput;
  onChange: (v: OsDealWriteInput) => void;
  clients: OsClientPickerRow[];
  projects: OsProject[];
  disabled?: boolean;
}) {
  const clientProjects = value.client_id
    ? projects.filter((p) => p.client_id === value.client_id)
    : projects;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <OsField label="Título">
        <OsInput
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          disabled={disabled}
          required
        />
      </OsField>
      </div>
      <OsField label="Estado">
        <OsSelect
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          disabled={disabled}
        >
          {OS_DEAL_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Valor estimado (EUR)">
        <OsInput
          type="number"
          min={0}
          step="0.01"
          value={value.estimated_value ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              estimated_value: e.target.value ? Number(e.target.value) : null,
            })
          }
          disabled={disabled}
        />
      </OsField>
      <OsField label="Cliente">
        <OsSelect
          value={value.client_id ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              client_id: e.target.value ? Number(e.target.value) : null,
              project_id: null,
            })
          }
          disabled={disabled}
        >
          <option value="">— Sin cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Proyecto">
        <OsSelect
          value={value.project_id ?? ""}
          onChange={(e) =>
            onChange({ ...value, project_id: e.target.value ? Number(e.target.value) : null })
          }
          disabled={disabled}
        >
          <option value="">— Sin proyecto —</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsAssigneeInput
        value={value.assignee ?? ""}
        onChange={(v) => onChange({ ...value, assignee: v || null })}
        className={disabled ? "pointer-events-none opacity-60" : ""}
      />
      <div className="md:col-span-2">
        <OsField label="Notas">
        <OsTextarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value || null })}
          disabled={disabled}
          rows={4}
        />
      </OsField>
      </div>
    </div>
  );
}

export function emptyOsDealForm(preset?: {
  client_id?: number;
  project_id?: number;
}): OsDealWriteInput {
  return {
    title: "",
    status: "nuevo",
    client_id: preset?.client_id ?? null,
    project_id: preset?.project_id ?? null,
    estimated_value: null,
    assignee: null,
    notes: null,
  };
}
