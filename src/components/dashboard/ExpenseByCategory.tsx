"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ExpenseCategory {
  category_id: number;
  category_name: string;
  amount: string | number;
}

interface ExpenseByCategoryProps {
  data: ExpenseCategory[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function useCountUp(target: number, duration = 1000) {
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
        : Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;

      fromRef.current = next;
      setValue(next);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const PALETTE = [
  { bg: "bg-primary", text: "text-primary" },
  { bg: "bg-sky-500", text: "text-sky-500" },
  { bg: "bg-amber-500", text: "text-amber-500" },
  { bg: "bg-success", text: "text-success" },
  { bg: "bg-pink-500", text: "text-pink-500" },
  { bg: "bg-teal-500", text: "text-teal-500" },
  { bg: "bg-orange-500", text: "text-orange-500" },
  { bg: "bg-violet-500", text: "text-violet-500" },
];

const SIZE = 120;
const STROKE = 12;
const ACTIVE_STROKE = 16;
const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_VISIBLE = 6;

export default function ExpenseByCategory({ data }: ExpenseByCategoryProps) {
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);

    return () => window.clearTimeout(timer);
  }, []);

  const { items, total } = useMemo(() => {
    const normalized = data
      .map((item) => ({ ...item, amount: Number(item.amount) }))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const sum = normalized.reduce((acc, item) => acc + item.amount, 0);
    const gap = normalized.length > 1 ? 2.5 : 0;

    const list = normalized.map((item, index) => {
      const fraction = sum > 0 ? item.amount / sum : 0;

      const start = normalized
        .slice(0, index)
        .reduce(
          (position, previous) =>
            position +
            (sum > 0 ? previous.amount / sum : 0) * CIRCUMFERENCE,
          0,
        );

      return {
        ...item,
        index,
        percent: fraction * 100,
        length: Math.max(fraction * CIRCUMFERENCE - gap, 0.5),
        start,
        color: PALETTE[index % PALETTE.length],
      };
    });

    return { items: list, total: sum };
  }, [data]);

  const animatedTotal = useCountUp(total);

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">
          Expense by Category
        </h3>
        <p className="mt-1 text-sm text-muted">
          See where your money is going.
        </p>

        <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-9-9" />
              <path d="M21 3v9h-9" />
            </svg>
          </span>
          <p className="text-center text-sm text-muted">
            No expense data available.
          </p>
        </div>
      </section>
    );
  }

  const focused = active !== null ? items[active] : null;
  const top = items[0];
  const visibleItems = expanded ? items : items.slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - MAX_VISIBLE;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary opacity-10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Expense by Category
          </h3>
          <p className="mt-1 text-sm text-muted">
            See where your money is going.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted">
          {items.length} categor{items.length === 1 ? "y" : "ies"}
        </span>
      </div>

      <div className="relative mt-6 grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
        <div className="mx-auto w-full max-w-[220px] lg:mx-0">
          <div className="relative aspect-square">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="h-full w-full -rotate-90"
              role="group"
              aria-label="Expense distribution by category"
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                className="text-secondary"
              />

              {items.map((item) => {
                const isActive = active === item.index;
                const dimmed = active !== null && !isActive;

                return (
                  <circle
                    key={item.category_id}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? ACTIVE_STROKE : STROKE}
                    strokeDasharray={`${ready ? item.length : 0} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-item.start}
                    tabIndex={0}
                    aria-label={`${item.category_name}: ${formatCurrency(item.amount)}, ${formatPercent(item.percent)}`}
                    onMouseEnter={() => setActive(item.index)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(item.index)}
                    onBlur={() => setActive(null)}
                    className={`${item.color.text} cursor-pointer outline-none motion-reduce:!transition-none`}
                    style={{
                      opacity: dimmed ? 0.3 : 1,
                      transition: `stroke-dasharray 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${item.index * 90}ms, stroke-width 200ms ease, opacity 200ms ease`,
                    }}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
              <span className="max-w-full truncate text-xs text-muted">
                {focused ? focused.category_name : "Total spent"}
              </span>
              <span className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-xl">
                Rp {formatCompact(focused ? focused.amount : animatedTotal)}
              </span>
              {focused ? (
                <span
                  className={`text-xs font-semibold ${focused.color.text}`}
                >
                  {formatPercent(focused.percent)}
                </span>
              ) : (
                <span className="text-xs text-muted">
                  {items.length} categor{items.length === 1 ? "y" : "ies"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-xs text-muted">
            <span className="font-semibold text-foreground">
              {top.category_name}
            </span>{" "}
            is your biggest expense at{" "}
            <span className={`font-semibold ${top.color.text}`}>
              {formatPercent(top.percent)}
            </span>{" "}
            of the total.
          </p>

          <ul className="mt-3 space-y-1">
            {visibleItems.map((item) => {
              const isActive = active === item.index;
              const dimmed = active !== null && !isActive;

              return (
                <li
                  key={item.category_id}
                  tabIndex={0}
                  onMouseEnter={() => setActive(item.index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(item.index)}
                  onBlur={() => setActive(null)}
                  className={`rounded-xl px-3 py-2.5 outline-none transition duration-300 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${isActive ? "bg-secondary" : ""
                    } ${dimmed ? "opacity-50" : "opacity-100"} ${ready ? "translate-y-0" : "translate-y-2 opacity-0"
                    }`}
                  style={{ transitionDelay: ready ? "0ms" : `${item.index * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full transition-transform duration-300 ${item.color.bg} ${isActive ? "scale-125" : ""
                          }`}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.category_name}
                          </p>
                          {item.index === 0 && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Top
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatPercent(item.percent)} of total expenses
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>

                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${item.color.bg}`}
                      style={{
                        width: `${ready ? item.percent : 0}%`,
                        transitionDelay: `${150 + item.index * 80}ms`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              {expanded ? "Show less" : `Show all (${hiddenCount} more)`}
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm font-medium text-muted">Total Expenses</span>
        <span className="shrink-0 text-right text-base font-bold tabular-nums text-foreground">
          {formatCurrency(animatedTotal)}
        </span>
      </div>
    </section>
  );
}