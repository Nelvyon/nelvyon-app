import { getSEO } from "@/lib/seo";
import { Comparison } from "@/components/comparison";
import { Container } from "@/components/container";
import { FAQ } from "@/components/faq";
import { Feedbacks } from "@/components/feedbacks";
import { PageHeader } from "@/components/page-header";
import { LogoCloud } from "@/components/logo-cloud";
import { Pricing } from "@/components/pricing";

export const metadata = getSEO({
  title: "Pricing",
  description:
    "Simple, transparent pricing for design and development. No calls, no BS — just results.",
  path: "/pricing",
});

const PricingPage = () => {
  return (
    <div>
      <Container className="relative h-38 md:h-70">
        <PageHeader className="top-10 md:top-16 lg:top-18">Pricing</PageHeader>
      </Container>
      <div className="**:data-[slot=container]:pt-0">
        <Pricing disabelHeader />
      </div>
      <div className="**:data-[slot=container]:pt-0">
        <LogoCloud />
      </div>
      <Comparison />
      <Feedbacks />
      <FAQ />
    </div>
  );
};

export default PricingPage;
