"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { FeedbacksCard } from "@/components/feedbacks/feedbacks-card";
import { Adobe, GoogleLogo, Microsoft, Raycast } from "@/components/icons/logo";

const data = [
  {
    quote:
      "“Working with Manu and his team was a masterclass in design engineering. They didn’t just create a website they built a high-performance, thoughtfully engineered product.”",
    name: "Jack Hudson",
    role: "VP of Engineering, Cal.com",
    logo: "/logos/cal.webp",
  },
  {
    quote:
      "“Manu's team rapidly iterated with our stakeholders and delivered a thoughtful, usable product that exceeded expectations.”",
    name: "Priya Singh",
    role: "Product Manager, Google",
    logo: <GoogleLogo className="h-10 w-auto" />,
  },
  {
    quote: "“The collaboration and clarity from Manu's team made a significant impact on our roadmap.”",
    name: "Liam O'Connor",
    role: "Head of Design, Raycast",
    logo: <Raycast className="h-10 w-auto" />,
  },
  {
    quote: "“Technical excellence paired with strong product sense — highly recommended.”",
    name: "Sara Williams",
    role: "Engineering Manager, Microsoft",
    logo: <Microsoft className="h-10 w-auto" />,
  },
  {
    quote: "“They helped us scale design systems and ship faster across teams.”",
    name: "Carlos Mendez",
    role: "Design Systems Lead, Adobe",
    logo: <Adobe className="h-10 w-auto" />,
  },
];

export const Feedbacks = () => {
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
    <section className="w-full overflow-hidden">
      <Container className="flex flex-col gap-15 py-20 md:py-30">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <Header>What people have been saying</Header>
          <div>
            <Button text="Chat with us" />
          </div>
        </div>
        <div className="flex flex-col gap-10">
          <div>
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform gap-6"
              style={{
                transform: `translate3d(-${activeIndex * slideDistance}px, 0, 0)`,
              }}
            >
              {data.map((item, index) => (
                <FeedbacksCard
                  key={index}
                  ref={index === 0 ? firstCardRef : undefined}
                  item={item}
                />
              ))}
            </div>
          </div>
          <div className="flex w-full items-center justify-center">
            <div className="bg-natural-white shadow-card-lg mx-auto flex h-fit w-fit items-center justify-center gap-3 rounded-full px-4 py-3">
              {data.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show feedback ${index + 1}`}
                  aria-current={activeIndex === index}
                  onClick={() => setActiveIndex(index)}
                  className={`cursor-pointer size-2 rounded-full transition-all duration-300 ${
                    activeIndex === index
                      ? "bg-heading"
                      : "bg-natural-black/15 hover:bg-natural-black/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

