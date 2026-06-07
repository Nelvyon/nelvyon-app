"use client";

import { useRef, useState } from "react";

import { ApiError } from "@/core/api/types";
import { OsPrimaryButton } from "@/features/os-shell/components/ui/OsUi";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import { deliverableHasAttachedFile } from "@/features/os-shell/deliverables/attachment";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.svg,.zip,.docx,.xlsx";

export function OsDeliverableUploadPanel({
  deliverable,
  onUploaded,
}: {
  deliverable: OsDeliverable;
  onUploaded: (updated: OsDeliverable) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await osDeliverablesApi.uploadFile(deliverable.id, file);
      onUploaded(updated);
      setSuccess(`Archivo subido: ${file.name}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al subir el archivo");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const hasStorage = Boolean(deliverable.storage_key?.trim());
  const hasManualUrl = Boolean(deliverable.file_url?.trim());

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Archivo adjunto</p>
          {deliverableHasAttachedFile(deliverable) ? (
            <p className="mt-1 text-xs text-white/55">
              {hasStorage ? "Almacenamiento privado (storage_key)" : null}
              {hasStorage && hasManualUrl ? " · " : null}
              {hasManualUrl ? "URL manual configurada" : null}
              {!hasStorage && !hasManualUrl ? "Disponible" : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-white/45">Sin archivo adjunto</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          <OsPrimaryButton
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? "Subiendo…" : "Subir archivo"}
          </OsPrimaryButton>
          {hasManualUrl ? (
            <a
              href={deliverable.file_url!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 text-sm text-white/85 hover:border-white/25 hover:bg-white/5"
            >
              Abrir URL manual
            </a>
          ) : null}
        </div>
      </div>
      {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
