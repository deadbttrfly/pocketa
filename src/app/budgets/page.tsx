"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import AppShell from "@/components/layout/AppShell";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
  type Budget,
} from "@/lib/budgets";
import { getCategories, type Category } from "@/lib/categories";
import { getDashboard, type DashboardBudget } from "@/lib/dashboard";
import { getToken } from "@/lib/auth-storage";

const AUTH_ERROR = "You are not authenticated.";

type Status = "on-track" | "near" | "over";
type StatusFilter = "all" | Status;
type SortKey = "default" | "usage" | "ending" | "name";

const QUICK_AMOUNTS = [
  { label: "+100rb", value: 100_000 },
  { label: "+500rb", value: 500_000 },
  { label: "+1jt", value: 1_000_000 },
  { label: "+5jt", value: 5_000_000 },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "usage", label: "Highest usage" },
  { value: "ending", label: "Ending soon" },
  { value: "name", label: "Name (A–Z)" },
];

interface LoadedData {
  budgets: Budget[];
  categories: Category[];
  progress: DashboardBudget[];
}

type Period =
  | { state: "upcoming"; totalDays: number; startsIn: number }
  | {
    state: "active";
    totalDays: number;
    elapsedDays: number;
    daysLeft: number;
    elapsedPct: number;
  }
  | { state: "ended"; totalDays: number };

interface BudgetView {
  budget: Budget;
  amount: number;
  spent: number;
  remaining: number;
  percent: number;
  status: Status;
  period: Period;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toNumber(value: number | string) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatRupiah(amount: number | string) {
  return `Rp ${Math.round(toNumber(amount)).toLocaleString("id-ID")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value).toLocaleString("id-ID")}%`;
}

function formatAmountInput(value: string) {
  const numericValue = value.replace(/\D/g, "");

  if (!numericValue) {
    return "";
  }

  return Number(numericValue).toLocaleString("id-ID");
}

function parseAmountInput(value: string) {
  return Number(value.replace(/\./g, "")) || 0;
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
}

function diffDays(from: string, to: string) {
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000,
  );
}

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  const [year, month, day] = date.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return date;
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  ).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatus(percent: number): Status {
  if (percent > 100) return "over";
  if (percent >= 80) return "near";

  return "on-track";
}

function getPeriod(start: string, end: string, todayKey: string): Period {
  const startKey = start.slice(0, 10);
  const endKey = end.slice(0, 10);
  const totalDays = Math.max(diffDays(startKey, endKey) + 1, 1);

  if (todayKey < startKey) {
    return {
      state: "upcoming",
      totalDays,
      startsIn: diffDays(todayKey, startKey),
    };
  }

  if (todayKey > endKey) {
    return { state: "ended", totalDays };
  }

  const elapsedDays = diffDays(startKey, todayKey) + 1;

  return {
    state: "active",
    totalDays,
    elapsedDays,
    daysLeft: diffDays(todayKey, endKey),
    elapsedPct: (elapsedDays / totalDays) * 100,
  };
}

function getPeriodBadge(period: Period) {
  if (period.state === "ended") return "Ended";
  if (period.state === "upcoming") return `Starts in ${period.startsIn}d`;

  return period.daysLeft === 0 ? "Last day" : `${period.daysLeft}d left`;
}

function getPaceMessage(view: BudgetView): { text: string; className: string } {
  const { period, status, spent, amount, percent } = view;

  if (status === "over") {
    return {
      text: `Over by ${formatRupiah(spent - amount)}`,
      className: "text-danger",
    };
  }

  if (period.state === "ended") {
    return {
      text: `Closed at ${formatPercent(percent)} of budget`,
      className: "text-muted",
    };
  }

  if (period.state === "upcoming") {
    return { text: "Not started yet", className: "text-muted" };
  }

  if (spent === 0) {
    return { text: "No spending yet", className: "text-muted" };
  }

  if (percent > period.elapsedPct + 10) {
    return {
      text: "Spending faster than the calendar",
      className: "text-amber-500",
    };
  }

  return { text: "On pace", className: "text-success" };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function handleSpotlightMove(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();

  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
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

function SvgIcon({
  children,
  size = 20,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const icons = {
  plus: (
    <SvgIcon size={16}>
      <path d="M12 5v14M5 12h14" />
    </SvgIcon>
  ),
  close: (
    <SvgIcon size={16}>
      <path d="M6 6l12 12M18 6 6 18" />
    </SvgIcon>
  ),
  edit: (
    <SvgIcon size={16}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </SvgIcon>
  ),
  trash: (
    <SvgIcon size={16}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </SvgIcon>
  ),
  check: (
    <SvgIcon size={18}>
      <path d="m5 12 5 5L20 7" />
    </SvgIcon>
  ),
  search: (
    <SvgIcon size={18}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </SvgIcon>
  ),
  target: (
    <SvgIcon size={26}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </SvgIcon>
  ),
  alert: (
    <SvgIcon size={16}>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  ),
};

const statusMeta: Record<
  Status,
  {
    label: string;
    text: string;
    badge: string;
    ring: string;
    bar: string;
    glow: string;
    dot: string;
  }
> = {
  "on-track": {
    label: "On track",
    text: "text-success",
    badge: "bg-success/10 text-success",
    ring: "text-primary",
    bar: "bg-primary",
    glow: "bg-primary",
    dot: "bg-success",
  },
  near: {
    label: "Near limit",
    text: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-500",
    ring: "text-amber-500",
    bar: "bg-amber-500",
    glow: "bg-amber-500",
    dot: "bg-amber-500",
  },
  over: {
    label: "Over budget",
    text: "text-danger",
    badge: "bg-danger/10 text-danger",
    ring: "text-danger",
    bar: "bg-danger",
    glow: "bg-danger",
    dot: "bg-danger",
  },
};

const inputClass =
  "block h-11 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();

  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded bg-primary/20 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function Ring({
  percent,
  status,
  className,
  children,
}: {
  percent: number;
  status: Status;
  className: string;
  children?: ReactNode;
}) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp(percent, 0, 100);
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={`bud-ring transition-[stroke-dashoffset,color] duration-1000 ${statusMeta[status].ring}`}
          style={
            {
              strokeDashoffset: offset,
              opacity: clamped === 0 ? 0 : 1,
              "--ring-from": circumference,
            } as CSSProperties
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  amount,
  index = 0,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  amount?: number;
  index?: number;
  valueClass?: string;
}) {
  const animated = useCountUp(amount ?? 0, 1100);
  const display = amount === undefined ? value : formatRupiah(animated);

  return (
    <div
      className="bud-stat group/stat relative min-w-0 overflow-hidden rounded-xl border border-border bg-background/50 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none sm:p-4"
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 break-words text-sm font-semibold tabular-nums transition-transform duration-300 group-hover/stat:translate-x-0.5 sm:text-base ${valueClass}`}
      >
        {display}
      </p>
    </div>
  );
}

function BudgetHero({
  totalBudget,
  totalSpent,
  count,
  statusCounts,
}: {
  totalBudget: number;
  totalSpent: number;
  count: number;
  statusCounts: Record<StatusFilter, number>;
}) {
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);
  const percent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const status = getStatus(percent);

  const animatedBudget = useCountUp(totalBudget, 1200);
  const animatedPercent = useCountUp(percent, 1200);

  const accentBlob =
    status === "over"
      ? "bg-danger"
      : status === "near"
        ? "bg-amber-500"
        : "bg-success";

  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="bud-reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
      style={{ animationDelay: "60ms" }}
    >
      <span
        aria-hidden="true"
        className="bud-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        className="bud-float pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className={`bud-float pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl ${accentBlob}`}
        style={{ animationDelay: "-6s", animationDuration: "20s" }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at top left, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at top left, black, transparent 70%)",
        }}
      />

      <div className="relative grid items-center gap-6 sm:gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <Ring
          percent={percent}
          status={status}
          className="mx-auto h-44 w-44 sm:h-52 sm:w-52"
        >
          <span className="text-xs font-medium text-muted">Used</span>
          <span
            className={`text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${statusMeta[status].text}`}
          >
            {Math.round(animatedPercent)}%
          </span>
          <span className="mt-0.5 text-xs text-muted">of all budgets</span>
        </Ring>

        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Total budget</p>
          <p className="mt-1 break-words text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {formatRupiah(animatedBudget)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Across {count} budget{count !== 1 ? "s" : ""}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat
              index={0}
              label="Spent"
              value={formatRupiah(totalSpent)}
              amount={totalSpent}
              valueClass="text-danger"
            />
            <MiniStat
              index={1}
              label="Remaining"
              value={formatRupiah(totalRemaining)}
              amount={totalRemaining}
              valueClass="text-success"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["on-track", "near", "over"] as Status[]).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted"
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusMeta[item].dot}`}
                />
                {statusMeta[item].label}
                <span className="font-semibold tabular-nums text-foreground">
                  {statusCounts[item]}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BudgetCard({
  view,
  index,
  query,
  onEdit,
  onDelete,
}: {
  view: BudgetView;
  index: number;
  query: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { budget, amount, spent, remaining, percent, status, period } = view;
  const meta = statusMeta[status];
  const pace = getPaceMessage(view);

  const dailyAllowance =
    period.state === "active" && remaining > 0 && status !== "over"
      ? remaining / (period.daysLeft + 1)
      : null;

  return (
    <div
      onMouseMove={handleSpotlightMove}
      className="bud-reveal group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 motion-reduce:transform-none sm:p-6"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <span
        aria-hidden="true"
        className="bud-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className={`bud-float pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25 ${meta.glow}`}
      />

      <div className="relative flex items-start gap-4">
        <Ring percent={percent} status={status} className="h-16 w-16 sm:h-20 sm:w-20">
          <span
            className={`text-sm font-bold tabular-nums sm:text-base ${meta.text}`}
          >
            {formatPercent(percent)}
          </span>
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground sm:text-lg">
              <Highlight text={budget.category_name} query={query} />
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted sm:text-sm">
            {formatDate(budget.start_date)} — {formatDate(budget.end_date)}
          </p>

          <span className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
            {getPeriodBadge(period)}
          </span>
        </div>

        <div className="flex shrink-0 gap-1 transition duration-200 md:translate-x-1 md:opacity-0 md:group-focus-within:translate-x-0 md:group-focus-within:opacity-100 md:group-hover:translate-x-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${budget.category_name} budget`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
          >
            {icons.edit}
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${budget.category_name} budget`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-danger/20 text-danger outline-none transition hover:bg-danger/5 focus-visible:ring-2 focus-visible:ring-danger active:scale-90"
          >
            {icons.trash}
          </button>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <MiniStat
          index={0}
          label="Budget"
          value={formatRupiah(amount)}
          amount={amount}
        />
        <MiniStat
          index={1}
          label="Spent"
          value={formatRupiah(spent)}
          amount={spent}
          valueClass="text-danger"
        />
        <MiniStat
          index={2}
          label={status === "over" ? "Over by" : "Remaining"}
          value={formatRupiah(status === "over" ? spent - amount : remaining)}
          amount={status === "over" ? spent - amount : remaining}
          valueClass={status === "over" ? "text-danger" : "text-success"}
        />
      </div>

      <div className="relative mt-5">
        <div className="relative h-2.5 rounded-full bg-secondary">
          <div
            className={`bud-grow h-full rounded-full ${meta.bar}`}
            style={{ width: `${clamp(percent, 0, 100)}%` }}
          />

          {period.state === "active" && (
            <span
              title={`Today: day ${period.elapsedDays} of ${period.totalDays}`}
              className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-foreground/70"
              style={{ left: `${period.elapsedPct}%` }}
            />
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className={`font-medium ${pace.className}`}>{pace.text}</span>

          {dailyAllowance !== null ? (
            <span className="text-muted">
              ~{formatRupiah(dailyAllowance)} / day left
            </span>
          ) : period.state === "active" ? (
            <span className="text-muted">
              Day {period.elapsedDays} of {period.totalDays}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({
  budget,
  deleting,
  onCancel,
  onConfirm,
}: {
  budget: Budget;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="bud-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-budget-title"
        className="bud-pop relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          {icons.trash}
        </div>

        <h3
          id="delete-budget-title"
          className="mt-4 text-lg font-semibold text-foreground"
        >
          Delete {budget.category_name} budget?
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {formatRupiah(budget.amount)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {formatDate(budget.start_date)} — {formatDate(budget.end_date)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">
          This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            Keep budget
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? "Deleting..." : "Delete budget"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [todayKey] = useState(() => getLocalDate());

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<DashboardBudget[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<LoadedData> = token
      ? Promise.all([
        getBudgets(token),
        getCategories(token),
        getDashboard(token),
      ]).then(([budgetsResponse, categoriesResponse, dashboardResponse]) => ({
        budgets: budgetsResponse.data,
        categories: categoriesResponse.data.filter(
          (category) => category.type === "expense",
        ),
        progress: dashboardResponse.data.budgets,
      }))
      : Promise.reject(new Error(AUTH_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setBudgets(data.budgets);
        setCategories(data.categories);
        setBudgetProgress(data.progress);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load budget data."));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (focusKey > 0) amountInputRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!deleteTarget) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deletingId === null) {
        setDeleteTarget(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deletingId]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  function reload() {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }

  const rows = useMemo<BudgetView[]>(() => {
    const progressById = new Map(
      budgetProgress.map((progress) => [progress.id, progress]),
    );

    return budgets.map((budget) => {
      const progress = progressById.get(budget.id);

      const budgetAmount = progress
        ? toNumber(progress.budget)
        : toNumber(budget.amount);
      const spent = progress ? toNumber(progress.spent) : 0;
      const remaining = progress
        ? toNumber(progress.remaining)
        : Math.max(budgetAmount - spent, 0);
      const percent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        budget,
        amount: budgetAmount,
        spent,
        remaining,
        percent,
        status: getStatus(percent),
        period: getPeriod(budget.start_date, budget.end_date, todayKey),
      };
    });
  }, [budgets, budgetProgress, todayKey]);

  const totals = useMemo(() => {
    const totalBudget = budgets.reduce(
      (total, budget) => total + toNumber(budget.amount),
      0,
    );
    const totalSpent = rows.reduce((total, row) => total + row.spent, 0);

    return { totalBudget, totalSpent };
  }, [budgets, rows]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: rows.length,
      "on-track": 0,
      near: 0,
      over: 0,
    };

    for (const row of rows) counts[row.status] += 1;

    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const matchesSearch =
        !query || row.budget.category_name.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    switch (sortKey) {
      case "usage":
        return filtered.sort((a, b) => b.percent - a.percent);
      case "ending":
        return filtered.sort((a, b) =>
          a.budget.end_date.slice(0, 10).localeCompare(
            b.budget.end_date.slice(0, 10),
          ),
        );
      case "name":
        return filtered.sort((a, b) =>
          a.budget.category_name.localeCompare(b.budget.category_name),
        );
      default:
        return filtered;
    }
  }, [rows, searchQuery, statusFilter, sortKey]);

  const isFiltering = searchQuery.trim() !== "" || statusFilter !== "all";

  const presets = useMemo(() => {
    const [year, month] = todayKey.split("-").map(Number);

    return [
      {
        id: "this-month",
        label: "This month",
        start: getLocalDate(new Date(year, month - 1, 1)),
        end: getLocalDate(new Date(year, month, 0)),
      },
      {
        id: "next-month",
        label: "Next month",
        start: getLocalDate(new Date(year, month, 1)),
        end: getLocalDate(new Date(year, month + 1, 0)),
      },
      {
        id: "30-days",
        label: "Next 30 days",
        start: todayKey,
        end: getLocalDate(new Date(year, month - 1, Number(todayKey.slice(8)) + 29)),
      },
      {
        id: "this-year",
        label: "This year",
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      },
    ];
  }, [todayKey]);

  const parsedAmount = parseAmountInput(amount);

  const periodDays =
    startDate && endDate && endDate >= startDate
      ? diffDays(startDate, endDate) + 1
      : null;

  const overlappingBudget =
    categoryId && startDate && endDate && endDate >= startDate
      ? budgets.find(
        (budget) =>
          String(budget.category_id) === categoryId &&
          budget.id !== editingBudget?.id &&
          budget.start_date.slice(0, 10) <= endDate &&
          startDate <= budget.end_date.slice(0, 10),
      )
      : undefined;

  function resetForm() {
    setCategoryId("");
    setAmount("");
    setStartDate("");
    setEndDate("");
    setEditingBudget(null);
  }

  function toggleForm() {
    setError("");

    if (showForm) {
      resetForm();
      setShowForm(false);
      return;
    }

    resetForm();
    setStartDate(presets[0].start);
    setEndDate(presets[0].end);
    setShowForm(true);
    setFocusKey((key) => key + 1);
  }

  function handleEdit(budget: Budget) {
    setEditingBudget(budget);

    setCategoryId(String(budget.category_id));
    setAmount(formatAmountInput(String(Math.round(toNumber(budget.amount)))));
    setStartDate(budget.start_date.slice(0, 10));
    setEndDate(budget.end_date.slice(0, 10));

    setShowForm(true);
    setFocusKey((key) => key + 1);
    setError("");
  }

  function addQuickAmount(value: number) {
    setAmount(formatAmountInput(String(parsedAmount + value)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Budget amount must be greater than 0.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Start date and end date are required.");
      return;
    }

    if (endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const wasEditing = editingBudget !== null;

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        category_id: Number(categoryId),
        amount: parsedAmount,
        start_date: startDate,
        end_date: endDate,
      };

      if (editingBudget !== null) {
        await updateBudget(token, editingBudget.id, payload);
      } else {
        await createBudget(token, payload);
      }

      resetForm();
      setShowForm(false);
      notify(wasEditing ? "Budget updated" : "Budget created");
      reload();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          wasEditing
            ? "Failed to update budget."
            : "Failed to create budget.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(budget: Budget) {
    const token = getToken();

    if (!token) {
      setDeleteTarget(null);
      setError(AUTH_ERROR);
      return;
    }

    try {
      setDeletingId(budget.id);
      setError("");

      await deleteBudget(token, budget.id);

      if (editingBudget?.id === budget.id) {
        resetForm();
        setShowForm(false);
      }

      notify("Budget deleted");
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete budget."));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <AppShell>
      <style>{`
        @keyframes bud-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bud-pop {
          from { opacity: 0; transform: scale(0.97) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bud-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bud-grow {
          from { width: 0; }
        }
        @keyframes bud-ring {
          from { stroke-dashoffset: var(--ring-from); }
        }
        @keyframes bud-toast {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bud-indeterminate {
          from { transform: translateX(-100%); }
          to   { transform: translateX(350%); }
        }
        @keyframes bud-stat-in {
          from { opacity: 0; transform: translateY(14px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bud-sweep {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(260%) skewX(-18deg); }
        }
        @keyframes bud-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
        }
        .bud-reveal { animation: bud-reveal 550ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-pop    { animation: bud-pop 240ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-fade   { animation: bud-fade 200ms ease-out backwards; }
        .bud-grow   { animation: bud-grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-ring   { animation: bud-ring 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-toast  { animation: bud-toast 300ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-indeterminate { animation: bud-indeterminate 1.2s ease-in-out infinite; }
        .bud-float  { animation: bud-float 14s ease-in-out infinite; }

        .bud-stat { animation: bud-stat-in 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .bud-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 10%, transparent), transparent);
          transform: translateX(-120%) skewX(-18deg);
          pointer-events: none;
        }
        .bud-stat:hover::after { animation: bud-sweep 900ms ease-out; }

        .bud-glow {
          background: radial-gradient(420px circle at var(--mx, 30%) var(--my, 20%), currentColor, transparent 70%);
        }

        @media (prefers-reduced-motion: reduce) {
          .bud-reveal, .bud-pop, .bud-fade, .bud-grow, .bud-ring, .bud-toast, .bud-indeterminate, .bud-float, .bud-stat { animation: none; }
          .bud-stat:hover::after { animation: none; }
        }
      `}</style>

      <div className="mx-auto min-w-0 max-w-6xl space-y-4 sm:space-y-6">
        <div className="bud-reveal flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Spending control</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Budgets &amp; Limits
            </h1>
            <p className="mt-1 text-sm text-muted">
              Set monthly limits and monitor how your spending compares to each one.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleForm}
            aria-expanded={showForm}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition duration-200 hover:opacity-90 hover:shadow-md active:scale-95 sm:w-auto"
          >
            <span
              className={`transition-transform duration-300 motion-reduce:transform-none ${showForm ? "rotate-45" : ""
                }`}
            >
              {icons.plus}
            </span>
            {showForm ? "Cancel" : "Add budget"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="bud-pop flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded-md p-0.5 transition hover:bg-danger/10"
            >
              {icons.close}
            </button>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bud-pop rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingBudget !== null ? "Edit budget" : "Add budget"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {editingBudget !== null
                  ? "Update the details of this budget."
                  : "Create a spending limit for an expense category."}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="budget-amount"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Budget amount
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-primary">
                    Rp
                  </span>

                  <input
                    ref={amountInputRef}
                    id="budget-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) =>
                      setAmount(formatAmountInput(event.target.value))
                    }
                    placeholder="1.000.000"
                    autoComplete="off"
                    className="block h-14 w-full min-w-0 rounded-xl border border-border bg-background pl-14 pr-4 text-2xl font-bold tabular-nums text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => addQuickAmount(item.value)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-foreground active:scale-95"
                    >
                      {item.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Expense category
                </p>

                {categories.length > 0 ? (
                  <div
                    role="radiogroup"
                    aria-label="Expense category"
                    className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1"
                  >
                    {categories.map((category) => {
                      const selected = categoryId === String(category.id);

                      return (
                        <button
                          key={category.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setCategoryId(String(category.id))}
                          className={`rounded-full border px-4 py-2 text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                            }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-danger">
                    No expense categories available. Create one in Categories
                    first.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Budget period
                </p>

                <div className="mb-3 flex flex-wrap gap-2">
                  {presets.map((preset) => {
                    const selected =
                      startDate === preset.start && endDate === preset.end;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setStartDate(preset.start);
                          setEndDate(preset.end);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                          }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="budget-start-date"
                      className="mb-2 block text-xs font-medium text-muted"
                    >
                      Start date
                    </label>
                    <input
                      id="budget-start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="budget-end-date"
                      className="mb-2 block text-xs font-medium text-muted"
                    >
                      End date
                    </label>
                    <input
                      id="budget-end-date"
                      type="date"
                      min={startDate || undefined}
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                </div>

                <p className="mt-2 min-h-4 text-xs text-muted">
                  {periodDays !== null
                    ? `${periodDays} day${periodDays !== 1 ? "s" : ""}${parsedAmount > 0
                      ? ` · about ${formatRupiah(parsedAmount / periodDays)} per day`
                      : ""
                    }`
                    : "The budget cannot end before its start date."}
                </p>

                {overlappingBudget && (
                  <p className="bud-fade mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                    {icons.alert}
                    <span>
                      You already have a {overlappingBudget.category_name} budget
                      ({formatDate(overlappingBudget.start_date)} —{" "}
                      {formatDate(overlappingBudget.end_date)}) that overlaps
                      this period.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={toggleForm}
                disabled={submitting}
                className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Spinner /> : null}
                {submitting
                  ? editingBudget !== null
                    ? "Updating..."
                    : "Creating..."
                  : editingBudget !== null
                    ? "Update budget"
                    : "Create budget"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-4 sm:space-y-6" aria-busy="true">
            <div className="h-80 animate-pulse rounded-3xl border border-border bg-card md:h-72" />
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bud-reveal rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icons.target}
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">
              No budgets yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Create a budget to start tracking your spending limits.
            </p>
            {!showForm && (
              <button
                type="button"
                onClick={toggleForm}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
              >
                {icons.plus}
                Create your first budget
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${refreshing ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden="true"
            >
              <div className="bud-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <BudgetHero
              totalBudget={totals.totalBudget}
              totalSpent={totals.totalSpent}
              count={budgets.length}
              statusCounts={statusCounts}
            />

            <div
              className="bud-reveal rounded-2xl border border-border bg-card p-4"
              style={{ animationDelay: "140ms" }}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                    {icons.search}
                  </span>

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search budgets by category..."
                    aria-label="Search budgets"
                    className={`${inputClass} pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none`}
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="bud-fade absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-secondary hover:text-foreground"
                    >
                      {icons.close}
                    </button>
                  )}
                </div>

                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  aria-label="Sort budgets"
                  className={`${inputClass} lg:w-48`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    { value: "all", label: "All", dot: "" },
                    { value: "on-track", label: "On track", dot: statusMeta["on-track"].dot },
                    { value: "near", label: "Near limit", dot: statusMeta.near.dot },
                    { value: "over", label: "Over budget", dot: statusMeta.over.dot },
                  ] as { value: StatusFilter; label: string; dot: string }[]
                ).map((item) => {
                  const selected = statusFilter === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setStatusFilter(item.value)}
                      aria-pressed={selected}
                      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition duration-200 active:scale-95 ${selected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {item.dot && (
                        <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                      )}
                      {item.label}
                      <span className="text-xs tabular-nums opacity-70">
                        {statusCounts[item.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isFiltering && (
                <p className="mt-3 text-xs text-muted" aria-live="polite">
                  Showing {visibleRows.length} of {rows.length} budgets
                </p>
              )}
            </div>

            {visibleRows.length === 0 ? (
              <div className="bud-reveal rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icons.search}
                </span>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  No matching budgets
                </p>
                <p className="mt-1 text-sm text-muted">
                  Try a different search term or status.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95"
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-4 transition-opacity duration-300 sm:gap-5 lg:grid-cols-2 ${refreshing ? "opacity-70" : "opacity-100"
                  }`}
              >
                {visibleRows.map((view, index) => (
                  <BudgetCard
                    key={view.budget.id}
                    view={view}
                    index={index}
                    query={searchQuery}
                    onEdit={() => handleEdit(view.budget)}
                    onDelete={() => setDeleteTarget(view.budget)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          budget={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete(deleteTarget)}
        />
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      >
        {toast && (
          <div
            key={toast}
            className="bud-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
              {icons.check}
            </span>
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}