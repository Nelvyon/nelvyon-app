"use client";

import { isOsClientsCanonicalUiEnabled } from "./featureFlag";
import { OsClientDetailCanonicalView } from "./OsClientDetailCanonicalView";
import { OsClientDetailLegacyView } from "./OsClientDetailLegacyView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OsClientDetailView({ clientId }: { clientId: string }) {
  const canonical = isOsClientsCanonicalUiEnabled();
  const numericId = Number(clientId);

  if (!canonical && Number.isFinite(numericId) && numericId > 0) {
    return <OsClientDetailLegacyView clientId={numericId} />;
  }

  if (canonical && UUID_RE.test(clientId)) {
    return <OsClientDetailCanonicalView clientId={clientId} />;
  }

  if (canonical && Number.isFinite(numericId) && numericId > 0) {
    return (
      <div className="p-8 text-white">
        <p>ID numérico legacy — usa el UUID canónico o activa backfill.</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <p>ID de cliente inválido.</p>
    </div>
  );
}
