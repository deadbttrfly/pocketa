"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppShell from "@/components/layout/AppShell";
import { getToken } from "@/lib/auth-storage";
import {
  getBudgetPerformanceReport,
  getExpenseCategoryReport,
  getIncomeExpenseReport,
  getMonthlyTrendReport,
  getReportSummary,
  type BudgetPerformance,
  type ExpenseCategory,
  type IncomeExpenseReport,
  type MonthlyTrend,
  type ReportSummary,
} from "@/lib/reports";

const FALLBACK_THEME = {
  primary: "#8b5cf6",
  success: "#10b981",
  danger: "#f43f5e",
  muted: "#94a3b8",
  border: "#e2e8f0",
};

type ThemeColors = typeof FALLBACK_THEME;

let themeVersion = 0;
let themeCache: { version: number; value: string } | null = null;

function readThemeSnapshot(): string {
  if (themeCache && themeCache.version === themeVersion) {
    return themeCache.value;
  }

  const probes: [keyof ThemeColors, string, "color" | "borderTopColor"][] = [
    ["primary", "text-primary", "color"],
    ["success", "text-success", "color"],
    ["danger", "text-danger", "color"],
    ["muted", "text-muted", "color"],
    ["border", "border border-border", "borderTopColor"],
  ];

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(host);

  const colors: ThemeColors = { ...FALLBACK_THEME };

  for (const [key, className, property] of probes) {
    const element = document.createElement("span");
    element.className = className;
    host.appendChild(element);

    const value = getComputedStyle(element)[property];

    if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
      colors[key] = value;
    }
  }

  document.body.removeChild(host);

  const value = JSON.stringify(colors);
  themeCache = { version: themeVersion, value };

  return value;
}

function subscribeTheme(onChange: () => void) {
  const bump = () => {
    themeVersion += 1;
    onChange();
  };

  const observer = new MutationObserver(bump);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", bump);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", bump);
  };
}

function useThemeColors(): ThemeColors {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    readThemeSnapshot,
    () => JSON.stringify(FALLBACK_THEME),
  );

  return useMemo(() => JSON.parse(snapshot) as ThemeColors, [snapshot]);
}

const SESSION_ERROR = "Session not found. Please log in again.";

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function diffDays(from: string, to: string) {
  return Math.round(
    (parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000,
  );
}

function buildPresets() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = getLocalDate(now);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);

  return [
    {
      id: "month",
      label: "This month",
      start: getLocalDate(new Date(year, month, 1)),
      end: today,
    },
    {
      id: "30d",
      label: "Last 30 days",
      start: getLocalDate(thirtyDaysAgo),
      end: today,
    },
    {
      id: "3m",
      label: "Last 3 months",
      start: getLocalDate(new Date(year, month - 2, 1)),
      end: today,
    },
    {
      id: "year",
      label: "This year",
      start: `${year}-01-01`,
      end: today,
    },
    {
      id: "last-year",
      label: "Last year",
      start: `${year - 1}-01-01`,
      end: `${year - 1}-12-31`,
    },
  ];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);

  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface ReportBundle {
  summary: ReportSummary;
  incomeExpense: IncomeExpenseReport;
  categories: ExpenseCategory[];
  monthlyTrend: MonthlyTrend[];
  budgets: BudgetPerformance[];
}

async function fetchReports(
  token: string,
  start: string,
  end: string,
): Promise<ReportBundle> {
  const [summary, incomeExpense, categories, monthlyTrend, budgets] =
    await Promise.all([
      getReportSummary(token, start, end),
      getIncomeExpenseReport(token, start, end),
      getExpenseCategoryReport(token, start, end),
      getMonthlyTrendReport(token, start, end),
      getBudgetPerformanceReport(token, start, end),
    ]);

  return {
    summary: summary.data,
    incomeExpense: incomeExpense.data,
    categories: categories.data.categories,
    monthlyTrend: monthlyTrend.data.months,
    budgets: budgets.data.budgets,
  };
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

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);

      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
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
  count: (
    <SvgIcon>
      <path d="M5 9h14" />
      <path d="M5 15h14" />
      <path d="M10 4 8 20" />
      <path d="M16 4l-2 16" />
    </SvgIcon>
  ),
  chart: (
    <SvgIcon size={22}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </SvgIcon>
  ),
  tag: (
    <SvgIcon>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </SvgIcon>
  ),
  sun: (
    <SvgIcon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </SvgIcon>
  ),
  star: (
    <SvgIcon>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
    </SvgIcon>
  ),
  refresh: (
    <SvgIcon size={16}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </SvgIcon>
  ),
};

const inputClass =
  "block min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      onMouseMove={handleSpotlightMove}
      className={`rpt-reveal group relative min-w-0 rounded-2xl border border-border bg-card p-4 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5 sm:p-6 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span className="rpt-glow absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]" />
      </span>
      {children}
    </section>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted sm:h-64">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icons.chart}
      </span>
      {message}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="max-w-[16rem] rounded-xl border border-border bg-card p-3 shadow-xl">
      {label && (
        <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      )}

      {payload.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="flex items-center gap-2 text-sm"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted">{item.name}:</span>
          <span className="font-medium text-foreground">
            {formatCurrency(Number(item.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
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
          className={`rpt-ring transition-[stroke-dashoffset,color] duration-1000 ${colorClass}`}
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

function StatTile({
  title,
  value,
  format,
  description,
  icon,
  accent,
  glow,
  index = 0,
  valueClass = "text-foreground",
}: {
  title: string;
  value: number;
  format: (value: number) => string;
  description: string;
  icon: ReactNode;
  accent: string;
  glow: string;
  index?: number;
  valueClass?: string;
}) {
  const animated = useCountUp(value, 1100);

  return (
    <div
      className="rpt-stat group/stat relative min-w-0 overflow-hidden rounded-2xl border border-border bg-background/50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none"
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      <span
        aria-hidden="true"
        className={`rpt-float pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover/stat:opacity-25 ${glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p
            className={`mt-2 break-words text-lg font-bold tabular-nums transition-transform duration-300 group-hover/stat:translate-x-0.5 sm:text-xl ${valueClass}`}
          >
            {format(animated)}
          </p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover/stat:rotate-6 group-hover/stat:scale-110 motion-reduce:transform-none ${accent}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  delay: number;
}) {
  return (
    <div
      onMouseMove={handleSpotlightMove}
      className="rpt-reveal group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 motion-reduce:transform-none sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className="rpt-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className="rpt-float pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
      />

      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transform-none">
        {icon}
      </span>

      <div className="relative min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-1 truncate text-base font-bold text-foreground sm:text-lg">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

function ReportsHero({
  summary,
  periodLabel,
}: {
  summary: ReportSummary;
  periodLabel: string;
}) {
  const income = summary.total_income;
  const expense = summary.total_expense;
  const net = summary.net_cash_flow;

  const total = income + expense;
  const incomeShare = total > 0 ? (income / total) * 100 : 0;
  const expenseShare = total > 0 ? 100 - incomeShare : 0;

  const rate = income > 0 ? (net / income) * 100 : null;
  const positive = net >= 0;

  const animatedNet = useCountUp(net, 1200);
  const animatedRate = useCountUp(rate === null ? 0 : Math.abs(rate), 1200);

  return (
    <section
      onMouseMove={handleSpotlightMove}
      className="rpt-reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
      style={{ animationDelay: "120ms" }}
    >
      <span
        aria-hidden="true"
        className="rpt-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
      />
      <span
        aria-hidden="true"
        className="rpt-float pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className={`rpt-float pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl ${positive ? "bg-success" : "bg-danger"
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

      <div className="relative grid items-center gap-6 sm:gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <Ring
          percent={rate === null ? 0 : Math.abs(rate)}
          colorClass={positive ? "text-success" : "text-danger"}
          className="mx-auto h-44 w-44 sm:h-52 sm:w-52"
        >
          <span className="text-xs font-medium text-muted">
            {positive ? "Savings rate" : "Overspending"}
          </span>
          <span
            className={`text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${positive ? "text-success" : "text-danger"
              }`}
          >
            {rate === null ? "–" : `${Math.round(animatedRate)}%`}
          </span>
          <span className="mt-0.5 text-xs text-muted">of income</span>
        </Ring>

        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Net cash flow</p>
          <p
            className={`mt-1 break-words text-3xl font-bold tabular-nums tracking-tight sm:text-5xl ${positive ? "text-foreground" : "text-danger"
              }`}
          >
            {net > 0 ? "+" : net < 0 ? "−" : ""}
            {formatCurrency(Math.abs(animatedNet))}
          </p>
          <p className="mt-1 text-sm text-muted">{periodLabel}</p>

          <div
            className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-secondary"
            role="img"
            aria-label={`Income ${formatPercent(incomeShare)}, expenses ${formatPercent(expenseShare)}`}
          >
            {total > 0 && (
              <>
                {income > 0 && (
                  <div
                    className="rpt-grow h-full rounded-full bg-success"
                    style={{ width: `${incomeShare}%` }}
                  />
                )}
                {expense > 0 && (
                  <div
                    className="rpt-grow h-full rounded-full bg-danger"
                    style={{ width: `${expenseShare}%` }}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              index={0}
              title="Total income"
              value={income}
              format={formatCurrency}
              description={`${formatPercent(incomeShare)} of money moved`}
              icon={icons.income}
              accent="bg-success/10 text-success"
              glow="bg-success"
              valueClass="text-success"
            />
            <StatTile
              index={1}
              title="Total expense"
              value={expense}
              format={formatCurrency}
              description={`${formatPercent(expenseShare)} of money moved`}
              icon={icons.expense}
              accent="bg-danger/10 text-danger"
              glow="bg-danger"
              valueClass="text-danger"
            />
            <StatTile
              index={2}
              title="Transactions"
              value={summary.transaction_count}
              format={(value) => Math.round(value).toLocaleString("id-ID")}
              description="Recorded in this period"
              icon={icons.count}
              accent="bg-primary/10 text-primary"
              glow="bg-primary"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function IncomeExpenseCard({
  report,
  colors,
  delay,
}: {
  report: IncomeExpenseReport;
  colors: ThemeColors;
  delay: number;
}) {
  const hasData = report.income > 0 || report.expense > 0;
  const ratio = report.income > 0 ? (report.expense / report.income) * 100 : null;
  const compact = useMediaQuery("(max-width: 639px)");

  const ratioColor =
    ratio === null
      ? "bg-secondary"
      : ratio >= 100
        ? "bg-danger"
        : ratio >= 70
          ? "bg-amber-500"
          : "bg-success";

  return (
    <Card delay={delay}>
      <CardHeader
        title="Income vs Expense"
        subtitle="Compare money coming in and going out."
      />

      {hasData ? (
        <>
          <div className="h-56 sm:h-64 xl:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Selected period",
                    Income: report.income,
                    Expense: report.expense,
                  },
                ]}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={colors.border}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: colors.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={compact ? 44 : 60}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: colors.primary, fillOpacity: 0.08 }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="Income"
                  name="Income"
                  fill={colors.success}
                  maxBarSize={compact ? 48 : 72}
                  radius={[8, 8, 0, 0]}
                  animationDuration={900}
                />
                <Bar
                  dataKey="Expense"
                  name="Expense"
                  fill={colors.danger}
                  maxBarSize={compact ? 48 : 72}
                  radius={[8, 8, 0, 0]}
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {ratio !== null && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  Expenses use this much of your income
                </span>
                <span className="font-semibold text-foreground">
                  {formatPercent(ratio)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`rpt-grow h-full rounded-full ${ratioColor}`}
                  style={{ width: `${Math.min(ratio, 100)}%` }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyChart message="No income or expense data for this period." />
      )}
    </Card>
  );
}

type SeriesKey = "income" | "expense";

function TrendCard({
  months,
  colors,
  delay,
}: {
  months: MonthlyTrend[];
  colors: ThemeColors;
  delay: number;
}) {
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({
    income: false,
    expense: false,
  });

  const chartData = useMemo(
    () =>
      months.map((item) => ({
        ...item,
        month_label: formatMonth(item.month),
      })),
    [months],
  );

  const compact = useMediaQuery("(max-width: 639px)");

  const toggles: { key: SeriesKey; label: string; color: string }[] = [
    { key: "income", label: "Income", color: colors.success },
    { key: "expense", label: "Expense", color: colors.danger },
  ];

  return (
    <Card delay={delay}>
      <CardHeader
        title="Monthly Cash Flow"
        subtitle="Tap a series to show or hide it."
        action={
          <div className="flex gap-2">
            {toggles.map((toggle) => {
              const visible = !hidden[toggle.key];

              return (
                <button
                  key={toggle.key}
                  type="button"
                  aria-pressed={visible}
                  onClick={() =>
                    setHidden((current) => ({
                      ...current,
                      [toggle.key]: !current[toggle.key],
                    }))
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 active:scale-95 ${visible
                      ? "border-border text-foreground"
                      : "border-border text-muted opacity-60"
                    }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full transition-opacity"
                    style={{
                      backgroundColor: toggle.color,
                      opacity: visible ? 1 : 0.3,
                    }}
                  />
                  {toggle.label}
                </button>
              );
            })}
          </div>
        }
      />

      {chartData.length > 0 ? (
        <div className="h-64 sm:h-72 xl:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="rpt-income-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.success} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rpt-expense-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.danger} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.danger} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={colors.border}
              />
              <XAxis
                dataKey="month_label"
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={compact ? 24 : 12}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={compact ? 44 : 60}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: colors.primary,
                  strokeDasharray: "4 4",
                  strokeOpacity: 0.6,
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                hide={hidden.income}
                stroke={colors.success}
                strokeWidth={3}
                fill="url(#rpt-income-fill)"
                dot={compact ? false : { r: 3 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Expense"
                hide={hidden.expense}
                stroke={colors.danger}
                strokeWidth={3}
                fill="url(#rpt-expense-fill)"
                dot={compact ? false : { r: 3 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No monthly trend data for this period." />
      )}
    </Card>
  );
}

function BreakdownCard({
  categories,
  palette,
  delay,
}: {
  categories: ExpenseCategory[];
  palette: string[];
  delay: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width: 639px)");

  const total = useMemo(
    () => categories.reduce((sum, item) => sum + item.amount, 0),
    [categories],
  );

  const focused = active !== null ? (categories[active] ?? null) : null;

  return (
    <Card delay={delay}>
      <CardHeader
        title="Expense Breakdown"
        subtitle="Hover a slice or a row to focus on one category."
      />

      {categories.length > 0 ? (
        <>
          <div className="relative h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 54 : 68}
                  outerRadius={compact ? 84 : 104}
                  paddingAngle={3}
                  stroke="none"
                  animationDuration={900}
                  onMouseEnter={(_, index) => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  {categories.map((category, index) => (
                    <Cell
                      key={category.category_id}
                      fill={palette[index % palette.length]}
                      opacity={active === null || active === index ? 1 : 0.3}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-28">
              <span className="max-w-full truncate text-xs text-muted">
                {focused ? focused.category_name : "Total spent"}
              </span>
              <span className="mt-1 text-base font-bold tabular-nums text-foreground sm:text-lg">
                Rp {formatCompactCurrency(focused ? focused.amount : total)}
              </span>
              {focused && total > 0 && (
                <span className="text-xs font-medium text-primary">
                  {formatPercent((focused.amount / total) * 100)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {categories.map((category, index) => {
              const percentage = total > 0 ? (category.amount / total) * 100 : 0;
              const color = palette[index % palette.length];
              const dimmed = active !== null && active !== index;

              return (
                <div
                  key={category.category_id}
                  tabIndex={0}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className={`rounded-xl px-3 py-2 outline-none transition duration-200 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary ${dimmed ? "opacity-50" : "opacity-100"
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate text-muted">
                        {category.category_name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums text-foreground">
                        {formatCurrency(category.amount)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatPercent(percentage)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="rpt-grow h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyChart message="No expense categories found for this period." />
      )}
    </Card>
  );
}

function BudgetRow({ budget }: { budget: BudgetPerformance }) {
  const percentage = Math.max(0, budget.percentage_used);
  const progressWidth = Math.min(percentage, 100);
  const exceeded = percentage > 100;
  const nearLimit = !exceeded && percentage >= 80;

  const barClass = exceeded
    ? "bg-danger"
    : nearLimit
      ? "bg-amber-500"
      : "bg-primary";

  const badge = exceeded
    ? { label: "Over budget", className: "bg-danger/10 text-danger" }
    : nearLimit
      ? { label: "Near limit", className: "bg-amber-500/10 text-amber-500" }
      : { label: "On track", className: "bg-success/10 text-success" };

  return (
    <div className="space-y-3 rounded-xl p-3 transition duration-200 hover:bg-secondary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold text-foreground">
              {budget.category_name}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatCurrency(budget.spent_amount)} of{" "}
            {formatCurrency(budget.budget_amount)}
          </p>
        </div>

        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${exceeded ? "text-danger" : "text-foreground"
            }`}
        >
          {formatPercent(percentage)}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`rpt-grow h-full rounded-full ${barClass}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <p
        className={`text-xs ${exceeded ? "font-medium text-danger" : "text-muted"}`}
      >
        {exceeded
          ? `Over budget by ${formatCurrency(
            budget.spent_amount - budget.budget_amount,
          )}`
          : `${formatCurrency(budget.remaining_amount)} remaining`}
      </p>
    </div>
  );
}

function BudgetCard({
  budgets,
  delay,
}: {
  budgets: BudgetPerformance[];
  delay: number;
}) {
  return (
    <Card delay={delay}>
      <CardHeader
        title="Budget Performance"
        subtitle="Monitor spending against your category budgets."
      />

      {budgets.length > 0 ? (
        <div className="-mx-3 space-y-2">
          {budgets.map((budget) => (
            <BudgetRow key={budget.budget_id} budget={budget} />
          ))}
        </div>
      ) : (
        <EmptyChart message="No budgets overlap with the selected period." />
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const colors = useThemeColors();

  const [presets] = useState(buildPresets);
  const defaultPreset =
    presets.find((preset) => preset.id === "year") ?? presets[0];

  const [startDate, setStartDate] = useState(defaultPreset.start);
  const [endDate, setEndDate] = useState(defaultPreset.end);
  const [appliedRange, setAppliedRange] = useState({
    start: defaultPreset.start,
    end: defaultPreset.end,
  });
  const [activePreset, setActivePreset] = useState<string | null>(
    defaultPreset.id,
  );

  const [data, setData] = useState<ReportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // State is only updated inside promise callbacks, never synchronously
  // in the effect body, so it stays safe for the react-hooks lint rules.
  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<ReportBundle> = token
      ? fetchReports(token, appliedRange.start, appliedRange.end)
      : Promise.reject(new Error(SESSION_ERROR));

    request
      .then((bundle) => {
        if (cancelled) return;
        setData(bundle);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load reports. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appliedRange, refreshKey]);

  const applyRange = (start: string, end: string, presetId: string | null) => {
    setStartDate(start);
    setEndDate(end);
    setActivePreset(presetId);
    setError("");
    setLoading(true);
    setAppliedRange({ start, end });
  };

  const handleApplyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    applyRange(startDate, endDate, null);
  };

  const handleResetFilter = () => {
    applyRange(defaultPreset.start, defaultPreset.end, defaultPreset.id);
  };

  const handleRefresh = () => {
    setError("");
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const periodDays = diffDays(appliedRange.start, appliedRange.end) + 1;

  const palette = useMemo(
    () => [
      colors.primary,
      "#0ea5e9",
      "#f59e0b",
      colors.success,
      "#ec4899",
      "#14b8a6",
      "#f97316",
    ],
    [colors.primary, colors.success],
  );

  const insights = useMemo(() => {
    if (!data) return null;

    const totalExpense = data.categories.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const top = [...data.categories].sort((a, b) => b.amount - a.amount)[0];
    const best = [...data.monthlyTrend].sort(
      (a, b) => b.income - b.expense - (a.income - a.expense),
    )[0];

    return {
      top: top
        ? {
          name: top.category_name,
          amount: top.amount,
          share: totalExpense > 0 ? (top.amount / totalExpense) * 100 : 0,
        }
        : null,
      best: best
        ? { label: formatMonth(best.month), net: best.income - best.expense }
        : null,
      avgDaily: periodDays > 0 ? data.summary.total_expense / periodDays : 0,
    };
  }, [data, periodDays]);

  const periodLabel = `${formatDate(appliedRange.start)} — ${formatDate(appliedRange.end)} · ${periodDays} day${periodDays === 1 ? "" : "s"}`;

  return (
    <AppShell>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6 2xl:max-w-[96rem]">
        <style>{`
          @keyframes rpt-reveal {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes rpt-grow {
            from { width: 0; }
          }
          @keyframes rpt-ring {
            from { stroke-dashoffset: var(--ring-from); }
          }
          @keyframes rpt-indeterminate {
            from { transform: translateX(-100%); }
            to   { transform: translateX(350%); }
          }
          @keyframes rpt-float {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
            50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
          }
          @keyframes rpt-stat-in {
            from { opacity: 0; transform: translateY(14px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes rpt-sweep {
            from { transform: translateX(-120%) skewX(-18deg); }
            to   { transform: translateX(260%) skewX(-18deg); }
          }
          .rpt-reveal { animation: rpt-reveal 550ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
          .rpt-grow   { animation: rpt-grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
          .rpt-ring   { animation: rpt-ring 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
          .rpt-indeterminate { animation: rpt-indeterminate 1.2s ease-in-out infinite; }
          .rpt-float  { animation: rpt-float 14s ease-in-out infinite; }

          .rpt-glow {
            background: radial-gradient(420px circle at var(--mx, 30%) var(--my, 20%), currentColor, transparent 70%);
          }

          .rpt-stat { animation: rpt-stat-in 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
          .rpt-stat::after {
            content: "";
            position: absolute;
            inset: 0;
            width: 40%;
            background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 10%, transparent), transparent);
            transform: translateX(-120%) skewX(-18deg);
            pointer-events: none;
          }
          .rpt-stat:hover::after { animation: rpt-sweep 900ms ease-out; }

          @media (prefers-reduced-motion: reduce) {
            .rpt-reveal, .rpt-grow, .rpt-ring, .rpt-indeterminate, .rpt-float, .rpt-stat { animation: none; }
            .rpt-stat:hover::after { animation: none; }
          }
        `}</style>

        <div className="rpt-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Financial insights
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Reports &amp; Analytics
            </h1>
            <p className="mt-2 text-sm text-muted">
              Understand your cash flow, spending habits, and budget
              performance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition duration-200 hover:bg-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
          >
            <span className={loading ? "animate-spin" : ""}>
              {icons.refresh}
            </span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <Card delay={60}>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {presets.map((preset) => {
              const selected = activePreset === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyRange(preset.start, preset.end, preset.id)}
                  aria-pressed={selected}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition duration-200 active:scale-95 ${selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                    }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={handleApplyFilter}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
          >
            <label className="space-y-2 text-sm font-medium text-foreground">
              Start date
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                suppressHydrationWarning
                className={inputClass}
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              End date
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                suppressHydrationWarning
                className={inputClass}
              />
            </label>

            <div className="flex gap-3 sm:col-span-2 lg:col-span-1 lg:self-end">
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition duration-200 hover:opacity-90 hover:shadow-lg active:scale-95 disabled:opacity-60 lg:flex-none"
              >
                Apply range
              </button>

              <button
                type="button"
                onClick={handleResetFilter}
                className="min-h-11 flex-1 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition duration-200 hover:bg-secondary active:scale-95 lg:flex-none"
              >
                Reset
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-muted" suppressHydrationWarning>
            Reporting period: {formatDate(appliedRange.start)} —{" "}
            {formatDate(appliedRange.end)}
          </p>
        </Card>

        {error && (
          <div
            role="alert"
            className="rpt-reveal flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
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

        {loading && !data ? (
          <div className="space-y-4 sm:space-y-6" aria-busy="true">
            <div className="h-80 animate-pulse rounded-3xl border border-border bg-card md:h-72" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl border border-border bg-card sm:h-80"
                />
              ))}
            </div>
          </div>
        ) : data && insights ? (
          <div className="space-y-4 sm:space-y-6">
            <div
              className={`h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-300 ${loading ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden="true"
            >
              <div className="rpt-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <div
              className={`space-y-4 transition-opacity duration-300 sm:space-y-6 ${loading ? "pointer-events-none opacity-60" : "opacity-100"
                }`}
            >
              <ReportsHero summary={data.summary} periodLabel={periodLabel} />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InsightCard
                  icon={icons.tag}
                  label="Top spending category"
                  value={insights.top ? insights.top.name : "No spending yet"}
                  sub={
                    insights.top
                      ? `${formatCurrency(insights.top.amount)} · ${formatPercent(insights.top.share)} of expenses`
                      : "Add expenses to see insights"
                  }
                  delay={180}
                />
                <InsightCard
                  icon={icons.sun}
                  label="Average daily spend"
                  value={formatCurrency(insights.avgDaily)}
                  sub={`Across ${periodDays} day${periodDays === 1 ? "" : "s"}`}
                  delay={240}
                />
                <InsightCard
                  icon={icons.star}
                  label="Best month"
                  value={insights.best ? insights.best.label : "No data yet"}
                  sub={
                    insights.best
                      ? `${insights.best.net >= 0 ? "Net +" : "Net −"}${formatCurrency(Math.abs(insights.best.net))}`
                      : "Needs at least one month of data"
                  }
                  delay={300}
                />
              </div>

              <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
                <IncomeExpenseCard
                  report={data.incomeExpense}
                  colors={colors}
                  delay={360}
                />
                <TrendCard
                  months={data.monthlyTrend}
                  colors={colors}
                  delay={420}
                />
              </div>

              <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
                <BreakdownCard
                  categories={data.categories}
                  palette={palette}
                  delay={480}
                />
                <BudgetCard budgets={data.budgets} delay={540} />
              </div>
            </div>
          </div>
        ) : (
          !error && (
            <Card>
              <p className="text-sm text-muted">
                No report data is available yet.
              </p>
            </Card>
          )
        )}
      </div>
    </AppShell>
  );
}