"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { clearAuth } from "@/lib/auth-storage";

interface User {
  id: number;
  name: string;
  email: string;
}

const USER_KEY = "pocketa_user";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);

  return () => window.removeEventListener("storage", onChange);
}

function getUserStorage() {
  try {
    return window.localStorage.getItem(USER_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerUserStorage() {
  return "";
}

const COLLAPSE_KEY = "pocketa:sidebar-collapsed";
const COLLAPSE_EVENT = "pocketa:sidebar-collapsed-change";

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSE_EVENT, onChange);
  };
}

function getCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch { }

  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "U";

  const letters =
    words.length > 1
      ? [Array.from(words[0])[0], Array.from(words[1])[0]]
      : Array.from(words[0]).slice(0, 2);

  return letters.join("").toLocaleUpperCase();
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

const icons = {
  user: (
    <SvgIcon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </SvgIcon>
  ),
  palette: (
    <SvgIcon>
      <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.5-3.3 2 2 0 0 1 1.5-3.4H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7" r="1" />
      <circle cx="15.5" cy="7.5" r="1" />
    </SvgIcon>
  ),
  grid: (
    <SvgIcon>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </SvgIcon>
  ),
  shield: (
    <SvgIcon>
      <path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </SvgIcon>
  ),
  logout: (
    <SvgIcon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </SvgIcon>
  ),
  copy: (
    <SvgIcon size={16}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </SvgIcon>
  ),
  check: (
    <SvgIcon size={16}>
      <path d="m5 12 5 5L20 7" />
    </SvgIcon>
  ),
  arrow: (
    <SvgIcon size={16}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  ),
  sidebar: (
    <SvgIcon>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
    </SvgIcon>
  ),
};

const manageLinks = [
  {
    href: "/accounts",
    label: "Accounts",
    description: "Cash, banks, and e-wallets",
    icon: (
      <SvgIcon>
        <path d="M3 7a2 2 0 0 1 2-2h13v3" />
        <rect x="3" y="8" width="18" height="12" rx="2.5" />
        <path d="M16.5 14h.01" />
      </SvgIcon>
    ),
  },
  {
    href: "/categories",
    label: "Categories",
    description: "Income and expense labels",
    icon: (
      <SvgIcon>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </SvgIcon>
    ),
  },
  {
    href: "/budgets",
    label: "Budgets",
    description: "Spending limits",
    icon: (
      <SvgIcon>
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M21 3v9h-9" />
      </SvgIcon>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    description: "Savings targets",
    icon: (
      <SvgIcon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.2" />
      </SvgIcon>
    ),
  },
  {
    href: "/recurring",
    label: "Recurring",
    description: "Scheduled transactions",
    icon: (
      <SvgIcon>
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 15 6.7L21 16" />
        <path d="M16 16h5v5" />
      </SvgIcon>
    ),
  },
];

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  delay,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      className="set-reveal min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary ${checked ? "bg-primary" : "bg-secondary"
        }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
}

function InfoTile({
  label,
  value,
  copyable = false,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (label: string, value: string) => void;
}) {
  const canCopy = copyable && value !== "-";

  return (
    <div className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-4 transition duration-200 hover:border-primary/40 hover:bg-secondary/50">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p
          suppressHydrationWarning
          className="mt-1 truncate text-sm font-semibold text-foreground"
        >
          {value}
        </p>
      </div>

      {canCopy && (
        <button
          type="button"
          onClick={() => onCopy?.(label, value)}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted opacity-100 outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          {icons.copy}
        </button>
      )}
    </div>
  );
}

function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const palette =
    mode === "light"
      ? { bg: "#f1f5f9", panel: "#ffffff", line: "#e2e8f0", text: "#0f172a" }
      : { bg: "#0b1020", panel: "#111a2e", line: "#1e2a44", text: "#e2e8f0" };

  return (
    <div
      aria-hidden="true"
      className="flex h-28 overflow-hidden rounded-xl border"
      style={{ background: palette.bg, borderColor: palette.line }}
    >
      <div
        className="flex w-1/4 flex-col gap-1.5 border-r p-2"
        style={{ background: palette.panel, borderColor: palette.line }}
      >
        <span className="h-2 w-3/4 rounded-full bg-primary" />
        <span className="h-1.5 w-full rounded-full" style={{ background: palette.line }} />
        <span className="h-1.5 w-2/3 rounded-full" style={{ background: palette.line }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: palette.line }} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <span className="h-2 w-1/3 rounded-full" style={{ background: palette.text, opacity: 0.8 }} />
        <div className="flex gap-2">
          {[0, 1].map((item) => (
            <span
              key={item}
              className="h-10 flex-1 rounded-lg border"
              style={{ background: palette.panel, borderColor: palette.line }}
            />
          ))}
        </div>
        <span className="h-8 rounded-lg" style={{ background: palette.panel }}>
          <span className="mx-2 mt-4 block h-0.5 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}

function ThemeOption({
  mode,
  selected,
  onSelect,
}: {
  mode: "light" | "dark";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative rounded-2xl border p-3 text-left outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] ${selected
        ? "border-primary bg-primary/5 shadow-lg"
        : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none"
        }`}
    >
      <ThemePreview mode={mode} />

      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <span className="text-sm font-semibold text-foreground">
          {mode === "light" ? "Light" : "Dark"}
        </span>

        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border transition duration-300 ${selected
            ? "scale-100 border-primary bg-primary text-primary-foreground"
            : "scale-90 border-border text-transparent"
            }`}
        >
          <SvgIcon size={12}>
            <path d="m5 12 5 5L20 7" />
          </SvgIcon>
        </span>
      </div>
    </button>
  );
}

function LogoutDialog({
  busy,
  onCancel,
  onConfirm,
}: {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="set-fade absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="set-pop relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          {icons.logout}
        </div>

        <h3 id="logout-title" className="mt-4 text-lg font-semibold text-foreground">
          Log out of Pocketa?
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted">
          You&apos;ll need to log in again to access your account.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary active:scale-95 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {busy ? <Spinner /> : null}
            {busy ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const userStorage = useSyncExternalStore(
    subscribeStorage,
    getUserStorage,
    getServerUserStorage,
  );

  const user = useMemo<User | null>(() => {
    if (!userStorage) return null;

    try {
      return JSON.parse(userStorage) as User;
    } catch {
      return null;
    }
  }, [userStorage]);

  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function notify(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  async function handleCopy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} copied`);
    } catch {
      notify("Failed to copy to clipboard");
    }
  }

  function handleLogout() {
    setLoggingOut(true);
    clearAuth();
    router.push("/login");
  }

  function selectTheme(mode: "light" | "dark") {
    if (theme !== mode) toggleTheme();
  }

  const name = user?.name?.trim() || "";
  const email = user?.email || "";
  const displayName = name || "User";

  return (
    <AppShell>
      <style>{`
        @keyframes set-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes set-pop {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes set-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes set-toast {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes set-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes set-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(24px, 16px) scale(1.08); }
        }
        .set-reveal { animation: set-reveal 550ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .set-pop    { animation: set-pop 240ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .set-fade   { animation: set-fade 220ms ease-out backwards; }
        .set-toast  { animation: set-toast 300ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .set-spin   { animation: set-spin 8s linear infinite; }
        .set-drift  { animation: set-drift 14s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .set-reveal, .set-pop, .set-fade, .set-toast, .set-spin, .set-drift { animation: none; }
        }
      `}</style>

      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4 sm:space-y-6">
        <header className="set-reveal">
          <p className="text-sm font-medium text-primary">Preferences</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Settings &amp; Account
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Manage your profile, appearance, and session.
          </p>
        </header>

        <section
          className="set-reveal relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-8"
          style={{ animationDelay: "60ms" }}
        >
          <span
            aria-hidden="true"
            className="set-drift pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary opacity-10 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="set-drift pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-success opacity-5 blur-3xl"
            style={{ animationDelay: "3s" }}
          />

          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="relative h-24 w-24 shrink-0">
              <span
                aria-hidden="true"
                className="set-spin absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,var(--tw-gradient-stops))] from-primary via-success to-primary"
              />
              <span
                suppressHydrationWarning
                className="relative flex h-full w-full items-center justify-center rounded-full bg-primary text-3xl font-bold tracking-tight text-primary-foreground ring-4 ring-card"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent"
                />
                <span className="relative leading-none">
                  {getInitials(displayName)}
                </span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h2
                suppressHydrationWarning
                className="truncate text-2xl font-bold tracking-tight text-foreground"
              >
                {displayName}
              </h2>
              <p
                suppressHydrationWarning
                className="mt-1 truncate text-sm text-muted"
              >
                {email || "No email yet"}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted">
                  <span className="text-primary">{icons.user}</span>
                  Personal Account
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Active session
                </span>
              </div>
            </div>
          </div>
        </section>

        <SettingsCard
          icon={icons.user}
          title="Profile"
          subtitle="Your account information."
          delay={120}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile
              label="Name"
              value={name || "-"}
              copyable
              onCopy={handleCopy}
            />
            <InfoTile
              label="Email"
              value={email || "-"}
              copyable
              onCopy={handleCopy}
            />
            {user?.id !== undefined && (
              <InfoTile label="Account ID" value={`#${user.id}`} />
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={icons.palette}
          title="Appearance"
          subtitle="Choose how Pocketa looks and feels."
          delay={180}
        >
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid gap-3 sm:grid-cols-2"
          >
            <ThemeOption
              mode="light"
              selected={theme === "light"}
              onSelect={() => selectTheme("light")}
            />
            <ThemeOption
              mode="dark"
              selected={theme === "dark"}
              onSelect={() => selectTheme("dark")}
            />
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4 lg:flex">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted">
                {icons.sidebar}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Compact sidebar
                </p>
                <p className="text-xs text-muted">
                  Show only icons in the sidebar to save space.
                </p>
              </div>
            </div>

            <Switch
              checked={collapsed}
              label="Compact sidebar"
              onChange={() => writeCollapsed(!collapsed)}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={icons.grid}
          title="Manage your data"
          subtitle="Jump straight to the parts of Pocketa you can manage."
          delay={240}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manageLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3.5 outline-none transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transform-none">
                  {link.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {link.label}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {link.description}
                  </span>
                </span>

                <span className="text-muted transition duration-300 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none">
                  {icons.arrow}
                </span>
              </Link>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={icons.shield}
          title="Session"
          subtitle="Manage your current Pocketa session."
          delay={300}
        >
          <div className="flex flex-col gap-4 rounded-xl border border-danger/20 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Log out of this device
              </p>
              <p
                suppressHydrationWarning
                className="mt-0.5 truncate text-xs text-muted"
              >
                {email ? `Logged in as ${email}` : "You are currently logged in."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger transition duration-200 hover:bg-danger hover:text-white active:scale-95"
            >
              {icons.logout}
              Log out
            </button>
          </div>
        </SettingsCard>
      </div>

      {showLogoutConfirm && (
        <LogoutDialog
          busy={loggingOut}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      >
        {toast && (
          <div
            key={toast}
            className="set-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
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