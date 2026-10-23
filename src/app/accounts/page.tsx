
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
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
  type Account,
  type AccountType,
} from "@/lib/accounts";
import { getToken } from "@/lib/auth-storage";

const AUTH_ERROR = "You are not authenticated.";
const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "ewallet", "other"];

function toNumber(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number | string) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const MASK = "Rp ••••••";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const from = fromRef.current;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduce
        ? 1
        : Math.min((now - startedAt) / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 4);
      const next = from + (target - from) * eased;

      fromRef.current = next;
      setValue(next);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function useSpotlight(tilt: boolean) {
  const onMove = (event: ReactMouseEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (
      tilt &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const rx = (0.5 - y / rect.height) * 7;
      const ry = (x / rect.width - 0.5) * 9;

      el.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    }
  };

  const onLeave = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = "";
  };

  return { onMove, onLeave };
}

function SvgIcon({
  children,
  size = 20,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function typeIcon(type: AccountType, size = 20) {
  switch (type) {
    case "cash":
      return (
        <SvgIcon size={size}>
          <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </SvgIcon>
      );

    case "bank":
      return (
        <SvgIcon size={size}>
          <path d="M3 10 12 4l9 6" />
          <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
          <path d="M3 20h18" />
        </SvgIcon>
      );

    case "ewallet":
      return (
        <SvgIcon size={size}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </SvgIcon>
      );

    default:
      return (
        <SvgIcon size={size}>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </SvgIcon>
      );
  }
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
  wallet: (
    <SvgIcon size={28}>
      <rect x="2.5" y="6" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
      <path d="M16 15h2" />
      <path d="M5 6l11-3v3" />
    </SvgIcon>
  ),
};

const typeMeta: Record<
  AccountType,
  { label: string; tile: string; bar: string; dot: string; glow: string }
> = {
  cash: {
    label: "Cash",
    tile: "bg-success/10 text-success ring-success/20",
    bar: "bg-success",
    dot: "bg-success",
    glow: "text-success",
  },
  bank: {
    label: "Bank",
    tile: "bg-primary/10 text-primary ring-primary/20",
    bar: "bg-primary",
    dot: "bg-primary",
    glow: "text-primary",
  },
  ewallet: {
    label: "E-Wallet",
    tile: "bg-primary/5 text-foreground ring-border",
    bar: "bg-primary/55",
    dot: "bg-primary/55",
    glow: "text-primary",
  },
  other: {
    label: "Other",
    tile: "bg-secondary text-muted ring-border",
    bar: "bg-muted",
    dot: "bg-muted",
    glow: "text-muted",
  },
};

function TypePicker({
  value,
  onChange,
  label,
}: {
  value: AccountType;
  onChange: (type: AccountType) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>

      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {ACCOUNT_TYPES.map((type) => {
          const selected = value === type;

          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(type)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/10"
                : "border-border text-muted hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                }`}
            >
              {typeIcon(type, 18)}
              {typeMeta[type].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

const inputClass =
  "block w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-base outline-none transition duration-300 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-sm";

interface AccountCardProps {
  account: Account;
  index: number;
  share: number | null;
  hidden: boolean;
  isEditing: boolean;
  editName: string;
  editType: AccountType;
  submitting: boolean;
  menuOpen: boolean;
  onEditName: (value: string) => void;
  onEditType: (type: AccountType) => void;
  onToggleMenu: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onRequestDelete: () => void;
}

function AccountCard({
  account,
  index,
  share,
  hidden,
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
}: AccountCardProps) {
  const balance = toNumber(account.balance);
  const animatedBalance = useCountUp(balance);
  const meta = typeMeta[account.type];

  const { onMove: handleSpotlightMove, onLeave: handleSpotlightLeave } =
    useSpotlight(!isEditing && !menuOpen);

  return (
    <div
      onMouseMove={handleSpotlightMove}
      onMouseLeave={handleSpotlightLeave}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
      className={`acc-reveal acc-tilt group relative min-w-0 rounded-3xl border bg-card p-5 sm:p-6 ${menuOpen ? "z-30" : "z-0"
        } ${isEditing
          ? "border-primary shadow-2xl"
          : "border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
        } ${account.is_active ? "" : "opacity-70 saturate-50"}`}
    >
      <span
        aria-hidden="true"
        className={`acc-glow pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-[0.12] ${meta.glow}`}
      />

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-8 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${meta.bar}`}
      />

      {isEditing ? (
        <form onSubmit={onSubmitEdit} className="acc-pop relative space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-primary">
              Editing account
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-foreground">
              {account.name}
            </h2>
          </div>

          <div>
            <label
              htmlFor={`edit-name-${account.id}`}
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Account name
            </label>

            <input
              id={`edit-name-${account.id}`}
              type="text"
              value={editName}
              onChange={(event) => onEditName(event.target.value)}
              className={inputClass}
            />
          </div>

          <TypePicker
            label="Account type"
            value={editType}
            onChange={onEditType}
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="acc-shine inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition duration-500 group-hover:rotate-[-6deg] group-hover:scale-110 ${meta.tile}`}
              >
                {typeIcon(account.type)}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-foreground">
                  {account.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{meta.label}</p>
              </div>
            </div>

            <div className="relative" data-account-menu={account.id}>
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label={`Actions for ${account.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
              >
                {icons.dots}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="acc-pop absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-2xl border border-border bg-card p-1 shadow-2xl backdrop-blur"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onStartEdit}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-secondary"
                  >
                    {icons.edit}
                    Edit
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={onRequestDelete}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-danger transition hover:bg-danger/5"
                  >
                    {icons.trash}
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-medium text-muted">Current balance</p>
            <p className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {hidden ? MASK : formatCurrency(animatedBalance)}
            </p>
          </div>

          {share !== null && (
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`acc-grow h-full rounded-full ${meta.bar}`}
                  style={{ width: `${share}%` }}
                />
              </div>

              <p className="mt-1.5 text-xs text-muted">
                {formatPercent(share)} of your total balance
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${account.is_active
                ? "bg-success/10 text-success"
                : "bg-secondary text-muted"
                }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                {account.is_active && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                )}

                <span
                  className={`relative h-1.5 w-1.5 rounded-full ${account.is_active ? "bg-success" : "bg-muted"
                    }`}
                />
              </span>

              {account.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteDialog({
  account,
  deleting,
  onCancel,
  onConfirm,
}: {
  account: Account;
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
        className="acc-fade absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="acc-pop relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/20">
          {icons.trash}
        </div>

        <h3
          id="delete-account-title"
          className="mt-4 text-lg font-semibold text-foreground"
        >
          Delete {account.name}?
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted">
          This account will be deactivated and will stop counting toward your
          total balance.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            Keep account
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {deleting ? <Spinner /> : null}
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Filter = AccountType | "all";

function Overview({
  total,
  count,
  totals,
  counts,
  accountsLength,
  filter,
  hidden,
  onToggleHidden,
  onFilter,
}: {
  total: number;
  count: number;
  totals: Record<AccountType, number>;
  counts: Record<AccountType, number>;
  accountsLength: number;
  filter: AccountType | "all";
  hidden: boolean;
  onToggleHidden: () => void;
  onFilter: (filter: AccountType | "all") => void;
}) {
  const animatedTotal = useCountUp(total, 1400);
  const { onMove, onLeave } = useSpotlight(false);
  const present = ACCOUNT_TYPES.filter((item) => counts[item] > 0);

  return (
    <section
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ animationDelay: "60ms" }}
      className="acc-reveal group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 text-foreground shadow-xl shadow-primary/5 sm:p-10"
    >
      <span
        aria-hidden="true"
        className="acc-glow pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-[0.12]"
      />

      <span
        aria-hidden="true"
        className="acc-float pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl"
      />

      <span
        aria-hidden="true"
        className="acc-float-slow pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-primary opacity-10 blur-3xl"
      />

      <span
        aria-hidden="true"
        className="acc-float pointer-events-none absolute right-1/3 top-0 h-48 w-48 rounded-full bg-success opacity-10 blur-3xl"
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

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">Total balance</p>

          <button
            type="button"
            onClick={onToggleHidden}
            aria-pressed={hidden}
            aria-label={hidden ? "Show balances" : "Hide balances"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
          >
            {hidden ? icons.eyeOff : icons.eye}
          </button>
        </div>

        <p className="mt-3 break-words bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-4xl font-bold tabular-nums tracking-tight text-transparent sm:text-6xl">
          {hidden ? MASK : formatCurrency(animatedTotal)}
        </p>

        <p className="mt-2 text-sm text-muted">
          Across {count} active {count === 1 ? "account" : "accounts"}
        </p>

        {total > 0 && (
          <div
            className="mt-8 flex h-3.5 gap-1 overflow-hidden rounded-full bg-secondary p-0.5"
            role="img"
            aria-label="Balance split by account type"
          >
            {ACCOUNT_TYPES.filter((item) => totals[item] > 0).map((item) => (
              <button
                key={item}
                type="button"
                tabIndex={-1}
                onClick={() => onFilter(filter === item ? "all" : item)}
                title={`${typeMeta[item].label}: ${hidden ? MASK : formatCurrency(totals[item])
                  } (${formatPercent((totals[item] / total) * 100)})`}
                className={`acc-grow h-full rounded-full transition-all duration-500 hover:brightness-110 ${typeMeta[item].bar}`}
                style={{
                  width: `${(totals[item] / total) * 100}%`,
                  opacity: filter === "all" || filter === item ? 1 : 0.25,
                }}
              />
            ))}
          </div>
        )}

        <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onFilter("all")}
            aria-pressed={filter === "all"}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${filter === "all"
              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "border-border text-muted hover:border-primary/40 hover:text-foreground"
              }`}
          >
            All {accountsLength}
          </button>

          {present.map((item) => {
            const selected = filter === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onFilter(selected ? "all" : item)}
                aria-pressed={selected}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${selected
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                  }`}
              >
                <span className={`h-2 w-2 rounded-full ${typeMeta[item].dot}`} />
                {typeMeta[item].label} {counts[item]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [balance, setBalance] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("cash");

  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    const request: Promise<Account[]> = token
      ? getAccounts(token).then((response) => response.data)
      : Promise.reject(new Error(AUTH_ERROR));

    request
      .then((data) => {
        if (cancelled) return;

        setAccounts(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setError(getErrorMessage(err, "Failed to load accounts."));
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
    if (showAddForm) {
      nameInputRef.current?.focus();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (menuId === null && !deleteTarget) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuId === null) return;

      const target = event.target as Element | null;

      if (!target?.closest(`[data-account-menu="${menuId}"]`)) {
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
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  function reload() {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }

  function resetAddForm() {
    setName("");
    setType("cash");
    setBalance("");
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type);
    setMenuId(null);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditType("cash");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    const trimmedName = name.trim();
    const numericBalance = Number(balance);

    if (!trimmedName) {
      setError("Account name is required.");
      return;
    }

    if (Number.isNaN(numericBalance) || numericBalance < 0) {
      setError("Initial balance must be a valid number.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createAccount(token, {
        name: trimmedName,
        type,
        balance: numericBalance,
      });

      resetAddForm();
      setShowAddForm(false);
      notify(`${trimmedName} was added`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create account."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    accountId: number,
  ) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(AUTH_ERROR);
      return;
    }

    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError("Account name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await updateAccount(token, accountId, {
        name: trimmedName,
        type: editType,
      });

      cancelEdit();
      notify("Changes saved");
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update account."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(account: Account) {
    const token = getToken();

    if (!token) {
      setDeleteTarget(null);
      setError(AUTH_ERROR);
      return;
    }

    try {
      setDeletingId(account.id);
      setError("");

      await deleteAccount(token, account.id);

      if (editingId === account.id) {
        cancelEdit();
      }

      notify(`${account.name} was deleted`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete account."));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  const { activeTotal, activeCount, totalsByType, countsByType } =
    useMemo(() => {
      const totals: Record<AccountType, number> = {
        cash: 0,
        bank: 0,
        ewallet: 0,
        other: 0,
      };

      const counts: Record<AccountType, number> = {
        cash: 0,
        bank: 0,
        ewallet: 0,
        other: 0,
      };

      let total = 0;
      let active = 0;

      for (const account of accounts) {
        counts[account.type] += 1;

        if (account.is_active) {
          const amount = toNumber(account.balance);

          totals[account.type] += amount;
          total += amount;
          active += 1;
        }
      }

      return {
        activeTotal: total,
        activeCount: active,
        totalsByType: totals,
        countsByType: counts,
      };
    }, [accounts]);

  const activeFilter: Filter =
    filter !== "all" && countsByType[filter] === 0 ? "all" : filter;

  const visibleAccounts =
    activeFilter === "all"
      ? accounts
      : accounts.filter((account) => account.type === activeFilter);

  const balancePreview =
    balance !== "" &&
      !Number.isNaN(Number(balance)) &&
      Number(balance) >= 0
      ? formatCurrency(balance)
      : null;

  return (
    <AppShell>
      <style>{`
        @keyframes acc-reveal {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: none;
            filter: blur(0);
          }
        }

        @keyframes acc-pop {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes acc-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes acc-grow {
          from { width: 0; }
        }

        @keyframes acc-toast {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes acc-indeterminate {
          from { transform: translateX(-100%); }
          to { transform: translateX(350%); }
        }

        @keyframes acc-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.15); }
        }

        @keyframes acc-shine {
          from { transform: translateX(-120%) skewX(-20deg); }
          to { transform: translateX(260%) skewX(-20deg); }
        }

        /* "backwards" (not "both") so hover transforms still work afterwards */
        .acc-reveal {
          animation: acc-reveal 750ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .acc-pop {
          animation: acc-pop 260ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .acc-fade {
          animation: acc-fade 240ms ease-out backwards;
        }

        .acc-grow {
          animation: acc-grow 1200ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .acc-toast {
          animation: acc-toast 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .acc-indeterminate {
          animation: acc-indeterminate 1.2s ease-in-out infinite;
        }

        .acc-float {
          animation: acc-float 14s ease-in-out infinite;
        }

        .acc-float-slow {
          animation: acc-float 22s ease-in-out infinite reverse;
        }

        .acc-tilt {
          transition:
            transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 300ms,
            box-shadow 400ms;
          will-change: transform;
          transform-style: preserve-3d;
        }

        .acc-glow {
          background: radial-gradient(
            360px circle at var(--mx, 50%) var(--my, 0%),
            currentColor,
            transparent 70%
          );
        }

        .acc-shine {
          position: relative;
          overflow: hidden;
        }

        .acc-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(
            90deg,
            transparent,
            currentColor,
            transparent
          );
          opacity: 0.25;
          transform: translateX(-120%) skewX(-20deg);
        }

        .acc-shine:hover::after {
          animation: acc-shine 900ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .acc-reveal,
          .acc-pop,
          .acc-fade,
          .acc-grow,
          .acc-toast,
          .acc-indeterminate,
          .acc-float,
          .acc-float-slow {
            animation: none;
          }

          .acc-tilt {
            transition: none;
          }

          .acc-shine:hover::after {
            animation: none;
          }
        }
      `}</style>

      <div className="mx-auto min-w-0 max-w-6xl space-y-4">
        <div className="acc-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Wallets & banks</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Accounts &amp; Balances
            </h1>
            <p className="mt-2 text-sm text-muted">
              Manage your wallets, bank accounts, and cash in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((current) => !current);
              setError("");
            }}
            aria-expanded={showAddForm}
            className="acc-shine inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-95 sm:w-auto"
          >
            <span
              className={`transition-transform duration-500 ease-out motion-reduce:transform-none ${showAddForm ? "rotate-[135deg]" : ""
                }`}
            >
              {icons.plus}
            </span>

            {showAddForm ? "Cancel" : "Add account"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="acc-pop flex items-start justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
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

        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="acc-pop rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-7"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Add account
              </h2>

              <p className="mt-1 text-sm text-muted">
                Add a new account to track your money.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="account-name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Account name
                </label>

                <input
                  ref={nameInputRef}
                  id="account-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. BCA Utama"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="initial-balance"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Initial balance
                </label>

                <input
                  id="initial-balance"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  placeholder="0"
                  className={inputClass}
                />

                <p className="mt-1.5 h-4 text-xs font-medium text-primary">
                  {balancePreview}
                </p>
              </div>

              <div className="md:col-span-2">
                <TypePicker
                  label="Account type"
                  value={type}
                  onChange={setType}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="acc-shine inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? <Spinner /> : null}
                {submitting ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-5 sm:space-y-7" aria-busy="true">
            <div className="h-56 animate-pulse rounded-[2rem] border border-border bg-card" />

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-60 animate-pulse rounded-3xl border border-border bg-card"
                  style={{ animationDelay: `${item * 120}ms` }}
                />
              ))}
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="acc-reveal rounded-3xl border border-dashed border-border bg-card p-10 text-center sm:p-16">
            <span className="acc-float mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
              {icons.wallet}
            </span>

            <p className="mt-5 text-lg font-semibold text-foreground">
              No accounts yet
            </p>

            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Add your first account to start tracking your finances.
            </p>

            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="acc-shine mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 active:scale-95"
              >
                {icons.plus}
                Add your first account
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
              <div className="acc-indeterminate h-full w-1/4 rounded-full bg-primary" />
            </div>

            <Overview
              total={activeTotal}
              count={activeCount}
              totals={totalsByType}
              counts={countsByType}
              accountsLength={accounts.length}
              filter={activeFilter}
              hidden={hidden}
              onToggleHidden={() => setHidden((current) => !current)}
              onFilter={setFilter}
            />

            <div
              className={`grid gap-4 transition-opacity duration-300 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 ${refreshing ? "opacity-70" : "opacity-100"
                }`}
            >
              {visibleAccounts.map((account, index) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  index={index}
                  hidden={hidden}
                  share={
                    account.is_active && activeTotal > 0
                      ? Math.min(
                        Math.max(
                          (toNumber(account.balance) / activeTotal) * 100,
                          0,
                        ),
                        100,
                      )
                      : null
                  }
                  isEditing={editingId === account.id}
                  editName={editName}
                  editType={editType}
                  submitting={submitting}
                  menuOpen={menuId === account.id}
                  onEditName={setEditName}
                  onEditType={setEditType}
                  onToggleMenu={() =>
                    setMenuId((current) =>
                      current === account.id ? null : account.id,
                    )
                  }
                  onStartEdit={() => startEdit(account)}
                  onCancelEdit={cancelEdit}
                  onSubmitEdit={(event) => handleUpdate(event, account.id)}
                  onRequestDelete={() => {
                    setMenuId(null);
                    setDeleteTarget(account);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog
          account={deleteTarget}
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
            className="acc-toast pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-4 py-3 text-sm font-medium text-foreground shadow-2xl backdrop-blur-xl"
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
