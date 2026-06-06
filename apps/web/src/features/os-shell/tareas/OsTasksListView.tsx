"use client";

import { isOsTasksCanonicalUiEnabled } from "./featureFlag";
import { OsTasksListCanonicalView } from "./OsTasksListCanonicalView";
import { OsTasksListLegacyView } from "./OsTasksListLegacyView";

export function OsTasksListView() {
  if (!isOsTasksCanonicalUiEnabled()) {
    return <OsTasksListLegacyView />;
  }
  return <OsTasksListCanonicalView />;
}
