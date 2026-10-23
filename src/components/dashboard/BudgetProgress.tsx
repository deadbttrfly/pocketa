"use client";

import { useEffect, useRef, useState } from "react";

interface BudgetProgressProps {
  name: string;
  spent: string;
  limit: string;
  percentage: number;
  remaining?: string;
  delay?: number;
}

type Status = "ok" | "near" | "over";

const statusStyles: Record<
  Status,
  {
    label: string;
    bar: string;
    glow: string;
    dot: string;
    badge: string;
    percent: string;
    footer: string;
  }
> = {
  ok: {
    label: "On track",
    bar: "bg-primary",
    glow: "bg-primary",
    dot: "bg-success",
    badge: "bg-success/10 text-success",
    percent: "text-foreground",
    footer: "text-muted",
  },
  near: {
    label: "Near limit",
    bar: "bg-amber-500",
    glow: "bg-amber-500",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-500",
    percent: "text-amber-500",
    footer: "text-amber-500",
  },
  over: {
    label: "Over budget",
    bar: "bg-danger",
    glow: "bg-danger",
    dot: "bg-danger",
    badge: "bg-danger/10 text-danger",
    percent: "text-danger",
    footer: "text-danger",
  },
};

function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const from = fromRef.current;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduceMotion
        ? 1
        : Math.min(Math.max((now - startedAt - delay) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;

      fromRef.current = next;
      setValue(next);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
}

export default function BudgetProgress({
  name,
  spent,
  limit,
  percentage,
  remaining,
  delay = 0,
}: BudgetProgressProps) {
  const safePercentage = Number.isFinite(percentage)
    ? Math.max(percentage, 0)
    : 0;

  const barPercentage = Math.min(safePercentage, 100);

  const status: Status =
    safePercentage > 100 ? "over" : safePercentage >= 80 ? "near" : "ok";
  const styles = statusStyles[status];

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delay + 60);

    return () => window.clearTimeout(timer);
  }, [delay]);

  const animatedPercentage = useCountUp(safePercentage, 1000, delay);

  const footer =
    status === "over"
      ? "Over budget"
      : status === "near"
        ? "Almost at your limit"
        : remaining;

  return (
    <div className="group -mx-3 rounded-xl px-3 py-4 transition-colors duration-200 hover:bg-secondary/60">
      <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
            />
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <span
              className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${styles.badge}`}
            >
              {styles.label}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-muted">
            {spent} of {limit}
          </p>
        </div>

        <span
          className={`shrink-0 text-sm font-bold tabular-nums transition-colors duration-300 ${styles.percent}`}
        >
          {Math.round(animatedPercentage)}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${name} budget usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barPercentage)}
        className="relative mt-3 h-2 rounded-full bg-secondary transition-[height] duration-200 group-hover:h-2.5"
      >
        <div
          className={`relative h-full rounded-full transition-[width,background-color] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${styles.bar}`}
          style={{
            width: `${ready ? barPercentage : 0}%`,
            transitionDelay: ready ? "0ms" : `${delay}ms`,
          }}
        >
          {barPercentage > 0 && (
            <span
              aria-hidden="true"
              className={`absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 animate-pulse rounded-full opacity-60 blur-[3px] motion-reduce:animate-none ${styles.glow}`}
            />
          )}
        </div>

        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-[80%] w-px bg-card/80"
        />
      </div>

      {footer && (
        <p
          className={`mt-2 truncate text-xs ${styles.footer} ${
            status === "ok" ? "" : "font-medium"
          }`}
        >
          {footer}
        </p>
      )}
    </div>
  );
}