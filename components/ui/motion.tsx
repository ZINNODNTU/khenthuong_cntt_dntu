"use client";

import { motion, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";
import type { PointerEvent, ReactNode } from "react";

export function FadeUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={clsx("motion-fade-up", className)}
      initial={false}
      style={{ "--motion-delay": `${delay}s` } as React.CSSProperties}
    >
      {children}
    </motion.div>
  );
}

export function GlowCard({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  const reduce = useReducedMotion();
  function pointerMove(event: PointerEvent<HTMLElement>) {
    if (reduce || matchMedia("(max-width: 680px)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }
  return (
    <motion.article
      className={clsx("award-card glow-card", className)}
      data-testid={testId}
      onPointerMove={pointerMove}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      {children}
    </motion.article>
  );
}
