"use client";

import { RoundedGridPattern } from "@/components/bento-one/cards/rounded-grid-pattern";
import { SlidingNumber } from "@/components/sliding-number";
import React, { useEffect, useState } from "react";

export const Metrics = () => {
  const [value, setValue] = useState(1);

  useEffect(() => {
    if (value === 100) return;

    const interval = setInterval(() => {
      setValue((prev) => prev + 1);
    }, 10);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="flex h-full flex-col justify-between gap-16 p-8">
      <div className="absolute inset-0">
        <RoundedGridPattern />
      </div>
      <div className="z-10 flex flex-col gap-3">
        <span className="-tracking-xl flex text-[6.25rem] leading-25 font-medium">
          <SlidingNumber value={value} />+
        </span>
        <span className="text-muted-foreground -tracking-xs text-lg leading-6.5 font-medium">
          Companies served
        </span>
      </div>
      <div className="z-10">
        <span className="-tracking-xs text-muted-foreground text-base leading-6">
          We design and build websites that drive results and help your business
          grow. No Calls. No BS. Just Results.
        </span>
      </div>
    </div>
  );
};

