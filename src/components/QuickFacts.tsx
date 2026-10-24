"use client";

import { animate, m, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { QuickFact } from "@/data/profile";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {/* Screen readers get the final value, not every intermediate frame. */}
      <span aria-hidden="true">
        {value}
        {suffix}
      </span>
      <span className="sr-only">
        {to}
        {suffix}
      </span>
    </span>
  );
}

export function QuickFacts({ facts }: { facts: readonly QuickFact[] }) {
  return (
    <dl className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-2xl border">
      {facts.map((fact, i) => (
        <m.div
          key={fact.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.6 }}
          className={`border-line flex flex-col p-5 sm:p-7 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""}`}
        >
          <dt className="label text-muted order-2 mt-3">{fact.label}</dt>
          <dd className="font-display order-1 text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
            {typeof fact.value === "number" ? (
              <CountUp to={fact.value} suffix={fact.suffix} />
            ) : (
              <span className="text-[0.8em]">{fact.value}</span>
            )}
          </dd>
          <dd className="text-muted order-3 mt-2 text-sm leading-snug">{fact.detail}</dd>
        </m.div>
      ))}
    </dl>
  );
}
