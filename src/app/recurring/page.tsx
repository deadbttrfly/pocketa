"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import AppShell from "@/components/layout/AppShell";
import { getToken } from "@/lib/auth-storage";
import { getAccounts, type Account } from "@/lib/accounts";
import { getCategories, type Category } from "@/lib/categories";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
  processRecurringTransactions,
  updateRecurringStatus,
  updateRecurringTransaction,
  type RecurringFrequency,
  type RecurringPayload,
  type RecurringTransaction,
  type RecurringType,
} from "@/lib/recurring";

type RecurringForm = {
  account_id: string;
  category_id: string;
  type: RecurringType;
  amount: string;
  description: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string;
};

type StatusFilter = "all" | "active" | "paused" | "due";
type SortKey = "next" | "amount" | "name";

type ConfirmState =
  | { kind: "delete"; item: RecurringTransaction }
  | { kind: "process" }
  | null;

interface LoadedData {
  items: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
}

const AUTH_ERROR = "You are not authenticated. Please log in again.";

const FREQUENCIES: RecurringFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const MONTHLY_FACTOR: Record<RecurringFrequency, number> = {
  daily: 30,
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

const QUICK_AMOUNTS = [
  { label: "+50rb", value: 50_000 },
  { label: "+100rb", value: 100_000 },
  { label: "+500rb", value: 500_000 },
  { label: "+1jt", value: 1_000_000 },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "next", label: "Next occurrence" },
  { value: "amount", label: "Highest amount" },
  { value: "name", label: "Name (A–Z)" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "due", label: "Due now" },
];

const TYPE_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
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

function diffDays(from: string, to: string) {
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000,
  );
}

function addMonthsClamped(dateKey: string, months: number) {
  const base = parseDateKey(dateKey);
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

  return getLocalDate(
    new Date(
      target.getFullYear(),
      target.getMonth(),
      Math.min(base.getDate(), lastDay),
    ),
  );
}

function occurrenceAt(base: string, frequency: RecurringFrequency, index: number) {
  switch (frequency) {
    case "daily": {
      const date = parseDateKey(base);

      return getLocalDate(
        new Date(date.getFullYear(), date.getMonth(), date.getDate() + index),
      );
    }
    case "weekly": {
      const date = parseDateKey(base);

      return getLocalDate(
        new Date(date.getFullYear(), date.getMonth(), date.getDate() + index * 7),
      );
    }
    case "monthly":
      return addMonthsClamped(base, index);
    default:
      return addMonthsClamped(base, index * 12);
  }
}

function countOccurrencesLeft(item: RecurringTransaction) {
  if (!item.end_date) return null;

  const next = item.next_occurrence.slice(0, 10);
  const end = item.end_date.slice(0, 10);

  let count = 0;

  for (let index = 0; index < 500; index += 1) {
    if (occurrenceAt(next, item.frequency, index) > end) break;
    count += 1;
  }

  return count;
}

function toAmount(value: number | string) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number | string) {
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
  if (!value) return "No end date";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isActive(item: RecurringTransaction) {
  return item.is_active === true || Number(item.is_active) === 1;
}

function isDue(item: RecurringTransaction, todayKey: string) {
  return isActive(item) && item.next_occurrence.slice(0, 10) <= todayKey;
}

function relativeDay(dateKey: string, todayKey: string) {
  const days = diffDays(todayKey, dateKey.slice(0, 10));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";

  return `In ${days} days`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function typeIcon(type: RecurringType, size = 20) {
  return type === "income" ? (
    <SvgIcon size={size}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </SvgIcon>
  ) : (
    <SvgIcon size={size}>
      <path d="M7 7l10 10" />
      <path d="M17 8v9H8" />
    </SvgIcon>
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
  repeat: (
    <SvgIcon size={16}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </SvgIcon>
  ),
  repeatLarge: (
    <SvgIcon size={26}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </SvgIcon>
  ),
  refresh: (
    <SvgIcon size={16}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </SvgIcon>
  ),
  play: (
    <SvgIcon size={16}>
      <path d="M8 5v14l11-7Z" />
    </SvgIcon>
  ),
  calendar: (
    <SvgIcon size={16}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
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

const typeMeta: Record<
  RecurringType,
  {
    label: string;
    tile: string;
    text: string;
    bar: string;
    pill: string;
    selected: string;
    sign: string;
  }
> = {
  income: {
    label: "Income",
    tile: "bg-success/10 text-success",
    text: "text-success",
    bar: "bg-success",
    pill: "bg-success",
    selected: "border-success bg-success/10 text-success",
    sign: "+",
  },
  expense: {
    label: "Expense",
    tile: "bg-danger/10 text-danger",
    text: "text-danger",
    bar: "bg-danger",
    pill: "bg-danger",
    selected: "border-danger bg-danger/10 text-danger",
    sign: "−",
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

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-success" : "bg-secondary"
        }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      >
        {disabled ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        ) : null}
      </span>
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  pillClass,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  pillClass: string;
  className?: string;
}) {
  const index = options.findIndex((item) => item.value === value);

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative grid rounded-xl border border-border bg-background p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg shadow-sm transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none ${pillClass}`}
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {options.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={selected}
            className={`relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary ${selected ? "text-white" : "text-muted hover:text-foreground"
              }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  amount,
  index = 0,
  sub,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  amount?: number;
  index?: number;
  sub?: string;
  valueClass?: string;
}) {
  const animated = useCountUp(amount ?? 0, 1100);
  const display = amount === undefined ? value : formatCurrency(animated);

  return (
    <div
      className="rec-stat group/stat relative min-w-0 overflow-hidden rounded-xl border border-border bg-background/50 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none sm:p-4"
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 break-words text-sm font-semibold tabular-nums transition-transform duration-300 group-hover/stat:translate-x-0.5 sm:text-base ${valueClass}`}
      >
        {display}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
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
        className="rec-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rec-sheet relative max-h-[92dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-6"
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
  tone,
  title,
  description,
  detail,
  confirmLabel,
  cancelLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  tone: "danger" | "primary";
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

  const isDanger = tone === "danger";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
      <div
        className="rec-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="rec-pop relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${isDanger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
            }`}
        >
          {isDanger ? icons.trash : icons.repeatLarge}
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
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 active:scale-95 disabled:opacity-60 ${isDanger
              ? "bg-danger text-white"
              : "bg-primary text-primary-foreground"
              }`}
          >
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecurringHero({
  items,
  categoriesById,
  todayKey,
  counts,
}: {
  items: RecurringTransaction[];
  categoriesById: Map<number, Category>;
  todayKey: string;
  counts: Record<StatusFilter, number>;
}) {
  const monthly = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const item of items) {
      if (!isActive(item)) continue;

      const value = toAmount(item.amount) * MONTHLY_FACTOR[item.frequency];

      if (item.type === "income") income += value;
      else expense += value;
    }

    return { income, expense, net: income - expense };
  }, [items]);

  const total = monthly.income + monthly.expense;
  const incomeShare = total > 0 ? (monthly.income / total) * 100 : 0;
  const expenseShare = total > 0 ? 100 - incomeShare : 0;

  const animatedNet = useCountUp(monthly.net, 1200);

  const upcoming = useMemo(
    () =>
      items
        .filter(isActive)
        .sort((a, b) =>
          a.next_occurrence.slice(0, 10).localeCompare(b.next_occurrence.slice(0, 10)),
        )
        .slice(0, 4),
    [items],
  );

  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="rec-reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
      style={{ animationDelay: "60ms" }}
    >
      <span
        aria-hidden="true"
        className="rec-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        className="rec-float pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className={`rec-float pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl ${monthly.net >= 0 ? "bg-success" : "bg-danger"
          }`}
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

      <div className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">
            Estimated monthly net
          </p>
          <p
            className={`mt-1 break-words text-3xl font-bold tabular-nums tracking-tight sm:text-5xl ${monthly.net < 0 ? "text-danger" : "text-foreground"
              }`}
          >
            {monthly.net > 0 ? "+" : monthly.net < 0 ? "−" : ""}
            {formatCurrency(Math.abs(animatedNet))}
          </p>
          <p className="mt-1 text-sm text-muted">
            From {counts.active} active schedule{counts.active === 1 ? "" : "s"}
          </p>

          <div
            className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-secondary"
            role="img"
            aria-label="Estimated monthly income versus expenses"
          >
            {total > 0 && (
              <>
                {monthly.income > 0 && (
                  <div
                    className="rec-grow h-full rounded-full bg-success"
                    style={{ width: `${incomeShare}%` }}
                  />
                )}
                {monthly.expense > 0 && (
                  <div
                    className="rec-grow h-full rounded-full bg-danger"
                    style={{ width: `${expenseShare}%` }}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat
              index={0}
              label="Income / month"
              value={formatCurrency(monthly.income)}
              amount={monthly.income}
              valueClass="text-success"
            />
            <MiniStat
              index={1}
              label="Expense / month"
              value={formatCurrency(monthly.expense)}
              amount={monthly.expense}
              valueClass="text-danger"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Active", value: counts.active, dot: "bg-success" },
              { label: "Paused", value: counts.paused, dot: "bg-muted" },
              { label: "Due now", value: counts.due, dot: "bg-amber-500" },
            ].map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted"
              >
                <span className={`h-2 w-2 rounded-full ${chip.dot}`} />
                {chip.label}
                <span className="font-semibold tabular-nums text-foreground">
                  {chip.value}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4 backdrop-blur sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Coming up</h3>
            <span className="text-muted">{icons.calendar}</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No active schedules coming up.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {upcoming.map((item, index) => {
                const meta = typeMeta[item.type];
                const due = isDue(item, todayKey);
                const title =
                  item.description?.trim() ||
                  categoriesById.get(item.category_id)?.name ||
                  `${meta.label} schedule`;

                return (
                  <li
                    key={item.id}
                    className="rec-row flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-secondary"
                    style={{ animationDelay: `${300 + index * 70}ms` }}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tile}`}
                    >
                      {typeIcon(item.type, 16)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      <p
                        className={`text-xs ${due ? "font-semibold text-amber-500" : "text-muted"}`}
                      >
                        {relativeDay(item.next_occurrence, todayKey)}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${meta.text}`}
                    >
                      {meta.sign}
                      {formatCurrency(item.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ScheduleCard({
  item,
  index,
  todayKey,
  query,
  categoryName,
  accountName,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: RecurringTransaction;
  index: number;
  todayKey: string;
  query: string;
  categoryName: string;
  accountName: string;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta[item.type];
  const active = isActive(item);
  const due = isDue(item, todayKey);
  const left = countOccurrencesLeft(item);
  const title =
    item.description?.trim() || `${meta.label} schedule`;

  return (
    <article
      onMouseMove={handleSpotlightMove}
      className={`rec-reveal group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 motion-reduce:transform-none sm:p-6 ${due
        ? "border-amber-500/40 hover:border-amber-500/70"
        : "border-border hover:border-primary/40"
        } ${active ? "" : "opacity-75"}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <span
        aria-hidden="true"
        className="rec-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className={`rec-float pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-500 ${due
          ? "bg-amber-500 opacity-15 group-hover:opacity-25"
          : `${item.type === "income" ? "bg-success" : "bg-danger"} opacity-0 group-hover:opacity-25`
          }`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transform-none ${meta.tile}`}
          >
            {typeIcon(item.type)}
          </span>

          <div className="min-w-0">
            <h3 className="break-words font-bold text-foreground">
              <Highlight text={title} query={query} />
            </h3>
            <p className="mt-1 break-words text-sm text-muted">
              <Highlight text={categoryName} query={query} />
              {" · "}
              <Highlight text={accountName} query={query} />
            </p>
          </div>
        </div>

        <Switch
          checked={active}
          disabled={busy}
          label={`${active ? "Pause" : "Activate"} ${title}`}
          onChange={onToggle}
        />
      </div>

      <div className="relative mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className={`text-2xl font-bold tabular-nums tracking-tight ${meta.text}`}
          >
            {meta.sign}
            {formatCurrency(item.amount)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
            {icons.repeat}
            Repeats {frequencyLabelLower(item.frequency)}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${due
            ? "rec-pulse bg-amber-500/10 text-amber-500"
            : active
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted"
            }`}
        >
          {due ? "Due now" : active ? "Active" : "Paused"}
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <MiniStat
          index={0}
          label="Next occurrence"
          value={formatDate(item.next_occurrence)}
          sub={active ? relativeDay(item.next_occurrence, todayKey) : "Paused"}
          valueClass={due ? "text-amber-500" : "text-foreground"}
        />
        <MiniStat
          index={1}
          label="End date"
          value={formatDate(item.end_date)}
          sub={
            left === null
              ? "Until you pause it"
              : `${left} payment${left === 1 ? "" : "s"} left`
          }
        />
      </div>

      <div className="relative mt-5 flex items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-50"
        >
          {icons.edit}
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${title}`}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 text-danger transition hover:bg-danger/5 active:scale-90 disabled:opacity-50"
        >
          {icons.trash}
        </button>
      </div>
    </article>
  );
}

function frequencyLabelLower(frequency: RecurringFrequency) {
  return frequencyLabels[frequency].toLowerCase();
}

export default function RecurringPage() {
  const [todayKey] = useState(() => getLocalDate());

  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RecurringForm>(() => ({
    account_id: "",
    category_id: "",
    type: "expense",
    amount: "",
    description: "",
    frequency: "monthly",
    start_date: getLocalDate(),
    end_date: "",
  }));

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("next");

  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<LoadedData> = token
      ? Promise.all([
        getRecurringTransactions(token),
        getAccounts(token),
        getCategories(token),
      ]).then(([recurringResponse, accountResponse, categoryResponse]) => ({
        items: recurringResponse.data,
        accounts: accountResponse.data,
        categories: categoryResponse.data,
      }))
      : Promise.reject(new Error(AUTH_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setAccounts(data.accounts);
        setCategories(data.categories);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load recurring transactions."));
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

  // Clear any pending toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }

  function reload() {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts],
  );

  const accountOptions = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.is_active || String(account.id) === form.account_id,
      ),
    [accounts, form.account_id],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  const counts = useMemo(() => {
    const active = items.filter(isActive).length;

    return {
      all: items.length,
      active,
      paused: items.length - active,
      due: items.filter((item) => isDue(item, todayKey)).length,
    } satisfies Record<StatusFilter, number>;
  }, [items, todayKey]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive(item)) ||
        (statusFilter === "paused" && !isActive(item)) ||
        (statusFilter === "due" && isDue(item, todayKey));

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        item.description ?? "",
        categoriesById.get(item.category_id)?.name ?? "",
        accountsById.get(item.account_id)?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    switch (sortKey) {
      case "amount":
        return filtered.sort((a, b) => toAmount(b.amount) - toAmount(a.amount));
      case "name":
        return filtered.sort((a, b) =>
          (a.description?.trim() || categoriesById.get(a.category_id)?.name || "").localeCompare(
            b.description?.trim() || categoriesById.get(b.category_id)?.name || "",
          ),
        );
      default:
        return filtered.sort((a, b) =>
          a.next_occurrence.slice(0, 10).localeCompare(b.next_occurrence.slice(0, 10)),
        );
    }
  }, [items, search, statusFilter, sortKey, todayKey, categoriesById, accountsById]);

  const isFiltering = search.trim() !== "" || statusFilter !== "all";

  const endPresets = useMemo(
    () => [
      { label: "In 6 months", value: addMonthsClamped(form.start_date || todayKey, 6) },
      { label: "In 1 year", value: addMonthsClamped(form.start_date || todayKey, 12) },
      { label: "In 2 years", value: addMonthsClamped(form.start_date || todayKey, 24) },
    ],
    [form.start_date, todayKey],
  );

  const parsedAmount = parseAmountInput(form.amount);
  const monthlyEquivalent = parsedAmount * MONTHLY_FACTOR[form.frequency];

  function openCreateForm() {
    setError("");
    setFormError("");
    setEditingId(null);
    setForm({
      account_id: activeAccounts[0] ? String(activeAccounts[0].id) : "",
      category_id: "",
      type: "expense",
      amount: "",
      description: "",
      frequency: "monthly",
      start_date: todayKey,
      end_date: "",
    });
    setShowForm(true);
  }

  function openEditForm(item: RecurringTransaction) {
    setError("");
    setFormError("");
    setEditingId(item.id);
    setForm({
      account_id: String(item.account_id),
      category_id: String(item.category_id),
      type: item.type,
      amount: formatAmountInput(String(Math.round(toAmount(item.amount)))),
      description: item.description ?? "",
      frequency: item.frequency,
      start_date: item.start_date.slice(0, 10),
      end_date: item.end_date?.slice(0, 10) ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setEditingId(null);
  }

  function updateForm<K extends keyof RecurringForm>(
    field: K,
    value: RecurringForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "type" ? { category_id: "" } : {}),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setFormError(AUTH_ERROR);
      return;
    }

    if (!form.account_id || !form.category_id) {
      setFormError("Please select an account and category.");
      return;
    }

    if (parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    if (!form.start_date) {
      setFormError("Start date is required.");
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }

    const payload: RecurringPayload = {
      account_id: Number(form.account_id),
      category_id: Number(form.category_id),
      type: form.type,
      amount: parsedAmount,
      description: form.description.trim(),
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
    };

    const wasEditing = editingId !== null;

    try {
      setSubmitting(true);
      setFormError("");

      if (editingId !== null) {
        await updateRecurringTransaction(token, editingId, payload);
      } else {
        await createRecurringTransaction(token, payload);
      }

      setShowForm(false);
      setEditingId(null);
      notify(wasEditing ? "Schedule updated" : "Schedule created");
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save recurring transaction."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(item: RecurringTransaction) {
    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    const nextActive = !isActive(item);

    try {
      setActionId(item.id);
      setError("");

      await updateRecurringStatus(token, item.id, nextActive);

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
              ...entry,
              is_active: nextActive as unknown as RecurringTransaction["is_active"],
            }
            : entry,
        ),
      );

      notify(nextActive ? "Schedule activated" : "Schedule paused");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update recurring status."));
    } finally {
      setActionId(null);
    }
  }

  async function handleConfirm() {
    if (!confirm || confirming) return;

    const currentConfirm = confirm;
    const token = getToken();

    if (!token) {
      setConfirm(null);
      setError(AUTH_ERROR);
      return;
    }

    setConfirming(true);
    setError("");

    try {
      if (currentConfirm.kind === "delete") {
        await deleteRecurringTransaction(token, currentConfirm.item.id);

        setItems((current) =>
          current.filter((entry) => entry.id !== currentConfirm.item.id),
        );

        if (editingId === currentConfirm.item.id) {
          setShowForm(false);
          setEditingId(null);
        }

        notify("Schedule deleted");
      } else {
        const response = await processRecurringTransactions(token);

        setConfirm(null);

        notify(
          `Processing complete: ${response.data.processed} checked, ${response.data.transactions_created} transaction(s) created`,
        );

        reload();
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          currentConfirm.kind === "delete"
            ? "Failed to delete recurring transaction."
            : "Failed to process recurring transactions.",
        ),
      );
    } finally {
      setConfirming(false);

      setConfirm(null);
    }
  }

  const formType = typeMeta[form.type];
  const missingPrerequisites =
    activeAccounts.length === 0 || categories.length === 0;

  return (
    <AppShell>
      <style>{`
        @keyframes rec-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rec-row {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rec-pop {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rec-sheet {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rec-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rec-grow {
          from { width: 0; }
        }
        @keyframes rec-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        @keyframes rec-toast {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rec-indeterminate {
          from { transform: translateX(-100%); }
          to   { transform: translateX(350%); }
        }
        @keyframes rec-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
        }
        @keyframes rec-stat-in {
          from { opacity: 0; transform: translateY(14px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rec-sweep {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(260%) skewX(-18deg); }
        }
        .rec-reveal { animation: rec-reveal 550ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-row    { animation: rec-row 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-pop    { animation: rec-pop 240ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-sheet  { animation: rec-sheet 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-fade   { animation: rec-fade 220ms ease-out backwards; }
        .rec-grow   { animation: rec-grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-pulse  { animation: rec-pulse 2s ease-in-out infinite; }
        .rec-toast  { animation: rec-toast 300ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-indeterminate { animation: rec-indeterminate 1.2s ease-in-out infinite; }
        .rec-float  { animation: rec-float 14s ease-in-out infinite; }

        .rec-glow {
          background: radial-gradient(420px circle at var(--mx, 30%) var(--my, 20%), currentColor, transparent 70%);
        }

        .rec-stat { animation: rec-stat-in 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .rec-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 10%, transparent), transparent);
          transform: translateX(-120%) skewX(-18deg);
          pointer-events: none;
        }
        .rec-stat:hover::after { animation: rec-sweep 900ms ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .rec-reveal, .rec-row, .rec-pop, .rec-sheet, .rec-fade, .rec-grow, .rec-pulse, .rec-toast, .rec-indeterminate, .rec-float, .rec-stat { animation: none; }
          .rec-stat:hover::after { animation: none; }
        }
      `}</style>

      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6">
        <header className="rec-reveal flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Automation</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Recurring &amp; Scheduled
            </h1>
            <p className="mt-2 text-sm text-muted">
              Automate regular bills, subscriptions, and income so nothing slips through.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirm({ kind: "process" })}
              disabled={confirming || loading}
              className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition duration-200 hover:bg-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {icons.play}
              Process due
              {counts.due > 0 && (
                <span className="rec-pulse inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                  {counts.due}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition duration-200 hover:opacity-90 hover:shadow-md active:scale-95"
            >
              {icons.plus}
              Add schedule
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rec-pop flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
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

        {loading ? (
          <div className="space-y-4 sm:space-y-6" aria-busy="true">
            <div className="h-96 animate-pulse rounded-3xl border border-border bg-card lg:h-80" />
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rec-reveal rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icons.repeatLarge}
            </span>
            <h3 className="mt-4 font-bold text-foreground">
              No recurring schedules yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Create a schedule for expenses or income that repeats daily,
              weekly, monthly, or yearly.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
            >
              {icons.plus}
              Create your first schedule
            </button>
          </div>
        ) : (
          <>
            <div
              className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${refreshing ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden="true"
            >
              <div className="rec-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <RecurringHero
              items={items}
              categoriesById={categoriesById}
              todayKey={todayKey}
              counts={counts}
            />

            <section className="space-y-4">
              <div
                className="rec-reveal flex flex-wrap items-center justify-between gap-3"
                style={{ animationDelay: "140ms" }}
              >
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Your schedules
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Review and manage your recurring income and expenses.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={reload}
                  disabled={refreshing}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition hover:bg-secondary active:scale-95 disabled:opacity-50"
                >
                  <span className={refreshing ? "animate-spin" : ""}>
                    {icons.refresh}
                  </span>
                  Refresh
                </button>
              </div>

              <div
                className="rec-reveal rounded-2xl border border-border bg-card p-4"
                style={{ animationDelay: "180ms" }}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                      {icons.search}
                    </span>

                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by description, category, or account..."
                      aria-label="Search schedules"
                      className={`${inputClass} pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none`}
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="rec-fade absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-secondary hover:text-foreground"
                      >
                        {icons.close}
                      </button>
                    )}
                  </div>

                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    aria-label="Sort schedules"
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
                        {item.label}
                        <span className="text-xs tabular-nums opacity-70">
                          {counts[item.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isFiltering && (
                  <p className="mt-3 text-xs text-muted" aria-live="polite">
                    Showing {visibleItems.length} of {items.length} schedules
                  </p>
                )}
              </div>

              {visibleItems.length === 0 ? (
                <div className="rec-reveal rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icons.search}
                  </span>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    No matching schedules
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Try a different search or status.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95"
                  >
                    Clear search and filters
                  </button>
                </div>
              ) : (
                <div
                  className={`grid gap-4 transition-opacity duration-300 sm:gap-5 xl:grid-cols-2 ${refreshing ? "opacity-70" : "opacity-100"
                    }`}
                >
                  {visibleItems.map((item, index) => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      index={index}
                      todayKey={todayKey}
                      query={search}
                      categoryName={
                        categoriesById.get(item.category_id)?.name ??
                        `Category #${item.category_id}`
                      }
                      accountName={
                        accountsById.get(item.account_id)?.name ??
                        `Account #${item.account_id}`
                      }
                      busy={actionId === item.id || submitting}
                      onToggle={() => void handleToggleStatus(item)}
                      onEdit={() => openEditForm(item)}
                      onDelete={() => setConfirm({ kind: "delete", item })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showForm && (
        <Modal
          title={editingId !== null ? "Edit recurring schedule" : "Create recurring schedule"}
          subtitle="Set the amount, category, and recurrence interval."
          onClose={closeForm}
          escapeDisabled={confirm !== null}
        >
          {missingPrerequisites && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-500">
              {icons.alert}
              <span>
                You need an active account and at least one category before
                creating a schedule.
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div
                role="alert"
                className="rec-pop rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                {formError}
              </div>
            )}

            <SegmentedControl<RecurringType>
              label="Transaction type"
              value={form.type}
              onChange={(value) => updateForm("type", value)}
              options={TYPE_OPTIONS}
              pillClass={formType.pill}
              className="sm:max-w-xs"
            />

            <div>
              <label
                htmlFor="recurring-amount"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Amount
              </label>

              <div className="relative">
                <span
                  className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold transition-colors duration-300 ${formType.text}`}
                >
                  Rp
                </span>
                <input
                  id="recurring-amount"
                  data-autofocus
                  type="text"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(event) =>
                    updateForm("amount", formatAmountInput(event.target.value))
                  }
                  placeholder="150.000"
                  autoComplete="off"
                  className="block h-14 w-full min-w-0 rounded-xl border border-border bg-background pl-14 pr-4 text-2xl font-bold tabular-nums text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((item) => (
                  <Chip
                    key={item.value}
                    onClick={() =>
                      updateForm(
                        "amount",
                        formatAmountInput(String(parsedAmount + item.value)),
                      )
                    }
                  >
                    {item.label}
                  </Chip>
                ))}
                {form.amount && (
                  <button
                    type="button"
                    onClick={() => updateForm("amount", "")}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Frequency
              </p>
              <div
                role="radiogroup"
                aria-label="Frequency"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {FREQUENCIES.map((frequency) => {
                  const selected = form.frequency === frequency;

                  return (
                    <button
                      key={frequency}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => updateForm("frequency", frequency)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {frequencyLabels[frequency]}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 min-h-4 text-xs text-muted">
                {parsedAmount > 0
                  ? `${formatCurrency(parsedAmount)} ${frequencyLabelLower(form.frequency)} · about ${formatCurrency(monthlyEquivalent)} per month`
                  : "Choose how often this transaction repeats."}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Category
              </p>

              {availableCategories.length > 0 ? (
                <div
                  role="radiogroup"
                  aria-label="Category"
                  className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1"
                >
                  {availableCategories.map((category) => {
                    const selected = form.category_id === String(category.id);

                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          updateForm("category_id", String(category.id))
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                          ? `${formType.selected} shadow-sm`
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
                  No {form.type} categories available. Create one in Categories
                  first.
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="recurring-account"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Account
                </label>
                <select
                  id="recurring-account"
                  value={form.account_id}
                  onChange={(event) =>
                    updateForm("account_id", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select account</option>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="recurring-description"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Description
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="recurring-description"
                  maxLength={255}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="e.g. Monthly internet bill"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="recurring-start"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Start date
                </label>
                <input
                  id="recurring-start"
                  type="date"
                  value={form.start_date}
                  onChange={(event) =>
                    updateForm("start_date", event.target.value)
                  }
                  className={`${inputClass} cursor-pointer`}
                />
                <div className="mt-2">
                  <Chip
                    selected={form.start_date === todayKey}
                    onClick={() => updateForm("start_date", todayKey)}
                  >
                    Today
                  </Chip>
                </div>
              </div>

              <div>
                <label
                  htmlFor="recurring-end"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  End date
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="recurring-end"
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(event) =>
                    updateForm("end_date", event.target.value)
                  }
                  className={`${inputClass} cursor-pointer`}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {endPresets.map((preset) => (
                    <Chip
                      key={preset.label}
                      selected={form.end_date === preset.value}
                      onClick={() => updateForm("end_date", preset.value)}
                    >
                      {preset.label}
                    </Chip>
                  ))}
                  {form.end_date && (
                    <button
                      type="button"
                      onClick={() => updateForm("end_date", "")}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                    >
                      No end date
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  activeAccounts.length === 0 ||
                  availableCategories.length === 0
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Spinner /> : null}
                {submitting
                  ? "Saving..."
                  : editingId !== null
                    ? "Save changes"
                    : "Create schedule"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          tone={confirm.kind === "delete" ? "danger" : "primary"}
          title={
            confirm.kind === "delete"
              ? "Delete this schedule?"
              : "Process due transactions?"
          }
          description={
            confirm.kind === "delete"
              ? "This action cannot be undone."
              : counts.due > 0
                ? `${counts.due} schedule${counts.due === 1 ? " is" : "s are"} due. Processing may create new transactions in your accounts.`
                : "No schedule is due right now, but processing will check again. It may create new transactions in your accounts."
          }
          detail={
            confirm.kind === "delete" ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {confirm.item.description?.trim() ||
                      `${typeMeta[confirm.item.type].label} schedule`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Repeats {frequencyLabelLower(confirm.item.frequency)}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold tabular-nums ${typeMeta[confirm.item.type].text}`}
                >
                  {typeMeta[confirm.item.type].sign}
                  {formatCurrency(confirm.item.amount)}
                </p>
              </div>
            ) : undefined
          }
          confirmLabel={
            confirming
              ? confirm.kind === "delete"
                ? "Deleting..."
                : "Processing..."
              : confirm.kind === "delete"
                ? "Delete schedule"
                : "Process now"
          }
          cancelLabel={confirm.kind === "delete" ? "Keep schedule" : "Cancel"}
          busy={confirming}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
        />
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[140] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      >
        {toast && (
          <div
            key={toast}
            className="rec-toast pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              {icons.check}
            </span>
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}