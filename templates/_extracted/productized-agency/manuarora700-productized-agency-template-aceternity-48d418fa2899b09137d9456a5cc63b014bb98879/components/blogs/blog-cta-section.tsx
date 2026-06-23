import { Button } from "@/components/button";
import { Container } from "@/components/container";

export const BlogCtaSection = () => {
  return (
    <section>
      <Container className="flex items-center justify-center pt-30 pb-50">
        <div className="flex w-full max-w-200 flex-col gap-6">
          <span className="-tracking-sm text-3xl leading-10 font-medium">
            Ever wondered why some brands suddenly dominate your feed overnight
            — while others barely make a ripple?
          </span>
          <span className="-tracking-xs text-muted-foreground text-base leading-6 font-medium">
            In today’s creator economy, influencer marketing isn’t just a trend
            — it’s the backbone of how modern brands grow. But despite billions
            being spent every year, the space operates in near total opacity.
            Deals happen in DMs, campaigns roll out without disclosures, and no
            one really knows what’s driving results.
          </span>
          <span className="-tracking-xs text-muted-foreground text-base leading-6 font-medium">
            That’s where visibility becomes power. In this article, we’ll
            explore how transparency in influencer marketing can change how
            brands plan, spend, and win — and how tools like Scout are helping
            make that shift possible.
          </span>
          <div>
            <Button text="Start Reading" />
          </div>
        </div>
      </Container>
    </section>
  );
};

