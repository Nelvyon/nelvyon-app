"use client";

import { isOsTasksCanonicalUiEnabled } from "./featureFlag";
import { OsTaskDetailCanonicalView } from "./OsTaskDetailCanonicalView";
import { OsTaskDetailLegacyView } from "./OsTaskDetailLegacyView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OsTaskDetailView({ taskId }: { taskId: string }) {
  const canonical = isOsTasksCanonicalUiEnabled();
  const numericId = Number(taskId);

  if (!canonical && Number.isFinite(numericId) && numericId > 0) {
    return <OsTaskDetailLegacyView taskId={numericId} />;
  }

  if (canonical && UUID_RE.test(taskId)) {
    return <OsTaskDetailCanonicalView taskId={taskId} />;
  }

  if (canonical && Number.isFinite(numericId) && numericId > 0) {
    return (
      <div className="p-8 text-white">
        <p>ID numérico legacy — usa el UUID canónico.</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <p>ID de tarea inválido.</p>
    </div>
  );
}
