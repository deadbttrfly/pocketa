"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import AppShell from "@/components/layout/AppShell";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
  type CategoryType,
} from "@/lib/categories";
import { getToken } from "@/lib/auth-storage";

const AUTH_ERROR = "You are not authenticated.";
const TOAST_DURATION = 3200;

type FilterType = "all" | CategoryType;

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

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

function useCountUp(target: number, duration = 900) {
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

function CountUp({ value }: { value: number }) {
  const animated = useCountUp(value);

  return <>{Math.round(animated)}</>;
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

function typeIcon(type: CategoryType, size = 20) {
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
  dots: (
    <SvgIcon>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
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
  tag: (
    <SvgIcon size={26}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </SvgIcon>
  ),
};

const typeMeta: Record<
  CategoryType,
  {
    label: string;
    plural: string;
    description: string;
    tile: string;
    badge: string;
    card: string;
    accent: string;
    bar: string;
    selected: string;
  }
> = {
  income: {
    label: "Income",
    plural: "Income",
    description: "Categories used to track money coming in.",
    tile: "bg-success/10 text-success",
    badge: "bg-success/10 text-success",
    card: "border-success/20 hover:border-success/40",
    accent: "text-success",
    bar: "bg-success",
    selected: "border-success bg-success/10 text-success",
  },
  expense: {
    label: "Expense",
    plural: "Expenses",
    description: "Categories used to track money going out.",
    tile: "bg-danger/10 text-danger",
    badge: "bg-danger/10 text-danger",
    card: "border-danger/20 hover:border-danger/40",
    accent: "text-danger",
    bar: "bg-danger",
    selected: "border-danger bg-danger/10 text-danger",
  },
};

const inputClass =
  "block w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-base outline-none transition duration-300 placeholder:text-muted/70 hover:border-primary/40 focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary,currentColor)_14%,transparent)] focus:ring-2 focus:ring-primary/20 sm:text-sm";

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
            className="cat-mark rounded bg-primary/20 px-0.5 text-foreground"
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

function TypePicker({
  value,
  onChange,
  label,
}: {
  value: CategoryType;
  onChange: (type: CategoryType) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>

      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-2"
      >
        {(["income", "expense"] as CategoryType[]).map((type) => {
          const selected = value === type;

          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(type)}
              className={`group/pick relative flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                ? `${typeMeta[type].selected} shadow-sm`
                : "border-border text-muted hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground"
                }`}
            >
              <span
                className={`transition-transform duration-300 ${selected ? "scale-110 rotate-6" : "group-hover/pick:scale-110"
                  }`}
              >
                {typeIcon(type, 18)}
              </span>
              {typeMeta[type].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterControl({
  value,
  counts,
  onChange,
}: {
  value: FilterType;
  counts: Record<FilterType, number>;
  onChange: (value: FilterType) => void;
}) {
  const index = FILTERS.findIndex((item) => item.value === value);

  const pillColor =
    value === "income"
      ? "bg-success"
      : value === "expense"
        ? "bg-danger"
        : "bg-primary";

  const pillText = value === "all" ? "text-primary-foreground" : "text-white";

  return (
    <div
      role="group"
      aria-label="Filter by type"
      className="relative grid grid-cols-3 rounded-xl border border-border bg-background p-1 md:w-80"
    >
      <span
        aria-hidden="true"
        className={`cat-shine pointer-events-none absolute bottom-1 left-1 top-1 overflow-hidden rounded-lg shadow-md transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none ${pillColor}`}
        style={{
          width: "calc((100% - 0.5rem) / 3)",
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {FILTERS.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={selected}
            className={`relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected ? pillText : "text-muted hover:text-foreground"
              }`}
          >
            {item.label}
            <span
              className={`text-xs tabular-nums transition-opacity ${selected ? "opacity-80" : "opacity-60"}`}
            >
              {counts[item.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Donut({
  income,
  expense,
  filter,
}: {
  income: number;
  expense: number;
  filter: FilterType;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = income + expense;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = income > 0 && expense > 0 ? 8 : 0;
  const incomeLen = total ? (income / total) * circumference : 0;
  const expenseLen = total ? (expense / total) * circumference : 0;

  const transition =
    "stroke-dasharray 1.3s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease";

  return (
    <div className="relative mx-auto h-40 w-40 shrink-0 sm:mx-0 sm:h-44 sm:w-44">
      <span
        aria-hidden="true"
        className="cat-breathe pointer-events-none absolute inset-3 rounded-full bg-primary opacity-10 blur-2xl"
      />

      <svg
        viewBox="0 0 140 140"
        className="relative h-full w-full -rotate-90"
        role="img"
        aria-label={`${income} income and ${expense} expense categories`}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-secondary"
        />

        {income > 0 && (
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className="stroke-success"
            strokeDasharray={`${ready ? Math.max(incomeLen - gap, 0.01) : 0} ${circumference}`}
            strokeDashoffset={0}
            style={{ transition, opacity: filter === "expense" ? 0.2 : 1 }}
          />
        )}

        {expense > 0 && (
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className="stroke-danger"
            strokeDasharray={`${ready ? Math.max(expenseLen - gap, 0.01) : 0} ${circumference}`}
            strokeDashoffset={-incomeLen}
            style={{ transition, opacity: filter === "income" ? 0.2 : 1 }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
          <CountUp value={total} />
        </p>
        <p className="mt-0.5 text-xs font-medium text-muted">categories</p>
      </div>
    </div>
  );
}

function StatTile({
  type,
  count,
  total,
  dimmed,
}: {
  type: CategoryType;
  count: number;
  total: number;
  dimmed: boolean;
}) {
  const meta = typeMeta[type];
  const share = total > 0 ? (count / total) * 100 : 0;

  return (
    <div
      className={`group/stat relative overflow-hidden rounded-2xl border bg-background/60 p-4 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${meta.card} ${dimmed ? "opacity-50" : "opacity-100"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition duration-300 group-hover/stat:rotate-6 group-hover/stat:scale-110 ${meta.tile}`}
          >
            {typeIcon(type, 18)}
          </span>
          <p className={`text-sm font-semibold ${meta.accent}`}>
            {meta.label}
          </p>
        </div>

        <p className={`text-xs font-semibold tabular-nums ${meta.accent}`}>
          <CountUp value={share} />%
        </p>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground">
        <CountUp value={count} />
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`cat-grow h-full rounded-full ${meta.bar}`}
          style={{
            width: `${share}%`,
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  index: number;
  query: string;
  isEditing: boolean;
  editName: string;
  editType: CategoryType;
  submitting: boolean;
  menuOpen: boolean;
  onEditName: (value: string) => void;
  onEditType: (type: CategoryType) => void;
  onToggleMenu: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onRequestDelete: () => void;
}

function CategoryCard({
  category,
  index,
  query,
  isEditing,
  editName,
  editType,
  submitting,
  menuOpen,
  onEditName,
  onEditType,
  onToggleMenu,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onRequestDelete,
}: CategoryCardProps) {
  const meta = typeMeta[category.type];
  const cardRef = useRef<HTMLDivElement>(null);

  // Cursor-follow spotlight + subtle 3D tilt (mouse only).
  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (isEditing || event.pointerType !== "mouse") return;

    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--ry", `${(x / rect.width - 0.5) * 7}deg`);
    el.style.setProperty("--rx", `${-(y / rect.height - 0.5) * 7}deg`);
  }

  function handlePointerLeave() {
    const el = cardRef.current;
    if (!el) return;

    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`cat-reveal cat-tilt group relative min-w-0 rounded-2xl border bg-card p-5 ${isEditing ? "border-primary/40 shadow-xl" : `${meta.card}`
        } ${menuOpen ? "z-20" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {isEditing ? (
        <form onSubmit={onSubmitEdit} className="cat-pop space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-primary">
              Editing category
            </p>
            <h3 className="mt-1 truncate text-lg font-bold text-foreground">
              {category.name}
            </h3>
          </div>

          <div>
            <label
              htmlFor={`edit-name-${category.id}`}
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Category name
            </label>
            <input
              id={`edit-name-${category.id}`}
              type="text"
              value={editName}
              onChange={(event) => onEditName(event.target.value)}
              className={inputClass}
            />
          </div>

          <TypePicker
            label="Category type"
            value={editType}
            onChange={onEditType}
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="cat-shine relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={onCancelEdit}
              disabled={submitting}
              className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl ${meta.accent}`}
          >
            <span className="cat-spot absolute inset-0" />
            <span className="cat-border absolute inset-0" />
            <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
            <span className="absolute -bottom-6 -right-4 opacity-[0.05] transition duration-700 group-hover:-rotate-12 group-hover:scale-110 group-hover:opacity-[0.1] motion-reduce:transform-none">
              {typeIcon(category.type, 104)}
            </span>
          </div>

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none ${meta.tile}`}
              >
                <span
                  aria-hidden="true"
                  className="cat-ring absolute inset-0 rounded-2xl border border-current opacity-0 group-hover:opacity-100"
                />
                {typeIcon(category.type, 22)}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground">
                  <Highlight text={category.name} query={query} />
                </h3>
                <p className="mt-0.5 text-xs text-muted">{meta.label}</p>
              </div>
            </div>

            <div className="relative" data-category-menu={category.id}>
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label={`Actions for ${category.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`flex h-10 w-10 items-center justify-center rounded-xl outline-none transition duration-300 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90 ${menuOpen
                  ? "rotate-90 bg-secondary text-foreground"
                  : "text-muted"
                  }`}
              >
                {icons.dots}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="cat-pop absolute right-0 z-30 mt-2 w-44 origin-top-right rounded-xl border border-border bg-card/95 p-1 shadow-2xl backdrop-blur-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onStartEdit}
                    className="group/item flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-secondary"
                  >
                    <span className="transition-transform duration-300 group-hover/item:-rotate-12 group-hover/item:scale-110">
                      {icons.edit}
                    </span>
                    Edit
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={onRequestDelete}
                    className="group/item flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-danger transition hover:bg-danger/10"
                  >
                    <span className="transition-transform duration-300 group-hover/item:rotate-12 group-hover/item:scale-110">
                      {icons.trash}
                    </span>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
            >
              {meta.label}
            </span>

            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted opacity-0 outline-none transition duration-300 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              {icons.edit}
              Quick edit
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DeleteDialog({
  category,
  deleting,
  onCancel,
  onConfirm,
}: {
  category: Category;
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
        className="cat-fade absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        className="cat-pop relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-danger opacity-10 blur-3xl"
        />

        <div className="relative flex h-14 w-14 items-center justify-center">
          <span
            aria-hidden="true"
            className="cat-pulse-ring absolute inset-0 rounded-full bg-danger/20"
          />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            {icons.trash}
          </span>
        </div>

        <h3
          id="delete-category-title"
          className="relative mt-4 text-lg font-semibold text-foreground"
        >
          Delete {category.name}?
        </h3>

        <p className="relative mt-2 text-sm leading-6 text-muted">
          This category will be removed from your category list.
        </p>

        <div className="relative mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            Keep category
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="cat-shine relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:shadow-lg active:scale-95 disabled:opacity-60"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? "Deleting..." : "Delete category"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryType>("expense");

  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    const request: Promise<Category[]> = token
      ? getCategories(token).then((response) => response.data)
      : Promise.reject(new Error(AUTH_ERROR));

    request
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load categories."));
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
    if (showAddForm) nameInputRef.current?.focus();
  }, [showAddForm]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (!searchInputRef.current) return;

      event.preventDefault();
      searchInputRef.current.focus();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (menuId === null && !deleteTarget) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuId === null) return;

      const target = event.target as Element | null;

      if (!target?.closest(`[data-category-menu="${menuId}"]`)) {
        setMenuId(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (deleteTarget) {
        if (deletingId === null) setDeleteTarget(null);
      } else {
        setMenuId(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuId, deleteTarget, deletingId]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);

    setToast(message);
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      TOAST_DURATION,
    );
  }

  function reload() {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }

  const counts = useMemo(() => {
    const income = categories.filter((item) => item.type === "income").length;
    const expense = categories.filter((item) => item.type === "expense").length;

    return {
      all: categories.length,
      income,
      expense,
    } satisfies Record<FilterType, number>;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || category.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [categories, search, filter]);

  const filteredIncome = filteredCategories.filter(
    (category) => category.type === "income",
  );
  const filteredExpense = filteredCategories.filter(
    (category) => category.type === "expense",
  );

  function resetAddForm() {
    setName("");
    setType("expense");
  }

  function toggleAddForm() {
    setError("");

    if (showAddForm) {
      setShowAddForm(false);
      resetAddForm();
      return;
    }

    setType(filter === "income" ? "income" : "expense");
    setShowAddForm(true);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setMenuId(null);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditType("expense");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.type === type,
    );

    if (duplicate) {
      setError("Category with the same name and type already exists.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createCategory(token, { name: trimmedName, type });

      resetAddForm();
      setShowAddForm(false);
      notify(`${trimmedName} was added`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create category."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    categoryId: number,
  ) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.id !== categoryId &&
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.type === editType,
    );

    if (duplicate) {
      setError("Category with the same name and type already exists.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await updateCategory(token, categoryId, {
        name: trimmedName,
        type: editType,
      });

      cancelEdit();
      notify("Changes saved");
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update category."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    const token = getToken();

    if (!token) {
      setDeleteTarget(null);
      setError(AUTH_ERROR);
      return;
    }

    try {
      setDeletingId(category.id);
      setError("");

      await deleteCategory(token, category.id);

      if (editingId === category.id) {
        cancelEdit();
      }

      notify(`${category.name} was deleted`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete category."));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  function renderCard(category: Category, index: number) {
    return (
      <CategoryCard
        key={category.id}
        category={category}
        index={index}
        query={search}
        isEditing={editingId === category.id}
        editName={editName}
        editType={editType}
        submitting={submitting}
        menuOpen={menuId === category.id}
        onEditName={setEditName}
        onEditType={setEditType}
        onToggleMenu={() =>
          setMenuId((current) => (current === category.id ? null : category.id))
        }
        onStartEdit={() => startEdit(category)}
        onCancelEdit={cancelEdit}
        onSubmitEdit={(event) => handleUpdate(event, category.id)}
        onRequestDelete={() => {
          setMenuId(null);
          setDeleteTarget(category);
        }}
      />
    );
  }

  function renderSection(
    sectionType: CategoryType,
    items: Category[],
    delay: number,
  ) {
    if (items.length === 0) return null;

    const meta = typeMeta[sectionType];

    return (
      <section
        className="cat-reveal"
        style={{ animationDelay: `${delay}ms` }}
        aria-label={meta.plural}
      >
        <div className="mb-4 flex items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.tile}`}
              >
                {typeIcon(sectionType, 18)}
              </div>

              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {meta.plural}
              </h2>
            </div>

            <p className="mt-1.5 text-sm text-muted">{meta.description}</p>
          </div>

          <span
            aria-hidden="true"
            className={`hidden h-px flex-1 bg-gradient-to-r from-current to-transparent opacity-30 sm:block ${meta.accent}`}
          />

          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums sm:ml-0 ${meta.badge}`}
          >
            {items.length}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((category, index) => renderCard(category, index))}
        </div>
      </section>
    );
  }

  return (
    <AppShell>
      <style>{`
        @keyframes cat-reveal {
          from { opacity: 0; transform: translateY(22px) scale(0.98); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes cat-pop {
          from { opacity: 0; transform: scale(0.94) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cat-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cat-grow {
          from { width: 0; }
        }
        @keyframes cat-toast {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cat-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        @keyframes cat-indeterminate {
          from { transform: translateX(-100%); }
          to   { transform: translateX(350%); }
        }
        @keyframes cat-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.12); }
        }
        @keyframes cat-breathe {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50%      { transform: scale(1.15); opacity: 0.2; }
        }
        @keyframes cat-sheen {
          from { background-position: 0% 50%; }
          to   { background-position: 200% 50%; }
        }
        @keyframes cat-sweep {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(260%) skewX(-18deg); }
        }
        @keyframes cat-skeleton {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes cat-pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes cat-ring {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes cat-mark {
          from { background-size: 0% 100%; }
          to   { background-size: 100% 100%; }
        }

        .cat-reveal { animation: cat-reveal 650ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .cat-pop    { animation: cat-pop 260ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .cat-fade   { animation: cat-fade 220ms ease-out backwards; }
        .cat-grow   { animation: cat-grow 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .cat-toast  { animation: cat-toast 380ms cubic-bezier(0.34, 1.4, 0.64, 1) backwards; }
        .cat-indeterminate { animation: cat-indeterminate 1.2s ease-in-out infinite; }
        .cat-float   { animation: cat-float 14s ease-in-out infinite; }
        .cat-breathe { animation: cat-breathe 5s ease-in-out infinite; }
        .cat-pulse-ring { animation: cat-pulse-ring 1.8s ease-out infinite; }
        .cat-mark { animation: cat-mark 400ms ease-out backwards; }

        .cat-title {
          background-size: 200% 100%;
          animation: cat-sheen 7s linear infinite;
        }

        .cat-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-18deg);
          pointer-events: none;
        }
        .cat-shine:hover::after { animation: cat-sweep 900ms ease-out; }

        .cat-skeleton { position: relative; overflow: hidden; }
        .cat-skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 9%, transparent), transparent);
          animation: cat-skeleton 1.6s ease-in-out infinite;
        }

        .cat-glow {
          background: radial-gradient(420px circle at var(--mx, 30%) var(--my, 20%), currentColor, transparent 70%);
        }

        .cat-tilt {
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform 220ms ease-out, box-shadow 400ms ease, border-color 400ms ease;
          will-change: transform;
        }
        .cat-tilt:hover {
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-5px);
          box-shadow: 0 24px 48px -20px color-mix(in srgb, currentColor 35%, transparent);
        }
        .cat-spot {
          opacity: 0;
          transition: opacity 400ms ease;
          background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, currentColor 16%, transparent), transparent 70%);
        }
        .group:hover .cat-spot { opacity: 1; }
        .cat-border {
          border-radius: inherit;
          padding: 1px;
          opacity: 0;
          transition: opacity 400ms ease;
          background: radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), currentColor, transparent 70%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
        }
        .group:hover .cat-border { opacity: 0.9; }
        .group:hover .cat-ring { animation: cat-ring 1.4s ease-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .cat-reveal, .cat-pop, .cat-fade, .cat-grow, .cat-toast, .cat-indeterminate,
          .cat-float, .cat-breathe, .cat-title, .cat-pulse-ring, .cat-mark,
          .cat-skeleton::after, .cat-shine:hover::after, .group:hover .cat-ring { animation: none; }
          .cat-tilt, .cat-tilt:hover { transform: none; }
        }
      `}</style>

      <div className="mx-auto min-w-0 max-w-6xl space-y-4">
        <div className="cat-reveal flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Organization</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Categories &amp; Labels
            </h1>
            <p className="mt-2 text-sm text-muted">
              Organize your transactions so your spending patterns are easier to understand.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleAddForm}
            aria-expanded={showAddForm}
            className="cat-shine relative inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 sm:w-auto"
          >
            <span
              className={`transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transform-none ${showAddForm ? "rotate-[135deg]" : ""
                }`}
            >
              {icons.plus}
            </span>
            {showAddForm ? "Cancel" : "Add category"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="cat-pop flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded-md p-0.5 transition hover:bg-danger/10 active:scale-90"
            >
              {icons.close}
            </button>
          </div>
        )}

        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="cat-pop relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-5 shadow-lg sm:p-7"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-primary opacity-10 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
            />

            <div className="relative mb-5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Add category
              </h2>
              <p className="mt-1 text-sm text-muted">
                Create a category for your financial transactions.
              </p>
            </div>

            <div className="relative grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="category-name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Category name
                </label>
                <input
                  ref={nameInputRef}
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Food & Drinks"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>

              <TypePicker
                label="Category type"
                value={type}
                onChange={setType}
              />
            </div>

            <div className="relative mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="cat-shine relative inline-flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? <Spinner /> : null}
                {submitting ? "Creating..." : "Create category"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-4 text-foreground sm:space-y-6" aria-busy="true">
            <div className="cat-skeleton h-52 rounded-3xl border border-border bg-card" />
            <div className="cat-skeleton h-20 rounded-2xl border border-border bg-card" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="cat-skeleton h-36 rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="cat-reveal relative overflow-hidden rounded-3xl border border-dashed border-border bg-card p-8 text-center sm:p-14">
            <span
              aria-hidden="true"
              className="cat-float pointer-events-none absolute left-1/2 top-4 h-48 w-48 -translate-x-1/2 rounded-full bg-primary opacity-10 blur-3xl"
            />

            <span className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <span
                aria-hidden="true"
                className="cat-pulse-ring absolute inset-0 rounded-2xl bg-primary/20"
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {icons.tag}
              </span>
            </span>

            <p className="relative mt-5 text-base font-semibold text-foreground">
              No categories yet
            </p>
            <p className="relative mx-auto mt-1 max-w-sm text-sm text-muted">
              Create your first category to start organizing your transactions.
            </p>
            {!showAddForm && (
              <button
                type="button"
                onClick={toggleAddForm}
                className="cat-shine relative mt-6 inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              >
                {icons.plus}
                Add your first category
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
              <div className="cat-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <section
              onMouseMove={handleSpotlightMove}
              style={{ animationDelay: "80ms" }}
              className="cat-reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-8"
            >
              <span
                aria-hidden="true"
                className="cat-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.1]"
              />
              <span
                aria-hidden="true"
                className="cat-float pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
              />
              <span
                aria-hidden="true"
                className={`cat-float pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl ${counts.income >= counts.expense ? "bg-success" : "bg-danger"
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

              <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
                <Donut
                  income={counts.income}
                  expense={counts.expense}
                  filter={filter}
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted">
                    Income vs expense categories
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <StatTile
                      type="income"
                      count={counts.income}
                      total={counts.all}
                      dimmed={filter === "expense"}
                    />
                    <StatTile
                      type="expense"
                      count={counts.expense}
                      total={counts.all}
                      dimmed={filter === "income"}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div
              className="cat-reveal rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur"
              style={{ animationDelay: "140ms" }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="group/search relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-primary">
                    {icons.search}
                  </span>

                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search categories..."
                    aria-label="Search categories"
                    className={`${inputClass} pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none`}
                  />

                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="cat-fade absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:rotate-90 hover:bg-secondary hover:text-foreground active:scale-90"
                    >
                      {icons.close}
                    </button>
                  ) : (
                    <kbd
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-secondary text-xs font-semibold text-muted transition-opacity group-focus-within/search:opacity-0 sm:flex"
                    >
                      /
                    </kbd>
                  )}
                </div>

                <FilterControl
                  value={filter}
                  counts={counts}
                  onChange={setFilter}
                />
              </div>

              {(search.trim() || filter !== "all") && (
                <p
                  className="cat-fade mt-3 text-xs text-muted"
                  aria-live="polite"
                >
                  Showing {filteredCategories.length} of {categories.length}{" "}
                  categories
                </p>
              )}
            </div>

            <div
              className={`transition-[opacity,filter] duration-300 ${refreshing ? "opacity-70 blur-[0.5px]" : "opacity-100"
                }`}
            >
              {filteredCategories.length === 0 ? (
                <div className="cat-reveal rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icons.search}
                  </span>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    No categories found
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Try another search or create a new category.
                  </p>
                  {(search || filter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                      className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-secondary active:scale-95"
                    >
                      Clear search and filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  {renderSection("income", filteredIncome, 200)}
                  {renderSection("expense", filteredExpense, 280)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          category={deleteTarget}
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
            className="cat-toast pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
                {icons.check}
              </span>
              {toast}
            </div>

            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-success"
              style={{
                animation: `cat-shrink ${TOAST_DURATION}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}