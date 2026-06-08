import { OsAutonomousLearningView } from "@/features/osAutonomous/OsAutonomousLearningView";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";

export const metadata = {
  title: "Learning Engine · NELVYON OS",
  description: "Dashboard interno de rankings y conversiones autónomas",
};

export default function OsAutonomousLearningPage() {
  return (
    <ProtectedLayout module="os">
      <OsAutonomousLearningView />
    </ProtectedLayout>
  );
}
