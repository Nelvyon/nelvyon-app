import { getSEO } from "@/lib/seo";
import { BentoOne } from "@/components/bento-one";
import { Container } from "@/components/container";
import { FAQ } from "@/components/faq";
import { PageHeader } from "@/components/page-header";
import { Projects } from "@/components/projects";
import { Testimonials } from "@/components/testimonials";

export const metadata = getSEO({
  title: "Work",
  description:
    "Selected projects and case studies — landing pages, SaaS homepages, and product launches we've designed and built.",
  path: "/work",
});

const WorkPage = () => {
  return (
    <div className="max-w-screen overflow-x-hidden">
      <Container className="relative h-38 md:h-70">
        <PageHeader className="top-10 md:top-16 lg:top-18">Projects</PageHeader>
      </Container>
      <div className="**:data-[slot=container]:pt-0">
        <Projects disabelHeader />
      </div>
      <BentoOne />
      <Testimonials />
      <FAQ />
    </div>
  );
};

export default WorkPage;
