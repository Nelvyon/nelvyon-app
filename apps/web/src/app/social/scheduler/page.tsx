import { SocialSchedulerClient } from "@/app/social/scheduler/SocialSchedulerClient";

export default function SocialSchedulerPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Programación social: calendario editorial y publicación multired desde un solo panel.
      </p>
      <SocialSchedulerClient />
    </>
  );
}
