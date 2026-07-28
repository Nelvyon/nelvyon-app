import { renderBaseEmail } from "./_base";
import { getWelcomeCopy } from "../localeCopy";

export function welcomeTemplate(
  name: string,
  companyName: string,
  onboardingUrl: string,
  locale?: string | null,
): string {
  const copy = getWelcomeCopy(locale);
  return renderBaseEmail(
    copy.title(name),
    copy.body(companyName),
    copy.detailHtml,
    copy.cta,
    onboardingUrl,
    locale,
  );
}
