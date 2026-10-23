"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";
import { getAccounts, type Account } from "@/lib/accounts";
import { getCategories, type Category } from "@/lib/categories";
import { getToken } from "@/lib/auth-storage";

const AUTH_ERROR = "You are not logged in.";
const PAGE_SIZE = 20;
const MASK = "Rp ••••••";

type FilterType = "all" | TransactionType;
type PeriodFilter = "all" | "7d" | "30d" | "month";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
];

const QUICK_AMOUNTS = [
  { label: "+10K", value: 10_000 },
  { label: "+50K", value: 50_000 },
  { label: "+100K", value: 100_000 },
  { label: "+500K", value: 500_000 },
];

interface LoadedData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toNumber(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatRupiah(amount: number | string) {
  return `Rp ${Math.round(toNumber(amount)).toLocaleString("id-ID")}`;
}

function formatAmountInput(value: string) {
  const numericValue = value.replace(/\D/g, "");
  if (!numericValue) return "";
  return Number(numericValue).toLocaleString("id-ID");
}

function parseAmount(value: string) {
  return Number(value.replace(/\./g, "")) || 0;
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return getLocalDate(new Date(year, month - 1, day + days));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date: string) {
  if (!date) return "-";
  const [year, month, day] = date.slice(0, 10).split("-");
  if (!year || !month || !day) return date;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function formatGroupDate(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "Today";
  if (dateKey === addDays(todayKey, -1)) return "Yesterday";
  return parseDateKey(dateKey).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function csvCell(value: string, isText = true) {
  let cell = value;
  if (isText && /^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  cell = cell.replace(/"/g, '""');
  return /[",\n\r]/.test(cell) ? `"${cell}"` : cell;
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min((now - startedAt) / duration, 1);
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

function SvgIcon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function typeIcon(type: TransactionType, size = 20) {
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
  copy: (
    <SvgIcon size={16}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
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
  receipt: (
    <SvgIcon size={28}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </SvgIcon>
  ),
  list: (
    <SvgIcon>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </SvgIcon>
  ),
  download: (
    <SvgIcon size={16}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </SvgIcon>
  ),
  calendar: (
    <SvgIcon size={18}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </SvgIcon>
  ),
  eye: (
    <SvgIcon size={18}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  ),
  eyeOff: (
    <SvgIcon size={18}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </SvgIcon>
  ),
};

const typeMeta: Record<
  TransactionType,
  {
    label: string;
    tile: string;
    badge: string;
    text: string;
    selected: string;
    pill: string;
    bar: string;
    focus: string;
    sign: string;
  }
> = {
  income: {
    label: "Income",
    tile: "bg-success/10 text-success ring-success/20",
    badge: "bg-success/10 text-success",
    text: "text-success",
    selected: "border-success bg-success/10 text-success",
    pill: "bg-success",
    bar: "bg-success",
    focus: "focus:border-success focus:ring-success/15",
    sign: "+",
  },
  expense: {
    label: "Expense",
    tile: "bg-danger/10 text-danger ring-danger/20",
    badge: "bg-danger/10 text-danger",
    text: "text-danger",
    selected: "border-danger bg-danger/10 text-danger",
    pill: "bg-danger",
    bar: "bg-danger",
    focus: "focus:border-danger focus:ring-danger/15",
    sign: "−",
  },
};

const inputClass =
  "block h-11 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition duration-300 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-sm";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden min-w-5 items-center justify-center rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted lg:inline-flex">
      {children}
    </kbd>
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
          <mark key={index} className="rounded bg-primary/20 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  pillClass,
  pillText,
  counts,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  pillClass: string;
  pillText: string;
  counts?: Record<T, number>;
  className?: string;
}) {
  const index = options.findIndex((item) => item.value === value);

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative grid rounded-2xl border border-border bg-background p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-1 left-1 top-1 rounded-xl shadow-md transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none ${pillClass}`}
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
            className={`relative flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary ${selected ? pillText : "text-muted hover:text-foreground"
              }`}
          >
            {item.label}
            {counts && (
              <span className={`text-xs tabular-nums ${selected ? "opacity-80" : "opacity-60"}`}>
                {counts[item.value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StatTile({
  title,
  value,
  format,
  description,
  icon,
  accent,
  glow,
  valueClass = "text-foreground",
  index,
}: {
  title: string;
  value: number;
  format: (value: number) => string;
  description: string;
  icon: ReactNode;
  accent: string;
  glow: string;
  valueClass?: string;
  index: number;
}) {
  const animated = useCountUp(value);

  return (
    <div
      onMouseMove={handleSpotlightMove}
      style={{ animationDelay: `${240 + index * 90}ms` }}
      className="trx-reveal group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-background/60 p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 motion-reduce:transform-none"
    >
      <span
        aria-hidden="true"
        className={`trx-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-[0.14] ${glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className={`mt-2 break-words text-lg font-bold tabular-nums sm:text-xl ${valueClass}`}>
            {format(animated)}
          </p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110 motion-reduce:transform-none ${accent}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function DeltaBadge({ delta, goodWhenUp }: { delta: number | null; goodWhenUp: boolean }) {
  if (delta === null) {
    return (
      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted">
        No data
      </span>
    );
  }

  const up = delta >= 0;
  const good = up === goodWhenUp;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${good ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="10"
        height="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={up ? "" : "rotate-180"}
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {Math.abs(delta).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%
    </span>
  );
}

interface MonthStats {
  label: string;
  income: number;
  expense: number;
  incomeDelta: number | null;
  expenseDelta: number | null;
}

function TransactionsHero({
  totals,
  count,
  month,
  hidden,
  onToggleHidden,
}: {
  totals: { income: number; expense: number };
  count: number;
  month: MonthStats;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const balance = totals.income - totals.expense;
  const total = totals.income + totals.expense;
  const incomeShare = total > 0 ? (totals.income / total) * 100 : 0;
  const expenseShare = total > 0 ? 100 - incomeShare : 0;

  const animatedBalance = useCountUp(balance, 1400);
  const monthNet = month.income - month.expense;
  const money = (value: number) => (hidden ? MASK : formatRupiah(value));

  return (
    <section
      onMouseMove={handleSpotlightMove}
      style={{ animationDelay: "60ms" }}
      className="trx-reveal group relative overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
    >
      <span
        aria-hidden="true"
        className="trx-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        className="trx-drift pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className={`trx-drift-slow pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl ${balance >= 0 ? "bg-success" : "bg-danger"
          }`}
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

      <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">Net balance</p>
            <button
              type="button"
              onClick={onToggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? "Show amounts" : "Hide amounts"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
            >
              {hidden ? icons.eyeOff : icons.eye}
            </button>
          </div>

          <p
            className={`mt-2 break-words text-4xl font-bold tabular-nums tracking-tight sm:text-6xl ${balance >= 0
              ? "bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent"
              : "text-danger"
              }`}
          >
            {hidden ? (
              MASK
            ) : (
              <>
                {balance > 0 ? "+" : balance < 0 ? "−" : ""}
                {formatRupiah(Math.abs(animatedBalance))}
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-muted">
            From {count.toLocaleString("id-ID")} {count === 1 ? "transaction" : "transactions"}
          </p>

          <div
            className="mt-6 flex h-3.5 gap-1 overflow-hidden rounded-full bg-secondary p-0.5"
            role="img"
            aria-label="Income compared to expenses"
          >
            {total > 0 && (
              <>
                {totals.income > 0 && (
                  <div
                    title={`Income ${incomeShare.toFixed(0)}%`}
                    className="trx-grow h-full rounded-full bg-success"
                    style={{ width: `${incomeShare}%` }}
                  />
                )}
                {totals.expense > 0 && (
                  <div
                    title={`Expenses ${expenseShare.toFixed(0)}%`}
                    className="trx-grow h-full rounded-full bg-danger"
                    style={{ width: `${expenseShare}%` }}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatTile
              index={0}
              title="Total income"
              value={totals.income}
              format={money}
              description="All time"
              icon={typeIcon("income")}
              accent="bg-success/10 text-success ring-success/20"
              glow="text-success"
              valueClass="text-success"
            />
            <StatTile
              index={1}
              title="Total expenses"
              value={totals.expense}
              format={money}
              description="All time"
              icon={typeIcon("expense")}
              accent="bg-danger/10 text-danger ring-danger/20"
              glow="text-danger"
              valueClass="text-danger"
            />
            <StatTile
              index={2}
              title="Transactions"
              value={count}
              format={(value) => Math.round(value).toLocaleString("id-ID")}
              description="Recorded"
              icon={icons.list}
              accent="bg-primary/10 text-primary ring-primary/20"
              glow="text-primary"
            />
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-border bg-background/60 p-4 backdrop-blur sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">This month</h3>
              <p className="text-xs text-muted">{month.label}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted">
              {icons.calendar}
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {(
              [
                { type: "income", value: month.income, delta: month.incomeDelta, goodWhenUp: true },
                { type: "expense", value: month.expense, delta: month.expenseDelta, goodWhenUp: false },
              ] as const
            ).map((row, index) => {
              const meta = typeMeta[row.type];

              return (
                <li
                  key={row.type}
                  className="trx-row flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-secondary"
                  style={{ animationDelay: `${300 + index * 80}ms` }}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.tile}`}>
                    {typeIcon(row.type, 16)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{meta.label}</p>
                    <p className={`truncate text-sm font-semibold tabular-nums ${meta.text}`}>
                      {money(row.value)}
                    </p>
                  </div>

                  <DeltaBadge delta={row.delta} goodWhenUp={row.goodWhenUp} />
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2.5">
            <span className="text-xs font-medium text-muted">Net this month</span>
            <span
              className={`text-sm font-bold tabular-nums ${monthNet >= 0 ? "text-success" : "text-danger"}`}
            >
              {hidden ? MASK : `${monthNet >= 0 ? "+" : "−"}${formatRupiah(Math.abs(monthNet))}`}
            </span>
          </div>

          <p className="mt-3 text-[11px] text-muted">
            Percentages are compared with the previous month.
          </p>
        </div>
      </div>
    </section>
  );
}

function TransactionRow({
  transaction,
  index,
  query,
  hidden,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  transaction: Transaction;
  index: number;
  query: string;
  hidden: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta[transaction.type];

  return (
    <div
      className="trx-row group relative flex items-center gap-3 px-4 py-4 transition duration-300 hover:bg-secondary/60 sm:gap-4 sm:px-5"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-1 origin-center scale-y-0 rounded-r-full transition-transform duration-300 group-hover:scale-y-100 motion-reduce:transition-none ${meta.bar}`}
      />

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110 motion-reduce:transform-none ${meta.tile}`}
      >
        {typeIcon(transaction.type)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold text-foreground">
            <Highlight text={transaction.category_name} query={query} />
          </p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-muted">
          <Highlight text={transaction.account_name} query={query} />
        </p>

        {transaction.description && (
          <p className="mt-0.5 truncate text-xs text-muted">
            <Highlight text={transaction.description} query={query} />
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className={`text-sm font-semibold tabular-nums sm:text-base ${meta.text}`}>
          {hidden ? MASK : `${meta.sign}${formatRupiah(transaction.amount)}`}
        </p>

        <div className="flex gap-1 transition duration-300 md:translate-x-2 md:opacity-0 md:group-focus-within:translate-x-0 md:group-focus-within:opacity-100 md:group-hover:translate-x-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${transaction.category_name} transaction`}
            title="Edit"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground outline-none transition hover:-translate-y-0.5 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
          >
            {icons.edit}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label={`Duplicate ${transaction.category_name} transaction`}
            title="Duplicate"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground outline-none transition hover:-translate-y-0.5 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
          >
            {icons.copy}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${transaction.category_name} transaction`}
            title="Delete"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-danger/20 text-danger outline-none transition hover:-translate-y-0.5 hover:bg-danger/5 focus-visible:ring-2 focus-visible:ring-danger active:scale-90"
          >
            {icons.trash}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({
  transaction,
  deleting,
  onCancel,
  onConfirm,
}: {
  transaction: Transaction;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const meta = typeMeta[transaction.type];

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="trx-fade absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        className="trx-pop relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/20">
          {icons.trash}
        </div>

        <h3 id="delete-transaction-title" className="mt-4 text-lg font-semibold text-foreground">
          Delete this transaction?
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {transaction.category_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">{formatDate(transaction.transaction_date)}</p>
          </div>

          <p className={`shrink-0 text-sm font-semibold tabular-nums ${meta.text}`}>
            {meta.sign}
            {formatRupiah(transaction.amount)}
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">This action cannot be undone.</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            Keep transaction
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? "Deleting..." : "Delete transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsNew = searchParams.get("new") === "1";

  const [todayKey] = useState(() => getLocalDate());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [hidden, setHidden] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [handledNew, setHandledNew] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  function resetForm() {
    setAccountId("");
    setCategoryId("");
    setType("expense");
    setAmount("");
    setDescription("");
    setTransactionDate("");
    setEditingTransaction(null);
  }

  function startCreate() {
    setError("");
    resetForm();
    setTransactionDate(todayKey);
    setType(filterType === "income" ? "income" : "expense");
    setShowForm(true);
    setFocusKey((key) => key + 1);
  }

  if (wantsNew && !handledNew) {
    setHandledNew(true);
    startCreate();
  } else if (!wantsNew && handledNew) {
    setHandledNew(false);
  }

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    const request: Promise<LoadedData> = token
      ? Promise.all([
        getTransactions(token),
        getAccounts(token),
        getCategories(token),
      ]).then(([transactionsResponse, accountsResponse, categoriesResponse]) => ({
        transactions: transactionsResponse.data,
        accounts: accountsResponse.data,
        categories: categoriesResponse.data,
      }))
      : Promise.reject(new Error(AUTH_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.transactions);
        setAccounts(data.accounts);
        setCategories(data.categories);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load transaction data."));
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
      if (event.key === "Escape" && deletingId === null) setDeleteTarget(null);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deletingId]);

  const shortcutsRef = useRef({ canUse: true, openCreate: () => { } });

  useEffect(() => {
    shortcutsRef.current = {
      canUse: deleteTarget === null && !showForm,
      openCreate: startCreate,
    };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key.toLowerCase() === "n" && shortcutsRef.current.canUse) {
        event.preventDefault();
        shortcutsRef.current.openCreate();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const accountOptions = useMemo(
    () => accounts.filter((account) => account.is_active || String(account.id) === accountId),
    [accounts, accountId],
  );

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const transaction of transactions) {
      const value = toNumber(transaction.amount);

      if (transaction.type === "income") {
        income += value;
        incomeCount += 1;
      } else {
        expense += value;
        expenseCount += 1;
      }
    }

    return { income, expense, incomeCount, expenseCount };
  }, [transactions]);

  const monthStats = useMemo<MonthStats>(() => {
    const [year, month] = todayKey.split("-").map(Number);
    const current = new Date(year, month - 1, 1);
    const previous = new Date(year, month - 2, 1);
    const currentKey = monthKeyOf(current);
    const previousKey = monthKeyOf(previous);

    const sums = {
      [currentKey]: { income: 0, expense: 0 },
      [previousKey]: { income: 0, expense: 0 },
    };

    for (const transaction of transactions) {
      const key = transaction.transaction_date.slice(0, 7);
      const bucket = sums[key];
      if (!bucket) continue;

      const value = toNumber(transaction.amount);
      if (transaction.type === "income") bucket.income += value;
      else bucket.expense += value;
    }

    const delta = (now: number, before: number) =>
      before > 0 ? ((now - before) / before) * 100 : null;

    return {
      label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(current),
      income: sums[currentKey].income,
      expense: sums[currentKey].expense,
      incomeDelta: delta(sums[currentKey].income, sums[previousKey].income),
      expenseDelta: delta(sums[currentKey].expense, sums[previousKey].expense),
    };
  }, [transactions, todayKey]);

  const counts = {
    all: transactions.length,
    income: totals.incomeCount,
    expense: totals.expenseCount,
  } satisfies Record<FilterType, number>;

  const periodStart = useMemo(() => {
    switch (periodFilter) {
      case "7d":
        return addDays(todayKey, -6);
      case "30d":
        return addDays(todayKey, -29);
      case "month":
        return `${todayKey.slice(0, 7)}-01`;
      default:
        return null;
    }
  }, [periodFilter, todayKey]);

  const sortedTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const matchesType = filterType === "all" || transaction.type === filterType;
        const matchesAccount =
          accountFilter === "all" || String(transaction.account_id) === accountFilter;
        const matchesPeriod =
          periodStart === null || transaction.transaction_date.slice(0, 10) >= periodStart;
        const matchesSearch =
          !query ||
          transaction.category_name.toLowerCase().includes(query) ||
          transaction.account_name.toLowerCase().includes(query) ||
          Boolean(transaction.description?.toLowerCase().includes(query));

        return matchesType && matchesAccount && matchesPeriod && matchesSearch;
      })
      .sort((a, b) =>
        b.transaction_date.slice(0, 10).localeCompare(a.transaction_date.slice(0, 10)),
      );
  }, [transactions, searchQuery, filterType, accountFilter, periodStart]);

  const dayNet = useMemo(() => {
    const map = new Map<string, number>();

    for (const transaction of sortedTransactions) {
      const key = transaction.transaction_date.slice(0, 10);
      const signed = (transaction.type === "income" ? 1 : -1) * toNumber(transaction.amount);
      map.set(key, (map.get(key) ?? 0) + signed);
    }

    return map;
  }, [sortedTransactions]);

  const filteredNet = useMemo(
    () =>
      sortedTransactions.reduce(
        (sum, transaction) =>
          sum + (transaction.type === "income" ? 1 : -1) * toNumber(transaction.amount),
        0,
      ),
    [sortedTransactions],
  );

  const shown = sortedTransactions.slice(0, limit);
  const remaining = sortedTransactions.length - shown.length;

  const groups: { date: string; start: number; items: Transaction[] }[] = [];

  shown.forEach((transaction, position) => {
    const key = transaction.transaction_date.slice(0, 10);
    const last = groups[groups.length - 1];

    if (last && last.date === key) last.items.push(transaction);
    else groups.push({ date: key, start: position, items: [transaction] });
  });

  const parsedAmount = parseAmount(amount);
  const selectedAccount = accounts.find((account) => String(account.id) === accountId);
  const balanceAfter =
    !editingTransaction && selectedAccount && parsedAmount > 0
      ? toNumber(selectedAccount.balance) + (type === "income" ? parsedAmount : -parsedAmount)
      : null;

  const isFiltering =
    searchQuery.trim() !== "" ||
    filterType !== "all" ||
    periodFilter !== "all" ||
    accountFilter !== "all";

  function stripNewParam() {
    if (wantsNew) router.replace("/transactions", { scroll: false });
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
    stripNewParam();
  }

  function toggleForm() {
    if (showForm) {
      setError("");
      closeForm();
    } else {
      startCreate();
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterType("all");
    setPeriodFilter("all");
    setAccountFilter("all");
    setLimit(PAGE_SIZE);
  }

  function handleTypeChange(newType: TransactionType) {
    if (newType === type) return;
    setType(newType);
    setCategoryId("");
  }

  function fillFrom(transaction: Transaction) {
    setAccountId(String(transaction.account_id));
    setCategoryId(String(transaction.category_id));
    setType(transaction.type);
    setAmount(formatAmountInput(String(Math.round(toNumber(transaction.amount)))));
    setDescription(transaction.description ?? "");
  }

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    fillFrom(transaction);
    setTransactionDate(transaction.transaction_date.slice(0, 10));
    setShowForm(true);
    setFocusKey((key) => key + 1);
    setError("");
  }

  function handleDuplicate(transaction: Transaction) {
    setEditingTransaction(null);
    fillFrom(transaction);
    setTransactionDate(todayKey);
    setShowForm(true);
    setFocusKey((key) => key + 1);
    setError("");
    notify("Copied as a new transaction. Review and save.");
  }

  function addQuickAmount(value: number) {
    setAmount(formatAmountInput(String(parsedAmount + value)));
  }

  async function submit(addAnother: boolean) {
    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    if (!transactionDate) {
      setError("Transaction date is required.");
      return;
    }

    const wasEditing = editingTransaction !== null;

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        account_id: Number(accountId),
        category_id: Number(categoryId),
        type,
        amount: parsedAmount,
        description: description.trim() || undefined,
        transaction_date: transactionDate,
      };

      if (editingTransaction !== null) {
        await updateTransaction(token, editingTransaction.id, payload);
      } else {
        await createTransaction(token, payload);
      }

      notify(wasEditing ? "Transaction updated" : "Transaction added");

      if (addAnother && !wasEditing) {
        setAmount("");
        setDescription("");
        setFocusKey((key) => key + 1);
      } else {
        closeForm();
      }

      reload();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          wasEditing ? "Failed to update transaction." : "Failed to create transaction.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(false);
  }

  async function handleDelete(transaction: Transaction) {
    const token = getToken();

    if (!token) {
      setDeleteTarget(null);
      setError(AUTH_ERROR);
      return;
    }

    try {
      setDeletingId(transaction.id);
      setError("");

      await deleteTransaction(token, transaction.id);

      if (editingTransaction?.id === transaction.id) closeForm();

      notify("Transaction deleted");
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete transaction."));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  function exportCsv() {
    const header = ["Date", "Type", "Category", "Account", "Description", "Amount"];

    const rows = sortedTransactions.map((transaction) => [
      csvCell(transaction.transaction_date.slice(0, 10), false),
      csvCell(transaction.type),
      csvCell(transaction.category_name),
      csvCell(transaction.account_name),
      csvCell(transaction.description ?? ""),
      csvCell(String(toNumber(transaction.amount)), false),
    ]);

    const csv = [header.map((cell) => csvCell(cell)), ...rows]
      .map((row) => row.join(","))
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pocketa-transactions-${todayKey}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify(
      `Exported ${rows.length} ${rows.length === 1 ? "transaction" : "transactions"} successfully`,
    );
  }

  const formType = typeMeta[type];

  return (
    <AppShell>
      <style>{`
        @keyframes trx-reveal { from { opacity: 0; transform: translateY(22px) scale(0.985); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes trx-row { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
        @keyframes trx-pop { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes trx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes trx-grow { from { width: 0; } }
        @keyframes trx-drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(34px,24px) scale(1.12); } }
        @keyframes trx-toast { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: none; } }
        @keyframes trx-indeterminate { from { transform: translateX(-100%); } to { transform: translateX(350%); } }
        @keyframes trx-shine { from { transform: translateX(-120%) skewX(-20deg); } to { transform: translateX(260%) skewX(-20deg); } }

        .trx-reveal { animation: trx-reveal 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .trx-row { animation: trx-row 450ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .trx-pop { animation: trx-pop 280ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .trx-fade { animation: trx-fade 220ms ease-out backwards; }
        .trx-grow { animation: trx-grow 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .trx-drift { animation: trx-drift 14s ease-in-out infinite; }
        .trx-drift-slow { animation: trx-drift 22s ease-in-out infinite reverse; }
        .trx-toast { animation: trx-toast 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .trx-indeterminate { animation: trx-indeterminate 1.2s ease-in-out infinite; }

        .trx-glow { background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), currentColor, transparent 70%); }

        .trx-shine { position: relative; overflow: hidden; }
        .trx-shine::after {
          content: ""; position: absolute; inset: 0; width: 40%;
          background: linear-gradient(90deg, transparent, currentColor, transparent); opacity: 0.25;
          transform: translateX(-120%) skewX(-20deg);
        }
        .trx-shine:hover::after { animation: trx-shine 900ms ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .trx-reveal, .trx-row, .trx-pop, .trx-fade, .trx-grow, .trx-drift, .trx-drift-slow, .trx-toast, .trx-indeterminate { animation: none; }
          .trx-shine:hover::after { animation: none; }
        }
      `}</style>

      <div className="mx-auto min-w-0 max-w-6xl space-y-5 sm:space-y-7">
        <div className="trx-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Money movement</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Transactions &amp; History
            </h1>
            <p className="mt-2 text-sm text-muted">
              Track every income and expense, then search, filter, and export your records.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleForm}
            aria-expanded={showForm}
            className="trx-shine inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-95 sm:w-auto"
          >
            <span
              className={`transition-transform duration-500 ease-out motion-reduce:transform-none ${showForm ? "rotate-[135deg]" : ""
                }`}
            >
              {icons.plus}
            </span>
            {showForm ? "Cancel" : "Add transaction"}
            {!showForm && (
              <span className="hidden rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold lg:inline">
                N
              </span>
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="trx-pop flex items-start justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error message"
              className="shrink-0 rounded-md p-0.5 transition hover:bg-danger/10"
            >
              {icons.close}
            </button>
          </div>
        )}

        {!loading && (
          <TransactionsHero
            totals={totals}
            count={transactions.length}
            month={monthStats}
            hidden={hidden}
            onToggleHidden={() => setHidden((current) => !current)}
          />
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="trx-pop relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-5 shadow-xl shadow-primary/5 sm:p-7"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-colors duration-500 ${formType.bar}`}
            />

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingTransaction !== null ? "Edit transaction" : "Add transaction"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {editingTransaction !== null
                  ? "Update the details of this transaction."
                  : "Record a new income or expense transaction."}
              </p>
            </div>

            <div className="space-y-6">
              <SegmentedControl<TransactionType>
                label="Transaction type"
                value={type}
                onChange={handleTypeChange}
                options={[
                  { value: "expense", label: "Expense" },
                  { value: "income", label: "Income" },
                ]}
                pillClass={formType.pill}
                pillText="text-white"
                className="sm:max-w-xs"
              />

              <div>
                <label
                  htmlFor="transaction-amount"
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
                    ref={amountInputRef}
                    id="transaction-amount"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(formatAmountInput(event.target.value))}
                    placeholder="200.000"
                    autoComplete="off"
                    className={`block h-16 w-full min-w-0 rounded-2xl border border-border bg-background pl-14 pr-4 text-3xl font-bold tabular-nums text-foreground outline-none transition duration-300 focus:ring-4 ${formType.focus}`}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => addQuickAmount(item.value)}
                      className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground active:scale-95"
                    >
                      {item.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      className="trx-fade rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Category</p>

                {categoryOptions.length > 0 ? (
                  <div
                    role="radiogroup"
                    aria-label="Category"
                    className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1"
                  >
                    {categoryOptions.map((category) => {
                      const selected = categoryId === String(category.id);

                      return (
                        <button
                          key={category.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setCategoryId(String(category.id))}
                          className={`rounded-full border px-4 py-2 text-sm font-medium outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                            ? `${formType.selected} shadow-sm`
                            : "border-border text-muted hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                            }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-danger">
                    No {formType.label.toLowerCase()} categories yet. Create one first in the
                    Categories menu.
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="transaction-account"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Account
                  </label>

                  <select
                    id="transaction-account"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select account</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — {formatRupiah(account.balance)}
                      </option>
                    ))}
                  </select>

                  <p
                    className={`mt-1.5 min-h-4 text-xs transition-colors ${balanceAfter !== null && balanceAfter < 0
                      ? "font-medium text-danger"
                      : "text-muted"
                      }`}
                  >
                    {balanceAfter !== null
                      ? balanceAfter < 0
                        ? `This will make the balance negative (${formatRupiah(balanceAfter)}).`
                        : `Balance after: ${formatRupiah(balanceAfter)}`
                      : "Select the account used for this transaction."}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="transaction-date"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Transaction date
                  </label>

                  <input
                    id="transaction-date"
                    type="date"
                    value={transactionDate}
                    onChange={(event) => setTransactionDate(event.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  />

                  <div className="mt-2 flex gap-2">
                    {[
                      { label: "Today", key: todayKey },
                      { label: "Yesterday", key: addDays(todayKey, -1) },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setTransactionDate(item.key)}
                        aria-pressed={transactionDate === item.key}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-300 active:scale-95 ${transactionDate === item.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="transaction-description"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Description
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                </label>

                <input
                  id="transaction-description"
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Lunch with friends"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={toggleForm}
                disabled={submitting}
                className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
              >
                Cancel
              </button>

              {editingTransaction === null && (
                <button
                  type="button"
                  onClick={() => void submit(true)}
                  disabled={submitting}
                  className="h-11 rounded-xl border border-primary/30 bg-primary/5 px-5 text-sm font-semibold text-primary transition hover:bg-primary/10 active:scale-95 disabled:opacity-60"
                >
                  Save &amp; add another
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="trx-shine inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Spinner /> : null}
                {submitting
                  ? editingTransaction !== null
                    ? "Updating..."
                    : "Creating..."
                  : editingTransaction !== null
                    ? "Update transaction"
                    : "Create transaction"}
              </button>
            </div>
          </form>
        )}

        {!loading && (
          <div
            className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${refreshing ? "opacity-100" : "opacity-0"
              }`}
            aria-hidden="true"
          >
            <div className="trx-indeterminate h-full w-1/4 rounded-full bg-primary" />
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div
            className="trx-reveal space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-5"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-sm">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                  {icons.search}
                </span>

                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  placeholder="Search transactions..."
                  aria-label="Search transactions"
                  className={`${inputClass} pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none`}
                />

                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setLimit(PAGE_SIZE);
                    }}
                    aria-label="Clear search"
                    className="trx-fade absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-secondary hover:text-foreground"
                  >
                    {icons.close}
                  </button>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Kbd>/</Kbd>
                  </span>
                )}
              </div>

              <SegmentedControl<FilterType>
                label="Filter by type"
                options={FILTERS}
                value={filterType}
                onChange={(value) => {
                  setFilterType(value);
                  setLimit(PAGE_SIZE);
                }}
                counts={counts}
                pillClass={
                  filterType === "income"
                    ? "bg-success"
                    : filterType === "expense"
                      ? "bg-danger"
                      : "bg-primary"
                }
                pillText={filterType === "all" ? "text-primary-foreground" : "text-white"}
                className="lg:w-96"
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
                {PERIODS.map((period) => {
                  const selected = periodFilter === period.value;

                  return (
                    <button
                      key={period.value}
                      type="button"
                      onClick={() => {
                        setPeriodFilter(period.value);
                        setLimit(PAGE_SIZE);
                      }}
                      aria-pressed={selected}
                      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition duration-300 active:scale-95 ${selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <select
                  value={accountFilter}
                  onChange={(event) => {
                    setAccountFilter(event.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  aria-label="Filter by account"
                  className={`${inputClass} h-10 min-w-0 flex-1 text-sm lg:w-48 lg:flex-none`}
                >
                  <option value="all">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={sortedTransactions.length === 0}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {icons.download}
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {isFiltering && (
              <div
                className="trx-fade flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted"
                aria-live="polite"
              >
                <p>
                  Showing{" "}
                  <span className="font-semibold text-foreground">{sortedTransactions.length}</span>{" "}
                  of {transactions.length} transactions · Net{" "}
                  <span
                    className={`font-semibold tabular-nums ${filteredNet >= 0 ? "text-success" : "text-danger"
                      }`}
                  >
                    {hidden
                      ? MASK
                      : `${filteredNet >= 0 ? "+" : "−"}${formatRupiah(Math.abs(filteredNet))}`}
                  </span>
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-5" aria-busy="true">
            <div className="h-80 animate-pulse rounded-[2rem] border border-border bg-card lg:h-72" />
            <div className="h-96 animate-pulse rounded-3xl border border-border bg-card" />
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="trx-reveal rounded-3xl border border-dashed border-border bg-card p-10 text-center sm:p-16">
            <span className="trx-drift mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
              {transactions.length === 0 ? icons.receipt : icons.search}
            </span>
            <p className="mt-5 text-lg font-semibold text-foreground">
              {transactions.length === 0 ? "No transactions yet" : "No matching transactions"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              {transactions.length === 0
                ? "Your transactions will appear here."
                : "Try changing your search or filters."}
            </p>

            {transactions.length === 0 && !showForm ? (
              <button
                type="button"
                onClick={toggleForm}
                className="trx-shine mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 active:scale-95"
              >
                {icons.plus}
                Add your first transaction
              </button>
            ) : (
              isFiltering && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95"
                >
                  Clear search and filters
                </button>
              )
            )}
          </div>
        ) : (
          <div
            className={`space-y-4 transition-opacity duration-300 sm:space-y-5 ${refreshing ? "opacity-70" : "opacity-100"
              }`}
          >
            {groups.map((group, groupIndex) => {
              const net = dayNet.get(group.date) ?? 0;

              return (
                <section
                  key={group.date}
                  style={{ animationDelay: `${Math.min(groupIndex, 6) * 70}ms` }}
                  className="trx-reveal overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5"
                  aria-label={formatGroupDate(group.date, todayKey)}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {formatGroupDate(group.date, todayKey)}
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                        {group.items.length}
                      </span>
                    </div>

                    <p
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${net >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                    >
                      {hidden ? MASK : `${net >= 0 ? "+" : "−"}${formatRupiah(Math.abs(net))}`}
                    </p>
                  </div>

                  <div className="divide-y divide-border">
                    {group.items.map((transaction, offset) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        index={group.start + offset}
                        query={searchQuery}
                        hidden={hidden}
                        onEdit={() => handleEdit(transaction)}
                        onDuplicate={() => handleDuplicate(transaction)}
                        onDelete={() => setDeleteTarget(transaction)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {remaining > 0 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setLimit((current) => current + PAGE_SIZE)}
                  className="rounded-2xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary active:scale-95"
                >
                  Show more ({remaining} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          transaction={deleteTarget}
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
            className="trx-toast pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-4 py-3 text-sm font-medium text-foreground shadow-2xl backdrop-blur-xl"
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  );
}