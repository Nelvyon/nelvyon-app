"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { WorldMapSkeleton } from "./world-map-skeleton";
import { KeyboardSkeleton } from "./keyboard-skeleton";
import { LoginSkeleton } from "./login-skeleton";
import { ChatConversation } from "./chat";
import { VerticalPulseLines } from "./vertical-pulse-lines";
import { FlippingImagesWithBar } from "./flipping-images";
import { Heading } from "../heading";
import { Subheading } from "../subheading";
import { Container } from "../container";
import { Zap, BarChart3, Puzzle } from "lucide-react";

export function FeaturesOne() {
  return (
    <Container as="section" id="product" className="py-10 md:py-20 lg:py-32">
      <Heading>Autonomous AI workflow features</Heading>
      <Subheading className="mt-2">
        From prototype to production, autonomously
      </Subheading>
      <div className="mx-auto mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Easy auth setup</CardTitle>
              <CardDescription>
                Get started in minutes with our simple authentication flow.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center overflow-hidden pt-4">
              <LoginSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>You&apos;re secure, everywhere</CardTitle>
              <CardDescription>
                Enterprise-grade security that follows your users across the
                globe. Built-in encryption, compliance, and monitoring.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center pt-4">
              <WorldMapSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Real-time collaboration</CardTitle>
              <CardDescription>
                Connect with your team instantly. AI-powered insights help you
                work smarter together.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 flex-col items-center justify-between gap-2 overflow-hidden pt-4">
              <ChatConversation className="min-h-0 shrink p-2" />
              <VerticalPulseLines className="h-24 shrink-0" />
              <div className="shrink-0 scale-75">
                <FlippingImagesWithBar />
              </div>
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>SDK available for everything</CardTitle>
              <CardDescription>
                Native SDKs for every platform. React, Vue, iOS, Android, and
                more.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center overflow-hidden mask-r-from-50% pt-4">
              <KeyboardSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-4 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3">
        <FeatureCard
          icon={<Zap className="group-hover:text-brand-primary size-5" />}
          title="Lightning-fast deployments"
          description="Push to production in seconds. Our CI/CD pipeline handles builds, tests, and rollbacks automatically."
        />
        <FeatureCard
          icon={<BarChart3 className="group-hover:text-brand-primary size-5" />}
          title="Built-in analytics"
          description="Track user behavior, monitor performance, and gain actionable insights without third-party tools."
        />
        <FeatureCard
          icon={<Puzzle className="group-hover:text-brand-primary size-5" />}
          title="Seamless integrations"
          description="Connect with your existing stack. Slack, GitHub, Jira, and 100+ integrations out of the box."
        />
      </div>
    </Container>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-900 dark:shadow-white/5 dark:ring-white/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("", className)}>{children}</div>;
}

function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-6", className)}>{children}</div>
  );
}

function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-neutral-900 dark:text-white",
        className,
      )}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm text-balance text-neutral-600 dark:text-neutral-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

function CardSkeleton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-white p-6 dark:bg-neutral-900">
      {icon}
      <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-balance text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
