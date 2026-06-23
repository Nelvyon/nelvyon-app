import { Button } from "@/components/button";

export const CTACard = () => {
  return (
    <div className="bg-natural-white flex flex-col gap-8 rounded-3xl px-6 py-8 shadow-card-md w-full lg:max-w-lg">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-2xl leading-8 -tracking-sm">
          Need a fast moving team of engineers for your startup?
        </span>
        <span className="font-medium text-muted-foreground text-base -tracking-xs leading-6">
          Aceternity is your best bet, we have designers, engineers and managers
          to take your project from 0-1.
        </span>
      </div>
      <div>
        <Button text="Chat with Alex" />
      </div>
    </div>
  );
};

