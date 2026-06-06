"use client";

import { isOsProjectsCanonicalUiEnabled } from "./featureFlag";
import { OsProjectDetailCanonicalView } from "./OsProjectDetailCanonicalView";
import { OsProjectDetailLegacyView } from "./OsProjectDetailLegacyView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OsProjectDetailView({ projectId }: { projectId: string }) {
  const canonical = isOsProjectsCanonicalUiEnabled();
  const numericId = Number(projectId);

  if (!canonical && Number.isFinite(numericId) && numericId > 0) {
    return <OsProjectDetailLegacyView projectId={numericId} />;
  }

  if (canonical && UUID_RE.test(projectId)) {
    return <OsProjectDetailCanonicalView projectId={projectId} />;
  }

  if (canonical && Number.isFinite(numericId) && numericId > 0) {
    return (
      <div className="p-8 text-white">
        <p>ID numérico legacy — usa el UUID canónico o ejecuta backfill os:projects-backfill.</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <p>ID de proyecto inválido.</p>
    </div>
  );
}
