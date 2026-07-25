import { renderBaseEmail } from "./_base";
import { getPasswordResetCopy } from "../localeCopy";

export function passwordResetTemplate(
  name: string,
  resetUrl: string,
  locale?: string | null,
): string {
  const copy = getPasswordResetCopy(locale);
  return renderBaseEmail(copy.title, copy.body(name), copy.detailHtml, copy.cta, resetUrl);
}
