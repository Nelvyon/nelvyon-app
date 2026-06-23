"use client";

import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { TestimonialsCard } from "@/components/testimonials/card";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Testimonial {
  author: {
    name: string;
    title: string;
    avatar: string;
  };
  quote: string;
  brand: string;
}

const data: Testimonial[] = [
  {
    author: {
      name: "Henrik Söderlund",
      title: "CTO at Creme Digital",
      avatar: "/avatar/henrik.webp",
    },
    quote:
      "Excellent communication and professionalism: open to ideas, humble when views differ. We'll re-engage; can't wait for the next job together.",
    brand: "/logos/1.webp",
  },
  {
    author: {
      name: "Asriel Han",
      title: "Founder / CTO at Advex AI",
      avatar: "/avatar/asriel.webp",
    },
    quote:
      "Quick to respond, very professional, and shipped a site within a week. Looking forward to the next collaboration.",
    brand: "/logos/7.webp",
  },
  {
    author: {
      name: "John Shahawy",
      title: "Founder at Moonbeam",
      avatar: "/avatar/john.webp",
    },
    quote:
      "The best front-end developer I've worked with. He took the requirements and ran with them. We're delighted with the product.",
    brand: "/logos/9.webp",
  },
  {
    author: {
      name: "Sarah Johnson",
      title: "Product Manager at TechCorp",
      avatar: "/avatar/avatar-1.webp",
    },
    quote:
      "Exceptional attention to detail and a collaborative approach. Sarah delivered beyond our expectations.",
    brand: "/logos/10.webp",
  },
  {
    author: {
      name: "Michael Brown",
      title: "Lead Developer at CodeCraft",
      avatar: "/avatar/avatar-2.webp",
    },
    quote:
      "Incredible problem-solving skills and a great team player. Michael consistently delivers high-quality code on time.",
    brand: "/logos/11.webp",
  },
];

export const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDistance, setSlideDistance] = useState(0);
  const firstCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateSlideDistance = () => {
      if (!firstCardRef.current) {
        return;
      }

      const cardWidth = firstCardRef.current.getBoundingClientRect().width;
      setSlideDistance(cardWidth + 24);
    };

    updateSlideDistance();

    const resizeObserver = new ResizeObserver(updateSlideDistance);

    if (firstCardRef.current) {
      resizeObserver.observe(firstCardRef.current);
    }

    window.addEventListener("resize", updateSlideDistance);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSlideDistance);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % data.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="w-full">
      <Container className="relative flex flex-col gap-15 py-20 md:py-30 lg:gap-20">
        <div className="flex flex-col items-center justify-between gap-8 md:items-start lg:flex-row lg:items-center">
          <Header className="text-center md:text-left">
            See Insights straight from our users
          </Header>
          <Button text="Chat with us" />
        </div>
        <div className="flex flex-col gap-10">
          <div className="_overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out will-change-transform"
              style={{
                transform: `translate3d(-${activeIndex * slideDistance}px, 0, 0)`,
              }}
            >
              {data.map((testimonial, index) => (
                <TestimonialsCard
                  key={index}
                  ref={index === 0 ? firstCardRef : undefined}
                  {...testimonial}
                />
              ))}
            </div>
          </div>
          {/* dots */}
          <div className="flex w-full items-center justify-center">
            <div className="bg-natural-white shadow-card-lg mx-auto flex h-fit w-fit items-center justify-center gap-3 rounded-full px-4 py-3">
              {data.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show testimonial ${index + 1}`}
                  aria-current={activeIndex === index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "size-2 cursor-pointer rounded-full transition-all duration-300",
                    activeIndex === index
                      ? "bg-heading"
                      : "bg-natural-black/15 hover:bg-natural-black/30",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

