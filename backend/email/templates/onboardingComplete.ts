import { renderBaseEmail } from "./_base";
import { getOnboardingCompleteCopy } from "../localeCopy";

export function onboardingCompleteTemplate(
  name: string,
  companyName: string,
  dashboardUrl: string,
  locale?: string | null,
): string {
  const copy = getOnboardingCompleteCopy(locale);
  return renderBaseEmail(
    copy.title(companyName),
    copy.body(name, companyName),
    copy.detailHtml,
    copy.cta,
    dashboardUrl,
    locale,
  );
}
