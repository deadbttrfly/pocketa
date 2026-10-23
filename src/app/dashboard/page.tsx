"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import ExpenseByCategory from "@/components/dashboard/ExpenseByCategory";

import {
  getDashboard,
  type DashboardBudget,
  type DashboardExpenseCategory,
  type DashboardTransaction,
} from "@/lib/dashboard";

import { getToken, getUser, subscribeToAuth } from "@/lib/auth-storage";
import { ApiError } from "@/lib/api";

interface DashboardData {
  summary: {
    balance: string;
    income: string;
    expense: string;
  };
  expense_by_category: DashboardExpenseCategory[];
  budgets: DashboardBudget[];
  recent_transactions: DashboardTransaction[];
}

const SESSION_ERROR = "Your session has expired. Please log in again.";
const LOAD_ERROR = "Unable to load your financial data. Please try again.";

const HIDDEN_KEY = "pocketa:hide-balance";
const MASK = "Rp ••••••";

function toNumber(value: string | number) {
  const numeric = typeof value === "string" ? Number(value) : value;

  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(amount: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(amount));
}

function displayCurrency(amount: string | number, hidden: boolean) {
  return hidden ? MASK : formatCurrency(amount);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function formatDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 19) return "Good evening";

  return "Good night";
}

function readFirstName() {
  const name = getUser<{ name?: string }>()?.name?.trim();

  return name ? name.split(" ")[0] : "";
}

function useFirstName() {
  return useSyncExternalStore(subscribeToAuth, readFirstName, () => "");
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
      const eased = 1 - Math.pow(1 - progress, 4);
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

function handleSpotlightMove(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();

  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
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
  income: (
    <SvgIcon>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </SvgIcon>
  ),
  expense: (
    <SvgIcon>
      <path d="M7 7l10 10" />
      <path d="M17 8v9H8" />
    </SvgIcon>
  ),
  receipt: (
    <SvgIcon size={22}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </SvgIcon>
  ),
  target: (
    <SvgIcon size={22}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </SvgIcon>
  ),
  wallet: (
    <SvgIcon size={18}>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Z" />
      <circle cx="16.5" cy="14.5" r="1" />
    </SvgIcon>
  ),
  eye: (
    <SvgIcon size={18}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  ),
  eyeOff: (
    <SvgIcon size={18}>
      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.9 3.7" />
      <path d="M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </SvgIcon>
  ),
};

function Panel({
  title,
  subtitle,
  href,
  delay,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  delay: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="dsh-reveal group relative min-w-0 overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-lg shadow-primary/5 sm:p-7"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className="dsh-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-40"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        <Link
          href={href}
          className="group/link inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-primary outline-none transition duration-300 hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
        >
          View all
          <span className="inline-block transition-transform duration-300 group-hover/link:translate-x-1 motion-reduce:transform-none">
            →
          </span>
        </Link>
      </div>

      <div className="relative mt-5 space-y-1">{children}</div>
    </section>
  );
}

function EmptyState({
  icon,
  message,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="relative flex min-h-52 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border px-4 text-center">
      <span
        aria-hidden="true"
        className="dsh-float pointer-events-none absolute left-1/2 top-2 h-32 w-32 -translate-x-1/2 rounded-full bg-primary opacity-10 blur-3xl"
      />
      <span className="relative flex h-12 w-12 items-center justify-center">
        <span
          aria-hidden="true"
          className="dsh-pulse-ring absolute inset-0 rounded-2xl bg-primary/20"
        />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </span>
      </span>
      <p className="relative text-sm text-muted">{message}</p>
      <Link
        href={actionHref}
        className="dsh-shine relative overflow-hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

type FlowKind = "income" | "expense";

function FlowTile({
  kind,
  amount,
  share,
  active,
  dimmed,
  hidden,
  onFocusChange,
}: {
  kind: FlowKind;
  amount: number;
  share: number;
  active: boolean;
  dimmed: boolean;
  hidden: boolean;
  onFocusChange: (kind: FlowKind | null) => void;
}) {
  const animated = useCountUp(amount);
  const isIncome = kind === "income";

  return (
    <div
      onMouseMove={handleSpotlightMove}
      tabIndex={0}
      onMouseEnter={() => onFocusChange(kind)}
      onMouseLeave={() => onFocusChange(null)}
      onFocus={() => onFocusChange(kind)}
      onBlur={() => onFocusChange(null)}
      className={`group relative overflow-hidden rounded-2xl border bg-background/50 p-4 outline-none backdrop-blur transition duration-300 focus-visible:ring-2 focus-visible:ring-primary ${active
        ? isIncome
          ? "-translate-y-1 border-emerald-500/50 shadow-xl shadow-emerald-500/10"
          : "-translate-y-1 border-rose-500/50 shadow-xl shadow-rose-500/10"
        : "border-border"
        } ${dimmed ? "opacity-60" : "opacity-100"} motion-reduce:transform-none`}
    >
      <span
        aria-hidden="true"
        className={`dsh-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-[0.12] ${isIncome ? "text-emerald-500" : "text-rose-500"
          }`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">
            {isIncome ? "Total Income" : "Total Expenses"}
          </p>
          <p className="mt-2 break-words text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
            {displayCurrency(animated, hidden)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatPercent(share)} of all money moved
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none ${isIncome
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-rose-500/10 text-rose-500"
            }`}
        >
          {isIncome ? icons.income : icons.expense}
        </span>
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`dsh-grow h-full rounded-full ${isIncome ? "bg-emerald-500" : "bg-rose-500"
            }`}
          style={{
            width: `${share}%`,
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

function BalanceHero({
  summary,
  hidden,
  onToggleHidden,
}: {
  summary: DashboardData["summary"];
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const balance = toNumber(summary.balance);
  const income = toNumber(summary.income);
  const expense = toNumber(summary.expense);

  const [focus, setFocus] = useState<FlowKind | null>(null);
  const animatedBalance = useCountUp(balance, 1400);

  const total = income + expense;
  const incomeShare = total > 0 ? (income / total) * 100 : 0;
  const expenseShare = total > 0 ? 100 - incomeShare : 0;

  const net = income - expense;
  const rate = income > 0 ? (net / income) * 100 : null;

  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="dsh-reveal group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 text-foreground shadow-xl shadow-primary/5 sm:p-10"
      style={{ animationDelay: "60ms" }}
    >
      <span
        aria-hidden="true"
        className="dsh-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.12]"
      />
      <span
        aria-hidden="true"
        className="dsh-float pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="dsh-float pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-primary opacity-10 blur-3xl"
        style={{ animationDelay: "-6s", animationDuration: "20s" }}
      />
      <span
        aria-hidden="true"
        className="dsh-float pointer-events-none absolute right-1/3 top-0 h-48 w-48 rounded-full bg-emerald-500 opacity-10 blur-3xl"
        style={{ animationDelay: "-3s" }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage:
            "radial-gradient(ellipse at top left, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top left, black, transparent 70%)",
        }}
      />

      <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted">
              {icons.wallet}
            </span>
            <p className="text-sm font-medium text-muted">Total Balance</p>
            <button
              type="button"
              onClick={onToggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted outline-none transition duration-300 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
            >
              {hidden ? icons.eyeOff : icons.eye}
            </button>
          </div>

          <p
            className={`mt-3 break-words text-4xl font-bold tabular-nums tracking-tight sm:text-6xl ${balance < 0
              ? "text-danger"
              : "bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent"
              }`}
          >
            {displayCurrency(animatedBalance, hidden)}
          </p>

          {rate !== null && (
            <span
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${net >= 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
                }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`dsh-pulse-ring absolute inline-flex h-full w-full rounded-full ${net >= 0 ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                />
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${net >= 0 ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                />
              </span>
              {net >= 0
                ? `Saving ${formatPercent(rate)} of income`
                : `Spending ${formatPercent(Math.abs(rate))} above income`}
            </span>
          )}

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Cash flow</span>
              <span>Income vs expenses</span>
            </div>

            <div
              className="flex h-3.5 gap-1 overflow-hidden rounded-full bg-secondary p-0.5"
              role="img"
              aria-label={`Income ${formatPercent(incomeShare)}, expenses ${formatPercent(expenseShare)}`}
            >
              {total > 0 && (
                <>
                  <div
                    className="dsh-grow h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${incomeShare}%`,
                      opacity: focus === "expense" ? 0.25 : 1,
                    }}
                  />
                  <div
                    className="dsh-grow h-full rounded-full bg-rose-500 transition-all duration-500"
                    style={{
                      width: `${expenseShare}%`,
                      opacity: focus === "income" ? 0.25 : 1,
                    }}
                  />
                </>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Income {formatPercent(incomeShare)}
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Expenses {formatPercent(expenseShare)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <FlowTile
            kind="income"
            amount={income}
            share={incomeShare}
            active={focus === "income"}
            dimmed={focus === "expense"}
            hidden={hidden}
            onFocusChange={setFocus}
          />
          <FlowTile
            kind="expense"
            amount={expense}
            share={expenseShare}
            active={focus === "expense"}
            dimmed={focus === "income"}
            hidden={hidden}
            onFocusChange={setFocus}
          />
        </div>
      </div>
    </section>
  );
}

function TransactionRow({
  transaction,
  index,
  hidden,
}: {
  transaction: DashboardTransaction;
  index: number;
  hidden: boolean;
}) {
  const isIncome = String(transaction.type).toLowerCase() === "income";
  const title = transaction.description || transaction.category_name;

  return (
    <div
      className="dsh-row group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition duration-300 hover:translate-x-1 hover:bg-secondary motion-reduce:transform-none"
      style={{ animationDelay: `${index * 70 + 300}ms` }}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 group-hover:h-6 ${isIncome ? "bg-emerald-500" : "bg-rose-500"
          }`}
      />

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none ${isIncome
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-rose-500/10 text-rose-500"
          }`}
      >
        {isIncome ? icons.income : icons.expense}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted transition group-hover:bg-card">
            {transaction.category_name}
          </span>
          <span className="text-xs text-muted">
            {formatDate(transaction.transaction_date)}
          </span>
        </div>
      </div>

      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-500" : "text-rose-500"
          }`}
      >
        {isIncome ? "+" : "−"}
        {displayCurrency(transaction.amount, hidden)}
      </p>
    </div>
  );
}

function BudgetRow({
  budget,
  index,
  hidden,
}: {
  budget: DashboardBudget;
  index: number;
  hidden: boolean;
}) {
  const spent = toNumber(budget.spent);
  const limit = toNumber(budget.budget);
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const exceeded = percentage > 100;
  const nearLimit = !exceeded && percentage >= 80;

  const barClass = exceeded
    ? "bg-gradient-to-r from-rose-500 to-danger"
    : nearLimit
      ? "bg-gradient-to-r from-amber-500 to-orange-400"
      : "bg-gradient-to-r from-primary to-primary/60";

  const badge = exceeded
    ? { label: "Over budget", className: "bg-danger/10 text-danger" }
    : nearLimit
      ? { label: "Near limit", className: "bg-amber-500/10 text-amber-500" }
      : { label: "On track", className: "bg-emerald-500/10 text-emerald-500" };

  return (
    <div
      className="dsh-row group space-y-3 rounded-2xl px-3 py-3.5 transition duration-300 hover:bg-secondary"
      style={{ animationDelay: `${index * 70 + 300}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold text-foreground">
              {budget.category_name}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {displayCurrency(spent, hidden)} of {displayCurrency(limit, hidden)}
          </p>
        </div>

        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${exceeded ? "text-danger" : "text-foreground"
            }`}
        >
          {percentage}%
        </span>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`dsh-grow dsh-bar relative h-full overflow-hidden rounded-full ${barClass}`}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute left-[80%] top-0 h-full w-px bg-foreground/15"
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 text-foreground sm:space-y-6" aria-busy="true">
      <div className="dsh-skeleton h-80 rounded-[2rem] border border-border bg-card sm:h-72" />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="dsh-skeleton h-80 rounded-[2rem] border border-border bg-card"
          />
        ))}
      </div>

      <div className="dsh-skeleton h-72 rounded-[2rem] border border-border bg-card" />
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="dsh-reveal relative overflow-hidden rounded-[2rem] border border-danger/20 bg-card p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="dsh-float pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-danger opacity-10 blur-3xl"
      />

      <div className="relative flex min-h-64 items-center justify-center">
        <div className="max-w-md text-center">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
            <span
              aria-hidden="true"
              className="dsh-pulse-ring absolute inset-0 rounded-full bg-danger/20"
            />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
              <span className="text-xl font-bold text-danger">!</span>
            </span>
          </div>

          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Failed to load dashboard
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="dsh-shine relative mt-6 overflow-hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [greeting] = useState(getGreeting);
  const firstName = useFirstName();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);


  const subscribeToHidden = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener("pocketa-hidden-change", callback);

    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("pocketa-hidden-change", callback);
    };
  }, []);

  const getHiddenSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  const getHiddenServerSnapshot = useCallback(() => false, []);

  const hidden = useSyncExternalStore(
    subscribeToHidden,
    getHiddenSnapshot,
    getHiddenServerSnapshot,
  );

  const handleToggleHidden = useCallback(() => {
    try {
      const next = !getHiddenSnapshot();

      localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event("pocketa-hidden-change"));
    } catch {
      // localStorage tidak tersedia.
    }
  }, [getHiddenSnapshot]);


  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<DashboardData> = token
      ? getDashboard(token).then((response) => response.data)
      : Promise.reject(new Error(SESSION_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        const isUnauthorized =
          err instanceof ApiError && err.status === 401;

        const isMissingSession =
          err instanceof Error && err.message === SESSION_ERROR;

        setError(
          isUnauthorized || isMissingSession ? SESSION_ERROR : LOAD_ERROR,
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleRefresh() {
    setError(null);
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  }

  return (
    <AppShell>
      <style>{`
        @keyframes dsh-reveal {
          from { opacity: 0; transform: translateY(22px) scale(0.98); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes dsh-row {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dsh-grow {
          from { width: 0; }
        }
        @keyframes dsh-indeterminate {
          from { transform: translateX(-100%); }
          to   { transform: translateX(350%); }
        }
        @keyframes dsh-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
        }
        @keyframes dsh-sheen {
          from { background-position: 0% 50%; }
          to   { background-position: 200% 50%; }
        }
        @keyframes dsh-sweep {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(260%) skewX(-18deg); }
        }
        @keyframes dsh-skeleton {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes dsh-pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes dsh-bar-shine {
          0%   { transform: translateX(-120%); }
          60%, 100% { transform: translateX(320%); }
        }

        .dsh-reveal { animation: dsh-reveal 650ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .dsh-row    { animation: dsh-row 500ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .dsh-grow   { animation: dsh-grow 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .dsh-indeterminate { animation: dsh-indeterminate 1.2s ease-in-out infinite; }
        .dsh-float  { animation: dsh-float 14s ease-in-out infinite; }
        .dsh-pulse-ring { animation: dsh-pulse-ring 1.8s ease-out infinite; }
        .dsh-title  { background-size: 200% 100%; animation: dsh-sheen 7s linear infinite; }

        .dsh-glow {
          background: radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), currentColor, transparent 70%);
        }

        .dsh-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-18deg);
          pointer-events: none;
        }
        .dsh-shine:hover::after { animation: dsh-sweep 900ms ease-out; }

        .dsh-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 35%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: dsh-bar-shine 3.2s ease-in-out infinite;
        }

        .dsh-skeleton { position: relative; overflow: hidden; }
        .dsh-skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 9%, transparent), transparent);
          animation: dsh-skeleton 1.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .dsh-reveal, .dsh-row, .dsh-grow, .dsh-indeterminate, .dsh-float,
          .dsh-pulse-ring, .dsh-title, .dsh-bar::after, .dsh-skeleton::after,
          .dsh-shine:hover::after { animation: none; }
        }
      `}</style>

      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div className="dsh-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between my-2">
          <div>
            <p className="text-sm font-medium text-primary">Financial overview</p>
            <h1
              suppressHydrationWarning
              className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
              👋🏼
            </h1>
            <p className="mt-2 text-sm text-muted">
              Review your balance, recent activity, and budget progress at a glance.
            </p>
          </div>
        </div>

        {isLoading && !dashboard ? (
          <DashboardSkeleton />
        ) : !dashboard ? (
          error ? (
            <ErrorCard message={error} onRetry={handleRefresh} />
          ) : null
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div
              className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${isLoading ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden="true"
            >
              <div className="dsh-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            {error && (
              <div
                role="alert"
                className="dsh-reveal flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-danger">{error}</p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="shrink-0 text-sm font-semibold text-danger underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            )}

            <div
              className={`space-y-4 transition-[opacity,filter] duration-300 sm:space-y-6 ${isLoading
                ? "pointer-events-none opacity-60 blur-[0.5px]"
                : "opacity-100"
                }`}
            >
              <BalanceHero
                summary={dashboard.summary}
                hidden={hidden}
                onToggleHidden={handleToggleHidden}
              />

              <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
                <Panel
                  title="Recent Transactions"
                  subtitle="Your latest financial activity."
                  href="/transactions"
                  delay={140}
                  icon={icons.receipt}
                >
                  {dashboard.recent_transactions.length > 0 ? (
                    dashboard.recent_transactions.map((transaction, index) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        index={index}
                        hidden={hidden}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={icons.receipt}
                      message="No transactions yet."
                      actionLabel="Add a transaction"
                      actionHref="/transactions"
                    />
                  )}
                </Panel>

                <Panel
                  title="Budget Overview"
                  subtitle="Track your spending against your budgets."
                  href="/budgets"
                  delay={200}
                  icon={icons.target}
                >
                  {dashboard.budgets.length > 0 ? (
                    dashboard.budgets.map((budget, index) => (
                      <BudgetRow
                        key={budget.id}
                        budget={budget}
                        index={index}
                        hidden={hidden}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={icons.target}
                      message="No budgets yet."
                      actionLabel="Create a budget"
                      actionHref="/budgets"
                    />
                  )}
                </Panel>
              </div>

              <div
                className="dsh-reveal min-w-0"
                style={{ animationDelay: "260ms" }}
              >
                <ExpenseByCategory data={dashboard.expense_by_category} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}