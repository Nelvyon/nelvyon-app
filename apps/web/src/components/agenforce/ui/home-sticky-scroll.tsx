"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export type StickyScrollItem = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
};

function ScrollContentDesktop({ item, index }: { item: StickyScrollItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const translate = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const translateContent = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const opacity = useTransform(scrollYProgress, [0, 0.05, 0.5, 0.72, 1], [0, 1, 1, 0, 0]);
  const opacityContent = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.82, 1], [0, 0, 1, 1, 0]);

  return (
    <motion.div ref={ref} className="nelvyon-sticky-scroll__row">
      <div className="nelvyon-sticky-scroll__copy-col">
        <motion.div style={{ y: translate, opacity }}>
          {item.icon ? <div className="nelvyon-sticky-scroll__icon">{item.icon}</div> : null}
          <h3 className="nelvyon-sticky-scroll__title">{item.title}</h3>
          <p className="nelvyon-sticky-scroll__desc">{item.description}</p>
        </motion.div>
      </div>
      <motion.div
        className="nelvyon-sticky-scroll__screen-col"
        style={{ y: translateContent, opacity: index === 0 ? opacityContent : 1 }}
      >
        {item.content}
      </motion.div>
    </motion.div>
  );
}

function ScrollContentMobile({ item }: { item: StickyScrollItem }) {
  return (
    <div className="nelvyon-sticky-scroll__mobile-block">
      {item.icon ? <div className="nelvyon-sticky-scroll__icon">{item.icon}</div> : null}
      <h3 className="nelvyon-sticky-scroll__title">{item.title}</h3>
      <p className="nelvyon-sticky-scroll__desc">{item.description}</p>
      <div className="nelvyon-sticky-scroll__screen-col">{item.content}</div>
    </div>
  );
}

export function HomeStickyScroll({ content }: { content: StickyScrollItem[] }) {
  return (
    <div className="nelvyon-sticky-scroll">
      <div className="nelvyon-sticky-scroll__desktop" aria-hidden={false}>
        {content.map((item, index) => (
          <ScrollContentDesktop key={item.title} item={item} index={index} />
        ))}
      </div>
      <div className="nelvyon-sticky-scroll__mobile">
        {content.map((item) => (
          <ScrollContentMobile key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}
