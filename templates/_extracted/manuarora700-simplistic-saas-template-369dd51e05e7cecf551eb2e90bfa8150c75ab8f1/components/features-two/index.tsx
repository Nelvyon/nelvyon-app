"use client";
import React from "react";
import { motion } from "motion/react";
import { Container } from "../container";
import { Heading } from "../heading";
import { Subheading } from "../subheading";
import { AnimatedBeamPathIllustration } from "./animated-path";
import { SecuritySkeleton } from "./security-skeleton";
import { MacbookSkeleton } from "./macbook-skeleton";
import { IPhoneSkeleton } from "./iphone-skeleton";
import { IPadSkeleton } from "./ipad-skeleton";
import { EdgeComputing } from "./edge-computing";
import { Compliance } from "./compliance";

export function FeaturesTwo() {
  return (
    <Container className="px-4 py-10 md:py-20 lg:py-32">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <Heading as="h2" className="mb-4">
          Deploy agents across every platform
        </Heading>
        <Subheading className="text-balance">
          Your AI agents work seamlessly on mobile, desktop, and tablet. Monitor
          and orchestrate from anywhere.
        </Subheading>
      </div>

      {/* Animated beam row - visible only on lg screens */}
      <div className="relative mx-auto mb-8 hidden h-12 w-full items-center lg:flex">
        <div className="relative flex h-full w-full items-center">
          <div className="absolute top-1/2 left-[calc(100%/6)] z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-[calc(500%/6)] z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-[calc(100%/6)] w-[calc(200%/6)] -translate-y-1/2">
            <AnimatedBeamPathIllustration />
          </div>
          <div className="absolute top-1/2 left-[calc(300%/6)] w-[calc(200%/6)] -translate-y-1/2">
            <AnimatedBeamPathIllustration delay={1.4} />
          </div>
        </div>
      </div>

      {/* Device skeletons row */}
      <div className="mx-auto grid w-full grid-cols-1 items-center gap-10 overflow-hidden py-4 md:grid-cols-3 md:flex-row md:items-end md:justify-center md:py-10">
        <FeatureItem>
          <IPhoneSkeleton />
          <FeatureTitle>Agents in your pocket</FeatureTitle>
          <FeatureDescription>
            Monitor workflows and receive real-time alerts on the go.
          </FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <MacbookSkeleton />
          <FeatureTitle>Full control at your desk</FeatureTitle>
          <FeatureDescription>
            Build, debug, and deploy agents with powerful desktop tools.
          </FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <IPadSkeleton />
          <FeatureTitle>Orchestrate from anywhere</FeatureTitle>
          <FeatureDescription>
            Manage complex workflows with touch-friendly dashboards.
          </FeatureDescription>
        </FeatureItem>
      </div>

      {/* Additional feature blocks */}
      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureBlock
          icon={<SecuritySkeleton />}
          title="Enterprise-grade security"
          description="End-to-end encryption and SOC 2 compliance ensure your agent data stays protected across all devices."
        />
        <FeatureBlock
          icon={<EdgeComputing />}
          title="Edge computing ready"
          description="Deploy agents closer to your users with our global edge network for ultra-low latency responses."
        />
        <FeatureBlock
          icon={<Compliance />}
          title="SOC2 and HIPAA compliant"
          description="Built-in encryption and compliance features ensure your agent data stays protected across all devices."
        />
      </div>
    </Container>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover="animate"
      initial="initial"
      className="flex min-w-60 flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

function BeamCircle() {
  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
      <div className="bg-brand-primary h-2 w-2 rounded-full" />
    </div>
  );
}

function FeatureTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-center text-base font-medium text-neutral-900 dark:text-neutral-100">
      {children}
    </h3>
  );
}

function FeatureDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-2 max-w-xs text-center text-sm text-balance text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

function FeatureBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="relative flex min-h-40 items-center justify-center mask-radial-from-20%">
        {/* <Scales size={8} className="-z-1 rounded-lg" /> */}
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-balance text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
