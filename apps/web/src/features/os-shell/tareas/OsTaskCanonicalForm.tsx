"use client";

import { OsAssigneeInput } from "@/features/os-shell/components/OsAssigneeInput";
import { OsField, OsInput, OsSelect, OsTextarea } from "@/features/os-shell/components/ui/OsUi";
import type { OsClient } from "@/features/os-shell/clients/types";
import type { OsCanonicalProject } from "@/features/os-shell/projects/types";
import {
  OS_CANONICAL_TASK_PRIORITY_FORM_OPTIONS,
  OS_CANONICAL_TASK_STATUS_FORM_OPTIONS,
} from "@/features/os-shell/tareas/taskStatus";
import type { OsTaskCreateInput } from "@/features/os-shell/tareas/types";

export function emptyOsTaskCanonicalForm(preset?: {
  client_id?: string;
  project_id?: string;
}): OsTaskCreateInput {
  return {
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    due_date: "",
    client_id: preset?.client_id,
    project_id: preset?.project_id,
    assignee: "",
  };
}

export function OsTaskCanonicalForm({
  value,
  onChange,
  clients,
  projects,
  disabled,
}: {
  value: OsTaskCreateInput;
  onChange: (v: OsTaskCreateInput) => void;
  clients: OsClient[];
  projects: OsCanonicalProject[];
  disabled?: boolean;
}) {
  const clientProjects = value.client_id
    ? projects.filter((p) => p.client_id === value.client_id)
    : projects;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <OsField label="Título *">
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
          value={value.status ?? "pending"}
          onChange={(e) => onChange({ ...value, status: e.target.value as OsTaskCreateInput["status"] })}
          disabled={disabled}
        >
          {OS_CANONICAL_TASK_STATUS_FORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OsSelect>
      </OsField>
      <OsField label="Prioridad">
        <OsSelect
          value={value.priority ?? "medium"}
          onChange={(e) =>
            onChange({ ...value, priority: e.target.value as OsTaskCreateInput["priority"] })
          }
          disabled={disabled}
        >
          {OS_CANONICAL_TASK_PRIORITY_FORM_OPTIONS.map((o) => (
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
          onChange={(e) => onChange({ ...value, due_date: e.target.value || undefined })}
          disabled={disabled}
        />
      </OsField>
      <OsAssigneeInput
        value={value.assignee ?? ""}
        onChange={(v) => onChange({ ...value, assignee: v || undefined })}
        className={disabled ? "pointer-events-none opacity-60" : ""}
      />
      <OsField label="Cliente">
        <OsSelect
          value={value.client_id ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              client_id: e.target.value || undefined,
              project_id: undefined,
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
          onChange={(e) => onChange({ ...value, project_id: e.target.value || undefined })}
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
            onChange={(e) => onChange({ ...value, description: e.target.value || undefined })}
            disabled={disabled}
            rows={3}
          />
        </OsField>
      </div>
    </div>
  );
}
