import { NelvyonDsSectionHeader } from "@/design-system/components";
import type { WebPremiumAboutSection } from "@/templates/web-premium/types";

interface Props {
  about: WebPremiumAboutSection;
}

export function WebPremiumAbout({ about }: Props) {
  const sectionId = about.id ?? "about";
  return (
    <section aria-labelledby={`${sectionId}-heading`} className="scroll-mt-24 space-y-6" id={sectionId}>
      <NelvyonDsSectionHeader id={`${sectionId}-heading`} title={about.heading} />
      <div className="max-w-3xl space-y-3 text-[14px] leading-[22px] text-muted-foreground">
        {about.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
