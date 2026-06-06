"use client";

import { OS_TASK_PRIORITY_OPTIONS, OS_TASK_STATUS_OPTIONS } from "@/features/os-shell/constants";
import { OsAssigneeInput } from "@/features/os-shell/components/OsAssigneeInput";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";
import type { OsClientPickerRow } from "@/features/os-shell/clients/types";
import type { OsProject } from "@/features/os-shell/projects/types";

import type { OsTaskWriteInput } from "./types";

const STATUS_WRITE = OS_TASK_STATUS_OPTIONS.filter((o) => o.value !== "");
const PRIORITY_WRITE = OS_TASK_PRIORITY_OPTIONS.filter((o) => o.value !== "");

export function OsTaskForm({
  value,
  onChange,
  clients,
  projects,
  disabled,
}: {
  value: OsTaskWriteInput;
  onChange: (v: OsTaskWriteInput) => void;
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
          {STATUS_WRITE.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Prioridad">
        <OsSelect
          value={value.priority ?? "media"}
          onChange={(e) => onChange({ ...value, priority: e.target.value })}
          disabled={disabled}
        >
          {PRIORITY_WRITE.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Fecha límite">
        <OsInput
          type="date"
          value={value.due_date?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...value, due_date: e.target.value || null })}
          disabled={disabled}
        />
      </OsField>
      <OsAssigneeInput
        value={value.assignee ?? ""}
        onChange={(v) => onChange({ ...value, assignee: v || null })}
        className={disabled ? "pointer-events-none opacity-60" : ""}
      />
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
          <option value="">—</option>
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
          <option value="">—</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <div className="md:col-span-2">
        <OsField label="Descripción">
        <OsTextarea
          value={value.description ?? ""}
          onChange={(e) => onChange({ ...value, description: e.target.value || null })}
          disabled={disabled}
          rows={3}
        />
      </OsField>
      </div>
    </div>
  );
}

export function emptyOsTaskForm(preset?: {
  client_id?: number;
  project_id?: number;
}): OsTaskWriteInput {
  return {
    title: "",
    status: "pendiente",
    priority: "media",
    due_date: null,
    client_id: preset?.client_id ?? null,
    project_id: preset?.project_id ?? null,
    assignee: null,
    description: null,
  };
}
