"use client";

import { isOsTasksCanonicalUiEnabled } from "./featureFlag";
import { OsTaskCreateCanonicalView } from "./OsTaskCreateCanonicalView";
import { OsTaskCreateLegacyView } from "./OsTaskCreateLegacyView";

export function OsTaskCreateView() {
  if (!isOsTasksCanonicalUiEnabled()) {
    return <OsTaskCreateLegacyView />;
  }
  return <OsTaskCreateCanonicalView />;
}
