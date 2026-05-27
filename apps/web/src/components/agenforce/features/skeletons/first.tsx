import { cn } from "@/lib/utils";
import {
  IconCircleDashedCheck,
  IconClock,
  IconExclamationCircle,
  IconPrison,
  IconRipple,
} from "@tabler/icons-react";
import React from "react";

export const SkeletonOne = () => {
  return (
    <div className="perspective-distant rotate-z-15 -rotate-y-20 rotate-x-30 scale-[1.2] h-full w-full -translate-y-10 mask-radial-from-50% mask-r-from-50%">
      <SkeletonCard
        className="absolute bottom-0 left-12  max-w-[90%] z-30"
        icon={<IconCircleDashedCheck className="size-4" />}
        title="Campaign Planner"
        description="Creates clear, ready-to-use campaign briefs using product info, audience data, and past results."
        badge={<Badge text="120S" variant="danger" />}
      />
      <SkeletonCard
        className="absolute bottom-8 left-8 z-20"
        icon={<IconExclamationCircle className="size-4" />}
        title="Issue Tracker"
        description="Creates clear, ready-to-use campaign briefs using product info, audience data, and past results."
        badge={<Badge text="10S" variant="success" />}
      />
      <SkeletonCard
        className="absolute bottom-20 left-4 max-w-[80%] z-10"
        icon={<IconPrison className="size-4" />}
        title="Risk Analysis"
        description="Creates clear, ready-to-use campaign briefs using product info, audience data, and past results."
        badge={<Badge text="40s" variant="warning" />}
      />
    </div>
  );
};

const SkeletonCard = ({
  icon,
  title,
  description,
  badge,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "max-w-[85%] h-fit my-auto bg-white dark:bg-neutral-900 mx-auto w-full p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl",
        className
      )}
    >
      <div className="flex gap-3 items-center">
        {icon}
        <p className="text-xs md:text-sm font-normal text-black dark:text-white">
          {title}
        </p>
        {badge}
      </div>
      <p className="text-[10px] md:text-sm text-neutral-500 dark:text-neutral-400 font-light mt-3">
        {description}
      </p>
      <div className="flex items-center gap-2 flex-wrap mt-4">
        <Tag text="Google Ads" />
        <Tag text="SaaS" />
        <Tag text="Content" />
      </div>
    </div>
  );
};

const Tag = ({ text }: { text: string }) => {
  return (
    <div className="px-2 text-[10px] md:text-sm py-1 rounded-sm bg-neutral-200 dark:bg-neutral-700">
      {text}
    </div>
  );
};

const Badge = ({
  variant = "success",
  text,
}: {
  variant?: "danger" | "success" | "warning";
  text: string;
}) => {
  return (
    <div
      className={cn(
        "px-1 py-0.5 rounded-full flex border items-center gap-1 w-fit",

        variant === "danger" && "bg-red-300/10 border-red-300 text-red-500",
        variant === "warning" &&
          "bg-yellow-300/10 border-yellow-300 text-yellow-500",
        variant === "success" &&
          "bg-green-300/10 border-green-300 text-green-500"
      )}
    >
      <IconClock className={cn("size-3")} />
      <IconRipple className="size-3" />
      <p className="text-[10px] font-bold">{text}</p>
    </div>
  );
};
