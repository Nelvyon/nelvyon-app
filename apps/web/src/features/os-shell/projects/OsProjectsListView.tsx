"use client";

import { isOsProjectsCanonicalUiEnabled } from "./featureFlag";
import { OsProjectsListCanonicalView } from "./OsProjectsListCanonicalView";
import { OsProjectsListLegacyView } from "./OsProjectsListLegacyView";

export function OsProjectsListView() {
  if (!isOsProjectsCanonicalUiEnabled()) {
    return <OsProjectsListLegacyView />;
  }
  return <OsProjectsListCanonicalView />;
}
