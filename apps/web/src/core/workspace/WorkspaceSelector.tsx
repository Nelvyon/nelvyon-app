"use client";

import React, { useEffect, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { useCreateWorkspace, useWorkspaceList } from "@/features/workspace/hooks";

export function WorkspaceSelector() {
  const { user, accessToken } = useAuth();
  const { workspaceId, setWorkspaceId } = useWorkspace();
  const list = useWorkspaceList(Boolean(user && accessToken));
  const createMutation = useCreateWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!list.isSuccess || !list.data?.length || workspaceId) return;
    setWorkspaceId(String(list.data[0].id));
  }, [list.isSuccess, list.data, workspaceId, setWorkspaceId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const created = await createMutation.mutateAsync({ name });
    setWorkspaceId(String(created.id));
    trackProductEvent("workspace_created", { workspace_id: created.id });
    setNewName("");
    setShowCreate(false);
  };

  if (!user || !accessToken) {
    return null;
  }

  if (list.isLoading) {
    return <span className="text-xs text-muted-foreground">Cargando workspaces…</span>;
  }

  if (list.error) {
    return <span className="text-xs text-destructive">Workspaces no disponibles</span>;
  }

  const items = list.data ?? [];

  return (
    <PanelCard className="flex flex-wrap items-center gap-3 p-3 shadow-none sm:p-3">
      <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm text-foreground">
        <span className="shrink-0 text-muted-foreground">Workspace</span>
        <select
          aria-label="workspace-selector"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={!items.length}
          onChange={(event) => {
            const next = event.target.value || null;
            setWorkspaceId(next);
            if (next) {
              trackProductEvent("workspace_selected", { workspace_id: next });
            }
          }}
          value={workspaceId ?? ""}
        >
          {!items.length ? <option value="">Sin workspaces</option> : null}
          {items.map((ws) => (
            <option key={ws.id} value={String(ws.id)}>
              {ws.name}
            </option>
          ))}
        </select>
      </label>
      {!showCreate ? (
        <Button onClick={() => setShowCreate(true)} size="sm" type="button" variant="outline">
          Nuevo workspace
        </Button>
      ) : (
        <form className="flex flex-wrap items-center gap-1" onSubmit={onCreate}>
          <input
            aria-label="New workspace name"
            className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre"
            value={newName}
          />
          <Button disabled={createMutation.isPending} size="sm" type="submit" variant="secondary">
            Crear
          </Button>
          <Button
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
        </form>
      )}
    </PanelCard>
  );
}
