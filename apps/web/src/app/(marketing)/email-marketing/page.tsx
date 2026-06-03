import type { Metadata } from "next";

import { ServiceDetailPage } from "@/components/pa/marketing/service-detail-page";
import { nelvyonServicePages } from "@/config/nelvyon-marketing-pages";
import { getAppBaseUrl } from "@/lib/appUrl";

const content = nelvyonServicePages["email-marketing"];
const base = getAppBaseUrl();

export const metadata: Metadata = {
  title: `${content.title} | NELVYON`,
  description: content.summary,
  openGraph: {
    url: `${base}${content.path}`,
    title: `${content.title} | NELVYON`,
    description: content.summary,
  },
};

export default function EmailMarketingPage() {
  return <ServiceDetailPage content={content} />;
}
