import { renderBaseEmail } from "./_base";
import { getInvoiceCopy } from "../localeCopy";

export function invoiceTemplate(
  name: string,
  plan: string,
  amount: number,
  invoiceUrl: string,
  locale?: string | null,
): string {
  const copy = getInvoiceCopy(locale);
  const amountFormatted = amount.toFixed(2);
  const dateFormatted = new Date().toLocaleDateString(copy.dateLocale);
  return renderBaseEmail(
    copy.title(plan),
    copy.body(name),
    copy.detailHtml(plan, amountFormatted, dateFormatted),
    copy.cta,
    invoiceUrl,
  );
}
