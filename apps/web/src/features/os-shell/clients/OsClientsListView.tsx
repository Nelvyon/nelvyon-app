"use client";

import { isOsClientsCanonicalUiEnabled } from "./featureFlag";
import { OsClientsListCanonicalView } from "./OsClientsListCanonicalView";
import { OsClientsListLegacyView } from "./OsClientsListLegacyView";

export function OsClientsListView() {
  if (!isOsClientsCanonicalUiEnabled()) {
    return <OsClientsListLegacyView />;
  }
  return <OsClientsListCanonicalView />;
}
