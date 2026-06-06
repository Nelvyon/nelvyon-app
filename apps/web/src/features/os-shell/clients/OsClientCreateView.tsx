"use client";

import { isOsClientsCanonicalUiEnabled } from "./featureFlag";
import { OsClientCreateCanonicalView } from "./OsClientCreateCanonicalView";
import { OsClientCreateLegacyView } from "./OsClientCreateLegacyView";

export function OsClientCreateView() {
  if (!isOsClientsCanonicalUiEnabled()) {
    return <OsClientCreateLegacyView />;
  }
  return <OsClientCreateCanonicalView />;
}
