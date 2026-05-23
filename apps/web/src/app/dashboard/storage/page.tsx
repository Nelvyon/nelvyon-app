"use client";

import { File, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardStorageApi } from "@/features/dashboard/api";

const BUCKET = "workspace";

interface StorageObject {
  key?: string;
  name?: string;
  size?: number;
  last_modified?: string;
}

export default function StorageDashboardPage() {
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await dashboardStorageApi.listObjects(BUCKET);
    setObjects((res.objects as StorageObject[]) ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setObjects([]));
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        await dashboardStorageApi.upload(BUCKET, file);
      }
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(key: string) {
    await dashboardStorageApi.delete(BUCKET, key);
    load();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Storage</h1>
            <p className="text-sm text-muted-foreground">Archivos del workspace (bucket: {BUCKET})</p>
          </div>
          <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "Subiendo…" : "Subir archivo"}
          </Button>
          <input
            className="hidden"
            multiple
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            ref={inputRef}
            type="file"
          />
        </div>

        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
          }`}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDrop={onDrop}
        >
          <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Arrastra archivos aquí o usa el botón de subir</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {objects.map((obj) => {
            const key = String(obj.key ?? obj.name ?? "");
            const label = key.split("/").pop() ?? key;
            return (
              <article className="rounded-xl border bg-card p-4 shadow-card" key={key}>
                <div className="flex items-start justify-between gap-2">
                  <File className="h-8 w-8 shrink-0 text-primary" />
                  <button
                    aria-label="Eliminar"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(key)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 truncate text-sm font-medium" title={label}>
                  {label}
                </p>
                {obj.size != null ? (
                  <p className="text-xs text-muted-foreground">{(obj.size / 1024).toFixed(1)} KB</p>
                ) : null}
                {obj.last_modified ? (
                  <p className="text-xs text-muted-foreground">
                    {new Date(String(obj.last_modified)).toLocaleDateString("es-ES")}
                  </p>
                ) : null}
              </article>
            );
          })}
          {!objects.length ? (
            <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay archivos en el bucket
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedLayout>
  );
}
