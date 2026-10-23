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
import { getToken } from "@/lib/auth-storage";
import AppShell from "@/components/layout/AppShell";
import {
  createContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  getContributions,
  getGoals,
  updateGoal,
  type Goal,
  type GoalContribution,
  type GoalStatus,
} from "@/lib/goals";

type GoalForm = {
  name: string;
  description: string;
  target_amount: string;
  target_date: string;
  status: GoalStatus;
};

type ContributionForm = {
  amount: string;
  contribution_date: string;
  note: string;
};

type StatusFilter = "all" | GoalStatus;
type SortKey = "default" | "progress" | "deadline" | "name";

type ConfirmState =
  | { kind: "goal"; goal: Goal }
  | { kind: "contribution"; goal: Goal; contribution: GoalContribution }
  | null;

const SESSION_ERROR = "Your session is missing. Please log in again.";
const MILESTONES = [25, 50, 75, 100];
const CONFETTI_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];

const emptyGoalForm: GoalForm = {
  name: "",
  description: "",
  target_amount: "",
  target_date: "",
  status: "active",
};

const TARGET_QUICK_AMOUNTS = [
  { label: "+1jt", value: 1_000_000 },
  { label: "+5jt", value: 5_000_000 },
  { label: "+10jt", value: 10_000_000 },
  { label: "+50jt", value: 50_000_000 },
];

const CONTRIBUTION_QUICK_AMOUNTS = [
  { label: "+100rb", value: 100_000 },
  { label: "+500rb", value: 500_000 },
  { label: "+1jt", value: 1_000_000 },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "progress", label: "Closest to goal" },
  { value: "deadline", label: "Deadline soon" },
  { value: "name", label: "Name (A–Z)" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);

  return getLocalDate(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days),
  );
}

function addMonths(dateKey: string, months: number) {
  const date = parseDateKey(dateKey);

  return getLocalDate(
    new Date(date.getFullYear(), date.getMonth() + months, date.getDate()),
  );
}

function diffDays(from: string, to: string) {
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000,
  );
}

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toAmount(value));
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

function formatDate(value: string | null | undefined) {
  if (!value) return "No deadline";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "No deadline";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getGoalProgress(goal: Goal) {
  const target = toAmount(goal.target_amount);
  const current = toAmount(goal.current_amount ?? goal.total_contributions);

  const calculated = target > 0 ? (current / target) * 100 : 0;
  const value = Number(goal.progress_percentage ?? calculated);

  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function getCurrentAmount(goal: Goal) {
  return toAmount(goal.current_amount ?? goal.total_contributions);
}

function getRemainingAmount(goal: Goal) {
  if (goal.remaining_amount !== undefined) {
    return Math.max(0, toAmount(goal.remaining_amount));
  }

  return Math.max(0, toAmount(goal.target_amount) - getCurrentAmount(goal));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getDeadline(
  goal: Goal,
  todayKey: string,
): { label: string; className: string; days: number | null } {
  if (!goal.target_date) {
    return { label: "No deadline", className: "bg-secondary text-muted", days: null };
  }

  const days = diffDays(todayKey, goal.target_date.slice(0, 10));

  if (goal.status === "completed") {
    return { label: "Achieved", className: "bg-success/10 text-success", days };
  }

  if (goal.status === "cancelled") {
    return { label: "Cancelled", className: "bg-secondary text-muted", days };
  }

  if (days < 0) {
    return {
      label: `Overdue ${Math.abs(days)}d`,
      className: "bg-danger/10 text-danger",
      days,
    };
  }

  if (days === 0) {
    return { label: "Due today", className: "bg-amber-500/10 text-amber-500", days };
  }

  if (days <= 14) {
    return {
      label: `${days}d left`,
      className: "bg-amber-500/10 text-amber-500",
      days,
    };
  }

  return { label: `${days}d left`, className: "bg-secondary text-foreground", days };
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
  target: (
    <SvgIcon size={22}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </SvgIcon>
  ),
  coins: (
    <SvgIcon size={16}>
      <circle cx="9" cy="9" r="6" />
      <path d="M15.5 9.5A6 6 0 1 1 9.5 15.5" />
    </SvgIcon>
  ),
  trophy: (
    <SvgIcon size={22}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </SvgIcon>
  ),
  sparkle: (
    <SvgIcon size={16}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
    </SvgIcon>
  ),
};

const statusMeta: Record<
  GoalStatus,
  {
    label: string;
    badge: string;
    ring: string;
    bar: string;
    tile: string;
    selected: string;
    dot: string;
  }
> = {
  active: {
    label: "Active",
    badge: "bg-primary/10 text-primary",
    ring: "text-primary",
    bar: "bg-primary",
    tile: "bg-primary/10 text-primary",
    selected: "border-primary bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  completed: {
    label: "Completed",
    badge: "bg-success/10 text-success",
    ring: "text-success",
    bar: "bg-success",
    tile: "bg-success/10 text-success",
    selected: "border-success bg-success/10 text-success",
    dot: "bg-success",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-secondary text-muted",
    ring: "text-muted",
    bar: "bg-muted",
    tile: "bg-secondary text-muted",
    selected: "border-border bg-secondary text-foreground",
    dot: "bg-muted",
  },
};

const inputClass =
  "block w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-base text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({
  children,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted hover:border-primary/40 hover:text-foreground"
        }`}
    >
      {children}
    </button>
  );
}

function Ring({
  percent,
  colorClass,
  className,
  children,
}: {
  percent: number;
  colorClass: string;
  className: string;
  children?: ReactNode;
}) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
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
          className={`gl-ring transition-[stroke-dashoffset,color] duration-1000 ${colorClass}`}
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
  const display = amount === undefined ? value : formatCurrency(animated);

  return (
    <div
      className="gl-stat group/stat relative min-w-0 overflow-hidden rounded-xl border border-border bg-background/50 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none"
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 break-words text-sm font-semibold tabular-nums transition-transform duration-300 group-hover/stat:translate-x-0.5 ${valueClass}`}
      >
        {display}
      </p>
    </div>
  );
}

function Confetti() {
  return (
    <div
      className="gl-confetti-layer pointer-events-none fixed inset-0 z-[130] overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: 30 }, (_, index) => (
        <span
          key={index}
          className="gl-confetti absolute -top-4 block rounded-sm"
          style={{
            left: `${(index * 37) % 100}%`,
            width: 6 + (index % 3) * 3,
            height: 10 + (index % 4) * 3,
            backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            animationDelay: `${(index % 9) * 90}ms`,
            animationDuration: `${1900 + (index % 5) * 260}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  escapeDisabled = false,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  escapeDisabled?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  // Lock page scroll while the modal is open and move focus inside it.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const target =
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panelRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (escapeDisabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [escapeDisabled, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="gl-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="gl-sheet relative max-h-[92dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-6"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:rotate-90 hover:bg-secondary hover:text-foreground active:scale-90"
          >
            {icons.close}
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  detail,
  confirmLabel,
  cancelLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  detail?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
      <div
        className="gl-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="gl-pop relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          {icons.trash}
        </div>

        <h3
          id="confirm-title"
          className="mt-4 break-words text-lg font-semibold text-foreground"
        >
          {title}
        </h3>

        {detail}

        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalsHero({
  goals,
  totals,
  todayKey,
}: {
  goals: Goal[];
  totals: { target: number; saved: number; remaining: number };
  todayKey: string;
}) {
  const percent = totals.target > 0 ? (totals.saved / totals.target) * 100 : 0;
  const animatedSaved = useCountUp(totals.saved, 1200);
  const animatedPercent = useCountUp(Math.min(percent, 100), 1200);

  const activeCount = goals.filter((goal) => goal.status === "active").length;
  const completedCount = goals.filter(
    (goal) => goal.status === "completed",
  ).length;

  const nextDeadline = goals
    .filter((goal) => goal.status === "active" && goal.target_date)
    .map((goal) => ({
      goal,
      days: diffDays(todayKey, goal.target_date!.slice(0, 10)),
    }))
    .filter((item) => item.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="gl-reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
      style={{ animationDelay: "60ms" }}
    >
      <span
        aria-hidden="true"
        className="gl-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        className="gl-float pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="gl-float pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-success opacity-15 blur-3xl"
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
          colorClass={percent >= 100 ? "text-success" : "text-primary"}
          className="mx-auto h-44 w-44 sm:h-52 sm:w-52"
        >
          <span className="text-xs font-medium text-muted">Overall</span>
          <span
            className={`text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${percent >= 100 ? "text-success" : "text-foreground"
              }`}
          >
            {Math.round(animatedPercent)}%
          </span>
          <span className="mt-0.5 text-xs text-muted">of all targets</span>
        </Ring>

        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Total saved</p>
          <p className="mt-1 break-words text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {formatCurrency(animatedSaved)}
          </p>
          <p className="mt-1 text-sm text-muted">
            toward {goals.length} savings goal{goals.length === 1 ? "" : "s"}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat
              index={0}
              label="Total target"
              value={formatCurrency(totals.target)}
              amount={totals.target}
            />
            <MiniStat
              index={1}
              label="Remaining"
              value={formatCurrency(totals.remaining)}
              amount={totals.remaining}
              valueClass="text-primary"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted">
              <span className={`h-2 w-2 rounded-full ${statusMeta.active.dot}`} />
              Active
              <span className="font-semibold tabular-nums text-foreground">
                {activeCount}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted">
              <span className={`h-2 w-2 rounded-full ${statusMeta.completed.dot}`} />
              Completed
              <span className="font-semibold tabular-nums text-foreground">
                {completedCount}
              </span>
            </span>
          </div>

          {nextDeadline && (
            <p className="mt-4 text-sm text-muted">
              Next deadline:{" "}
              <span className="font-semibold text-foreground">
                {nextDeadline.goal.name}
              </span>{" "}
              {nextDeadline.days === 0
                ? "is due today"
                : `in ${nextDeadline.days} day${nextDeadline.days === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function GoalCard({
  goal,
  index,
  todayKey,
  onContributions,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  index: number;
  todayKey: string;
  onContributions: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[goal.status];
  const progress = getGoalProgress(goal);
  const current = getCurrentAmount(goal);
  const remaining = getRemainingAmount(goal);
  const target = toAmount(goal.target_amount);
  const deadline = getDeadline(goal, todayKey);

  const isActive = goal.status === "active";
  const reached = progress >= 100;

  const nextMilestone = MILESTONES.find((milestone) => milestone > progress);
  const toMilestone =
    nextMilestone !== undefined ? (target * nextMilestone) / 100 - current : 0;

  const monthlyNeed =
    isActive && remaining > 0 && deadline.days !== null && deadline.days > 0
      ? remaining / Math.max(1, Math.ceil(deadline.days / 30))
      : null;

  return (
    <article
      onMouseMove={handleSpotlightMove}
      className={`gl-reveal group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 motion-reduce:transform-none sm:p-5 ${goal.status === "completed"
          ? "border-success/30 hover:border-success/60"
          : "border-border hover:border-primary/40"
        } ${goal.status === "cancelled" ? "opacity-80" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <span
        aria-hidden="true"
        className="gl-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className={`gl-float pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-500 ${goal.status === "completed"
            ? "bg-success opacity-15 group-hover:opacity-25"
            : "bg-primary opacity-0 group-hover:opacity-25"
          }`}
      />

      <div className="relative flex items-start gap-4">
        <Ring percent={progress} colorClass={meta.ring} className="h-16 w-16 sm:h-20 sm:w-20">
          {goal.status === "completed" ? (
            <span className="text-success">{icons.trophy}</span>
          ) : (
            <span className="text-sm font-bold tabular-nums text-foreground sm:text-base">
              {progress.toFixed(0)}%
            </span>
          )}
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-bold text-foreground sm:text-lg">
              {goal.name}
            </h3>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}
            >
              {meta.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${deadline.className}`}
            >
              {deadline.label}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted">
            Target date: {formatDate(goal.target_date)}
          </p>
        </div>
      </div>

      {goal.description && (
        <p className="relative mt-4 line-clamp-2 text-sm leading-5 text-muted">
          {goal.description}
        </p>
      )}

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <MiniStat
          index={0}
          label="Saved"
          value={formatCurrency(current)}
          amount={current}
          valueClass="text-success"
        />
        <MiniStat
          index={1}
          label="Target"
          value={formatCurrency(target)}
          amount={target}
        />
        <MiniStat
          index={2}
          label="Left"
          value={formatCurrency(remaining)}
          amount={remaining}
        />
      </div>

      <div className="relative mt-5">
        <div
          className="relative h-2.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label={`${goal.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className={`gl-grow h-full rounded-full ${meta.bar}`}
            style={{ width: `${progress}%` }}
          />
          {[25, 50, 75].map((milestone) => (
            <span
              key={milestone}
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-card/80"
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>

        <p className="mt-2.5 min-h-4 text-xs text-muted">
          {isActive && reached ? (
            <span className="font-medium text-success">
              Target reached. Nice work!
            </span>
          ) : isActive && nextMilestone !== undefined ? (
            <>
              {formatCurrency(toMilestone)} to reach{" "}
              <span className="font-semibold text-foreground">
                {nextMilestone}%
              </span>
            </>
          ) : goal.status === "completed" ? (
            <span className="font-medium text-success">Goal achieved</span>
          ) : null}
        </p>

        {monthlyNeed !== null && (
          <p className="mt-1 text-xs text-muted">
            Save about{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(monthlyNeed)}
            </span>{" "}
            / month to hit your date
          </p>
        )}
      </div>

      <div className="relative mt-5 flex gap-2">
        <button
          type="button"
          onClick={onContributions}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
        >
          {icons.coins}
          Contributions
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${goal.name}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-secondary active:scale-90"
        >
          {icons.edit}
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${goal.name}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-danger/20 text-danger transition hover:bg-danger/5 active:scale-90"
        >
          {icons.trash}
        </button>
      </div>
    </article>
  );
}

export default function GoalsPage() {
  const [todayKey] = useState(() => getLocalDate());

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pageError, setPageError] = useState("");

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoalForm);
  const [goalFormError, setGoalFormError] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionForm, setContributionForm] = useState<ContributionForm>(
    () => ({ amount: "", contribution_date: getLocalDate(), note: "" }),
  );
  const [contribError, setContribError] = useState("");
  const [savingContribution, setSavingContribution] = useState(false);
  const contribGoalRef = useRef<number | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);

  // State is only updated inside promise callbacks, never synchronously
  // in the effect body, so it stays safe for the react-hooks lint rules.
  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<Goal[]> = token
      ? getGoals(token).then((response) =>
        Array.isArray(response.data) ? response.data : [],
      )
      : Promise.reject(new Error(SESSION_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setGoals(data);
        setPageError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPageError(getErrorMessage(err));
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

  // Clear pending timers on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      if (celebrateTimer.current !== null)
        window.clearTimeout(celebrateTimer.current);
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }

  function startCelebration() {
    if (celebrateTimer.current !== null)
      window.clearTimeout(celebrateTimer.current);

    setCelebrate(true);
    celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 3800);
  }

  function reload() {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }

  const selectedGoal =
    selectedGoalId !== null
      ? (goals.find((goal) => goal.id === selectedGoalId) ?? null)
      : null;

  const totals = useMemo(() => {
    const target = goals.reduce(
      (sum, goal) => sum + toAmount(goal.target_amount),
      0,
    );
    const saved = goals.reduce((sum, goal) => sum + getCurrentAmount(goal), 0);
    const remaining = goals.reduce(
      (sum, goal) => sum + getRemainingAmount(goal),
      0,
    );

    return { target, saved, remaining };
  }, [goals]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: goals.length,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const goal of goals) counts[goal.status] += 1;

    return counts;
  }, [goals]);

  const visibleGoals = useMemo(() => {
    const filtered = goals.filter(
      (goal) => statusFilter === "all" || goal.status === statusFilter,
    );

    switch (sortKey) {
      case "progress":
        return filtered.sort((a, b) => getGoalProgress(b) - getGoalProgress(a));
      case "deadline":
        return filtered.sort((a, b) => {
          const aDate = a.target_date?.slice(0, 10) ?? "9999-12-31";
          const bDate = b.target_date?.slice(0, 10) ?? "9999-12-31";

          return aDate.localeCompare(bDate);
        });
      case "name":
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filtered;
    }
  }, [goals, statusFilter, sortKey]);

  const targetPresets = useMemo(
    () => [
      { label: "In 3 months", value: addMonths(todayKey, 3) },
      { label: "In 6 months", value: addMonths(todayKey, 6) },
      { label: "In 1 year", value: addMonths(todayKey, 12) },
    ],
    [todayKey],
  );

  function openCreateModal() {
    setEditingGoal(null);
    setGoalForm(emptyGoalForm);
    setGoalFormError("");
    setGoalModalOpen(true);
  }

  function openEditModal(goal: Goal) {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      description: goal.description ?? "",
      target_amount: formatAmountInput(
        String(Math.round(toAmount(goal.target_amount))),
      ),
      target_date: goal.target_date?.slice(0, 10) ?? "",
      status: goal.status,
    });
    setGoalFormError("");
    setGoalModalOpen(true);
  }

  function closeGoalModal() {
    if (savingGoal) return;

    setGoalModalOpen(false);
    setEditingGoal(null);
  }

  async function handleSaveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setGoalFormError(SESSION_ERROR);
      return;
    }

    const name = goalForm.name.trim();
    const targetAmount = parseAmountInput(goalForm.target_amount);

    if (!name) {
      setGoalFormError("Goal name is required.");
      return;
    }

    if (targetAmount <= 0) {
      setGoalFormError("Target amount must be greater than zero.");
      return;
    }

    const wasEditing = editingGoal !== null;

    setSavingGoal(true);
    setGoalFormError("");

    const payload = {
      name,
      description: goalForm.description.trim() || null,
      target_amount: targetAmount,
      target_date: goalForm.target_date || null,
      status: goalForm.status,
    };

    try {
      if (editingGoal) {
        await updateGoal(token, editingGoal.id, payload);
      } else {
        await createGoal(token, payload);
      }

      setGoalModalOpen(false);
      setEditingGoal(null);
      setGoalForm(emptyGoalForm);
      notify(wasEditing ? "Goal updated" : "Goal created");
      reload();
    } catch (err) {
      setGoalFormError(getErrorMessage(err));
    } finally {
      setSavingGoal(false);
    }
  }

  async function markCompleted(goal: Goal) {
    const token = getToken();

    if (!token) {
      setContribError(SESSION_ERROR);
      return;
    }

    try {
      setCompleting(true);
      setContribError("");

      await updateGoal(token, goal.id, {
        name: goal.name,
        description: goal.description ?? null,
        target_amount: toAmount(goal.target_amount),
        target_date: goal.target_date?.slice(0, 10) ?? null,
        status: "completed",
      });

      notify("Goal marked as completed");
      reload();
    } catch (err) {
      setContribError(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  }

  async function fetchContributions(token: string, goalId: number) {
    const response = await getContributions(token, goalId);

    if (contribGoalRef.current !== goalId) return;

    setContributions(Array.isArray(response.data) ? response.data : []);
  }

  async function openContributions(goal: Goal) {
    const token = getToken();

    if (!token) {
      setPageError(SESSION_ERROR);
      return;
    }

    contribGoalRef.current = goal.id;
    setSelectedGoalId(goal.id);
    setContributions([]);
    setLoadingContributions(true);
    setContribError("");
    setPageError("");
    setContributionForm({
      amount: "",
      contribution_date: todayKey,
      note: "",
    });

    try {
      await fetchContributions(token, goal.id);
    } catch (err) {
      setContribError(getErrorMessage(err));
    } finally {
      setLoadingContributions(false);
    }
  }

  function closeContributions() {
    if (savingContribution || confirming || completing) return;

    contribGoalRef.current = null;
    setSelectedGoalId(null);
    setContributions([]);
  }

  async function handleAddContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGoal) return;

    const token = getToken();

    if (!token) {
      setContribError(SESSION_ERROR);
      return;
    }

    const amount = parseAmountInput(contributionForm.amount);

    if (amount <= 0) {
      setContribError("Contribution amount must be greater than zero.");
      return;
    }

    if (!contributionForm.contribution_date) {
      setContribError("Contribution date is required.");
      return;
    }

    const wasBelowTarget =
      getCurrentAmount(selectedGoal) < toAmount(selectedGoal.target_amount);
    const reachesTarget =
      wasBelowTarget &&
      getCurrentAmount(selectedGoal) + amount >=
      toAmount(selectedGoal.target_amount);

    try {
      setSavingContribution(true);
      setContribError("");

      await createContribution(token, selectedGoal.id, {
        amount,
        contribution_date: contributionForm.contribution_date,
        note: contributionForm.note.trim() || null,
      });

      await fetchContributions(token, selectedGoal.id);

      setContributionForm({
        amount: "",
        contribution_date: todayKey,
        note: "",
      });

      if (reachesTarget) {
        notify("Target reached. Congratulations!");
        startCelebration();
      } else {
        notify("Contribution added");
      }

      reload();
    } catch (err) {
      setContribError(getErrorMessage(err));
    } finally {
      setSavingContribution(false);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;

    const token = getToken();

    if (!token) {
      setConfirm(null);
      setPageError(SESSION_ERROR);
      return;
    }

    try {
      setConfirming(true);

      if (confirm.kind === "goal") {
        await deleteGoal(token, confirm.goal.id);

        if (selectedGoalId === confirm.goal.id) {
          contribGoalRef.current = null;
          setSelectedGoalId(null);
          setContributions([]);
        }

        notify("Goal deleted");
      } else {
        await deleteContribution(token, confirm.goal.id, confirm.contribution.id);
        await fetchContributions(token, confirm.goal.id);

        notify("Contribution deleted");
      }

      reload();
    } catch (err) {
      if (confirm.kind === "goal") {
        setPageError(getErrorMessage(err));
      } else {
        setContribError(getErrorMessage(err));
      }
    } finally {
      setConfirming(false);
      setConfirm(null);
    }
  }

  const selectedProgress = selectedGoal ? getGoalProgress(selectedGoal) : 0;
  const selectedRemaining = selectedGoal ? getRemainingAmount(selectedGoal) : 0;

  return (
    <AppShell>
      <style>{`
        @keyframes gl-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gl-pop {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes gl-sheet {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gl-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gl-grow {
          from { width: 0; }
        }
        @keyframes gl-ring {
          from { stroke-dashoffset: var(--ring-from); }
        }
        @keyframes gl-row {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gl-toast {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gl-confetti {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to   { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
        @keyframes gl-indeterminate {
          from { transform: translateX(-100%); }
          to   { transform: translateX(350%); }
        }
        @keyframes gl-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
        }
        @keyframes gl-stat-in {
          from { opacity: 0; transform: translateY(14px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gl-sweep {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(260%) skewX(-18deg); }
        }
        .gl-reveal { animation: gl-reveal 550ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-pop    { animation: gl-pop 240ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-sheet  { animation: gl-sheet 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-fade   { animation: gl-fade 220ms ease-out backwards; }
        .gl-grow   { animation: gl-grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-ring   { animation: gl-ring 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-row    { animation: gl-row 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-toast  { animation: gl-toast 300ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-confetti { animation: gl-confetti 2400ms cubic-bezier(0.3, 0.6, 0.5, 1) forwards; }
        .gl-indeterminate { animation: gl-indeterminate 1.2s ease-in-out infinite; }
        .gl-float  { animation: gl-float 14s ease-in-out infinite; }

        .gl-glow {
          background: radial-gradient(420px circle at var(--mx, 30%) var(--my, 20%), currentColor, transparent 70%);
        }

        .gl-stat { animation: gl-stat-in 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .gl-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 10%, transparent), transparent);
          transform: translateX(-120%) skewX(-18deg);
          pointer-events: none;
        }
        .gl-stat:hover::after { animation: gl-sweep 900ms ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .gl-reveal, .gl-pop, .gl-sheet, .gl-fade, .gl-grow, .gl-ring, .gl-row, .gl-toast, .gl-indeterminate, .gl-float, .gl-stat { animation: none; }
          .gl-stat:hover::after { animation: none; }
          .gl-confetti-layer { display: none; }
        }
      `}</style>

      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6">
        <header className="gl-reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-primary">Savings targets</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Goals &amp; Progress
            </h1>
            <p className="mt-2 text-sm text-muted">
              Set savings targets and follow your progress toward every milestone.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition duration-200 hover:opacity-90 hover:shadow-md active:scale-95 sm:w-auto"
          >
            {icons.plus}
            Create goal
          </button>
        </header>

        {pageError && (
          <div
            role="alert"
            className="gl-pop flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{pageError}</p>
            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded-md p-0.5 transition hover:bg-danger/10"
            >
              {icons.close}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 sm:space-y-6" aria-busy="true">
            <div className="h-80 animate-pulse rounded-3xl border border-border bg-card md:h-72" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-80 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          </div>
        ) : goals.length === 0 ? (
          <div className="gl-reveal rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icons.target}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No savings goals yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Start with an emergency fund, a new laptop, or your next big
              milestone.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
            >
              {icons.plus}
              Create your first goal
            </button>
          </div>
        ) : (
          <>
            <div
              className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${refreshing ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden="true"
            >
              <div className="gl-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <GoalsHero goals={goals} totals={totals} todayKey={todayKey} />

            <section className="space-y-4">
              <div
                className="gl-reveal flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                style={{ animationDelay: "120ms" }}
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Your Goals
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Track each target and manage its contribution history.
                  </p>
                </div>

                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  aria-label="Sort goals"
                  className={`${inputClass} lg:w-48`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {STATUS_FILTERS.map((item) => {
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
                      {item.value !== "all" && (
                        <span
                          className={`h-2 w-2 rounded-full ${statusMeta[item.value].dot}`}
                        />
                      )}
                      {item.label}
                      <span className="text-xs tabular-nums opacity-70">
                        {statusCounts[item.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {visibleGoals.length === 0 ? (
                <div className="gl-reveal rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    No {statusFilter === "all" ? "" : statusMeta[statusFilter].label.toLowerCase()}{" "}
                    goals
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Try another status filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95"
                  >
                    Show all goals
                  </button>
                </div>
              ) : (
                <div
                  className={`grid gap-4 transition-opacity duration-300 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 ${refreshing ? "opacity-70" : "opacity-100"
                    }`}
                >
                  {visibleGoals.map((goal, index) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      index={index}
                      todayKey={todayKey}
                      onContributions={() => void openContributions(goal)}
                      onEdit={() => openEditModal(goal)}
                      onDelete={() => setConfirm({ kind: "goal", goal })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {goalModalOpen && (
        <Modal
          title={editingGoal ? "Edit goal" : "Create a savings goal"}
          subtitle={
            editingGoal
              ? "Update the details of your target."
              : "Give your next financial milestone a name."
          }
          onClose={closeGoalModal}
        >
          <form onSubmit={handleSaveGoal} className="space-y-5">
            {goalFormError && (
              <div
                role="alert"
                className="gl-pop rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                {goalFormError}
              </div>
            )}

            <Field label="Goal name" htmlFor="goal-name">
              <input
                id="goal-name"
                data-autofocus
                maxLength={150}
                value={goalForm.name}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, name: event.target.value })
                }
                placeholder="e.g. Emergency Fund 2027"
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <div>
              <label
                htmlFor="goal-target"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Target amount
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-primary">
                  Rp
                </span>
                <input
                  id="goal-target"
                  type="text"
                  inputMode="numeric"
                  value={goalForm.target_amount}
                  onChange={(event) =>
                    setGoalForm({
                      ...goalForm,
                      target_amount: formatAmountInput(event.target.value),
                    })
                  }
                  placeholder="15.000.000"
                  autoComplete="off"
                  className="block h-14 w-full min-w-0 rounded-xl border border-border bg-background pl-14 pr-4 text-2xl font-bold tabular-nums text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {TARGET_QUICK_AMOUNTS.map((item) => (
                  <Chip
                    key={item.value}
                    onClick={() =>
                      setGoalForm({
                        ...goalForm,
                        target_amount: formatAmountInput(
                          String(parseAmountInput(goalForm.target_amount) + item.value),
                        ),
                      })
                    }
                  >
                    {item.label}
                  </Chip>
                ))}
                {goalForm.target_amount && (
                  <button
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, target_amount: "" })}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="goal-date"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Target date
                <span className="ml-1 font-normal text-muted">(optional)</span>
              </label>

              <input
                id="goal-date"
                type="date"
                value={goalForm.target_date}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, target_date: event.target.value })
                }
                className={`${inputClass} cursor-pointer`}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                {targetPresets.map((preset) => (
                  <Chip
                    key={preset.label}
                    selected={goalForm.target_date === preset.value}
                    onClick={() =>
                      setGoalForm({ ...goalForm, target_date: preset.value })
                    }
                  >
                    {preset.label}
                  </Chip>
                ))}
                {goalForm.target_date && (
                  <button
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, target_date: "" })}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                  >
                    No deadline
                  </button>
                )}
              </div>
            </div>

            <Field label="Description (optional)" htmlFor="goal-description">
              <textarea
                id="goal-description"
                rows={3}
                maxLength={255}
                value={goalForm.description}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, description: event.target.value })
                }
                placeholder="What are you saving for?"
                className={inputClass}
              />
            </Field>

            {editingGoal && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Status</p>
                <div
                  role="radiogroup"
                  aria-label="Goal status"
                  className="grid grid-cols-3 gap-2"
                >
                  {(["active", "completed", "cancelled"] as GoalStatus[]).map(
                    (status) => {
                      const selected = goalForm.status === status;

                      return (
                        <button
                          key={status}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setGoalForm({ ...goalForm, status })}
                          className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                              ? statusMeta[status].selected
                              : "border-border text-muted hover:bg-secondary hover:text-foreground"
                            }`}
                        >
                          {statusMeta[status].label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeGoalModal}
                disabled={savingGoal}
                className="min-h-11 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGoal}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {savingGoal ? <Spinner /> : null}
                {savingGoal
                  ? "Saving..."
                  : editingGoal
                    ? "Save changes"
                    : "Create goal"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedGoal && (
        <Modal
          title={selectedGoal.name}
          subtitle="Track each time you put money toward this goal."
          onClose={closeContributions}
          escapeDisabled={confirm !== null}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/40 p-4">
            <Ring
              percent={selectedProgress}
              colorClass={statusMeta[selectedGoal.status].ring}
              className="h-20 w-20"
            >
              <span className="text-base font-bold tabular-nums text-foreground">
                {selectedProgress.toFixed(0)}%
              </span>
            </Ring>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Saved so far</p>
              <p className="mt-1 break-words text-xl font-bold tabular-nums text-foreground">
                {formatCurrency(getCurrentAmount(selectedGoal))}
              </p>
              <p className="mt-1 text-xs text-muted">
                Target {formatCurrency(selectedGoal.target_amount)} ·{" "}
                {formatCurrency(selectedRemaining)} left
              </p>
            </div>
          </div>

          {contribError && (
            <div
              role="alert"
              className="gl-pop flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              <p>{contribError}</p>
              <button
                type="button"
                onClick={() => setContribError("")}
                aria-label="Dismiss error"
                className="shrink-0 rounded-md p-0.5 transition hover:bg-danger/10"
              >
                {icons.close}
              </button>
            </div>
          )}

          {selectedGoal.status === "active" && selectedProgress >= 100 && (
            <div className="gl-pop flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-success">{icons.sparkle}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    You reached your target
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Mark this goal as completed to celebrate it.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void markCompleted(selectedGoal)}
                disabled={completing}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
              >
                {completing ? <Spinner /> : icons.check}
                Mark completed
              </button>
            </div>
          )}

          {selectedGoal.status === "active" && (
            <form
              onSubmit={handleAddContribution}
              className="space-y-4 rounded-2xl border border-border p-4"
            >
              <h3 className="font-semibold text-foreground">Add contribution</h3>

              <div>
                <label
                  htmlFor="contribution-amount"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Amount
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-primary">
                    Rp
                  </span>
                  <input
                    id="contribution-amount"
                    data-autofocus
                    type="text"
                    inputMode="numeric"
                    value={contributionForm.amount}
                    onChange={(event) =>
                      setContributionForm({
                        ...contributionForm,
                        amount: formatAmountInput(event.target.value),
                      })
                    }
                    placeholder="500.000"
                    autoComplete="off"
                    className="block h-14 w-full min-w-0 rounded-xl border border-border bg-background pl-14 pr-4 text-2xl font-bold tabular-nums text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {CONTRIBUTION_QUICK_AMOUNTS.map((item) => (
                    <Chip
                      key={item.value}
                      onClick={() =>
                        setContributionForm({
                          ...contributionForm,
                          amount: formatAmountInput(
                            String(
                              parseAmountInput(contributionForm.amount) + item.value,
                            ),
                          ),
                        })
                      }
                    >
                      {item.label}
                    </Chip>
                  ))}
                  {selectedRemaining > 0 && (
                    <Chip
                      onClick={() =>
                        setContributionForm({
                          ...contributionForm,
                          amount: formatAmountInput(
                            String(Math.round(selectedRemaining)),
                          ),
                        })
                      }
                    >
                      Fill remaining
                    </Chip>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="contribution-date"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Contribution date
                </label>
                <input
                  id="contribution-date"
                  type="date"
                  value={contributionForm.contribution_date}
                  onChange={(event) =>
                    setContributionForm({
                      ...contributionForm,
                      contribution_date: event.target.value,
                    })
                  }
                  className={`${inputClass} cursor-pointer`}
                />
                <div className="mt-2 flex gap-2">
                  {[
                    { label: "Today", value: todayKey },
                    { label: "Yesterday", value: addDays(todayKey, -1) },
                  ].map((item) => (
                    <Chip
                      key={item.label}
                      selected={contributionForm.contribution_date === item.value}
                      onClick={() =>
                        setContributionForm({
                          ...contributionForm,
                          contribution_date: item.value,
                        })
                      }
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <Field label="Note (optional)" htmlFor="contribution-note">
                <input
                  id="contribution-note"
                  maxLength={255}
                  value={contributionForm.note}
                  onChange={(event) =>
                    setContributionForm({
                      ...contributionForm,
                      note: event.target.value,
                    })
                  }
                  placeholder="e.g. Monthly savings"
                  className={inputClass}
                />
              </Field>

              <button
                type="submit"
                disabled={savingContribution}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {savingContribution ? <Spinner /> : icons.plus}
                {savingContribution ? "Adding..." : "Add savings"}
              </button>
            </form>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground">
                Contribution history
              </h3>
              <span className="text-xs text-muted">
                {contributions.length} record
                {contributions.length === 1 ? "" : "s"}
              </span>
            </div>

            {loadingContributions ? (
              <div className="space-y-2" aria-busy="true">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-xl border border-border bg-secondary/50"
                  />
                ))}
              </div>
            ) : contributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No contributions yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  Add your first savings record above.
                </p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {contributions.map((contribution, index) => (
                  <div
                    key={contribution.id}
                    className="gl-row group flex items-start justify-between gap-3 rounded-xl border border-border p-3 transition hover:bg-secondary/50"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                        {icons.coins}
                      </span>

                      <div className="min-w-0">
                        <p className="break-words font-semibold tabular-nums text-success">
                          +{formatCurrency(contribution.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(contribution.contribution_date)}
                        </p>
                        {contribution.note && (
                          <p className="mt-1 break-words text-sm text-muted">
                            {contribution.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          kind: "contribution",
                          goal: selectedGoal,
                          contribution,
                        })
                      }
                      aria-label="Delete contribution"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-danger transition hover:bg-danger/5 active:scale-90"
                    >
                      {icons.trash}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="button"
              onClick={closeContributions}
              disabled={savingContribution || confirming || completing}
              className="min-h-11 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === "goal"
              ? `Delete ${confirm.goal.name}?`
              : "Delete this contribution?"
          }
          description={
            confirm.kind === "goal"
              ? "Its contribution history may also be deleted. This action cannot be undone."
              : "It will be removed from the history and your saved total will update."
          }
          detail={
            confirm.kind === "contribution" ? (
              <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-sm font-semibold tabular-nums text-success">
                  +{formatCurrency(confirm.contribution.amount)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(confirm.contribution.contribution_date)}
                </p>
              </div>
            ) : undefined
          }
          confirmLabel={
            confirming
              ? "Deleting..."
              : confirm.kind === "goal"
                ? "Delete goal"
                : "Delete contribution"
          }
          cancelLabel={confirm.kind === "goal" ? "Keep goal" : "Keep it"}
          busy={confirming}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
        />
      )}

      {celebrate && <Confetti />}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[140] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      >
        {toast && (
          <div
            key={toast}
            className="gl-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
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