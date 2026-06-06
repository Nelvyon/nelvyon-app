"use client";

import { isOsProjectsCanonicalUiEnabled } from "./featureFlag";
import { OsProjectCreateCanonicalView } from "./OsProjectCreateCanonicalView";
import { OsProjectCreateLegacyView } from "./OsProjectCreateLegacyView";

export function OsProjectCreateView() {
  if (!isOsProjectsCanonicalUiEnabled()) {
    return <OsProjectCreateLegacyView />;
  }
  return <OsProjectCreateCanonicalView />;
}
