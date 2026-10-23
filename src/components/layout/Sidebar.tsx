"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { subscribeToAuth } from "@/lib/auth-storage";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
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

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const menuItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </Icon>
    ),
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: (
      <Icon>
        <path d="M17 4l4 4-4 4" />
        <path d="M21 8H8" />
        <path d="M7 20l-4-4 4-4" />
        <path d="M3 16h13" />
      </Icon>
    ),
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: (
      <Icon>
        <path d="M3 7a2 2 0 0 1 2-2h13v3" />
        <rect x="3" y="8" width="18" height="12" rx="2.5" />
        <path d="M16.5 14h.01" />
      </Icon>
    ),
  },
  {
    label: "Categories",
    href: "/categories",
    icon: (
      <Icon>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </Icon>
    ),
  },
  {
    label: "Budgets",
    href: "/budgets",
    icon: (
      <Icon>
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M21 3v9h-9" />
      </Icon>
    ),
  },
  {
    label: "Goals",
    href: "/goals",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.2" />
      </Icon>
    ),
  },
  {
    label: "Recurring",
    href: "/recurring",
    icon: (
      <Icon>
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 15 6.7L21 16" />
        <path d="M16 16h5v5" />
      </Icon>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <Icon>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </Icon>
    ),
  },
];

const accountItems: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </Icon>
    ),
  },
];

const logoutIcon = (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

interface CurrentUser {
  id: number | string;
  name: string;
  email: string;
}

function getUserSnapshot() {
  if (typeof window === "undefined") return "";

  return window.localStorage.getItem("pocketa_user") ?? "";
}

function getServerUserSnapshot() {
  return "";
}

function useCurrentUser() {
  const storage = useSyncExternalStore(
    subscribeToAuth,
    getUserSnapshot,
    getServerUserSnapshot,
  );

  return useMemo<CurrentUser | null>(() => {
    if (!storage || storage === "undefined" || storage === "null") {
      return null;
    }

    try {
      return JSON.parse(storage) as CurrentUser;
    } catch {
      return null;
    }
  }, [storage]);
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

function UserAvatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Avatar of ${name}`}
    >
      <div
        suppressHydrationWarning
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground shadow-md ring-2 ring-card"
        style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent"
        />
        <span
          suppressHydrationWarning
          className="relative leading-none tracking-tight"
        >
          {getInitials(name)}
        </span>
      </div>
    </div>
  );
}

const ITEM_HEIGHT = 40;
const ITEM_GAP = 2;
const STEP = ITEM_HEIGHT + ITEM_GAP;

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
  } catch {
    // Storage can be unavailable (private mode); the toggle just won't persist.
  }

  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
  delayOffset,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  delayOffset: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const activeIndex = items.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div>
      <p
        className={`mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted ${collapsed ? "lg:hidden" : ""
          }`}
      >
        {label}
      </p>

      {collapsed && <div className="mx-3 mb-3 hidden h-px bg-border lg:block" />}

      <div
        className="relative flex flex-col gap-0.5"
        onMouseLeave={() => setHovered(null)}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-full rounded-lg bg-secondary transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            height: ITEM_HEIGHT,
            transform: `translateY(${(hovered ?? 0) * STEP}px)`,
            opacity: hovered === null || hovered === activeIndex ? 0 : 1,
          }}
        />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-full rounded-lg bg-primary/15 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
          style={{
            height: ITEM_HEIGHT,
            transform: `translateY(${Math.max(activeIndex, 0) * STEP}px)`,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />

        {items.map((item, index) => {
          const active = index === activeIndex;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              style={{
                height: ITEM_HEIGHT,
                animationDelay: `${(index + delayOffset) * 40 + 100}ms`,
              }}
              className={`pocketa-item-in group relative z-10 flex items-center gap-3 rounded-lg px-[17px] text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] motion-reduce:transition-none ${active ? "text-primary" : "text-muted hover:text-foreground"
                }`}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 motion-reduce:transition-none">
                {item.icon}
              </span>

              <span
                className={`max-w-[10rem] overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "lg:max-w-0 lg:opacity-0" : ""
                  }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ mobileOpen, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  const userName = user?.name?.trim() || "User";

  return (
    <>
      <style>{`
        @keyframes pocketa-item-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pocketa-logo-pop {
          0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; }
          70%  { transform: scale(1.08) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes pocketa-card-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pocketa-item-in  { animation: pocketa-item-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pocketa-logo-pop { animation: pocketa-logo-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .pocketa-card-in  { animation: pocketa-card-in 500ms cubic-bezier(0.22, 1, 0.36, 1) 450ms both; }
        @media (prefers-reduced-motion: reduce) {
          .pocketa-item-in, .pocketa-logo-pop, .pocketa-card-in { animation: none; }
        }
      `}</style>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${mobileOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50
          w-72 max-w-[85vw]
          overflow-visible
          border-r border-border bg-card shadow-2xl
          transition-[transform,width] duration-300
          ease-[cubic-bezier(0.22,1,0.36,1)]
          motion-reduce:transition-none
          lg:sticky lg:inset-y-0 lg:top-0 lg:z-30
          lg:h-screen lg:shrink-0 lg:translate-x-0
          lg:self-start lg:shadow-none
          ${collapsed ? "lg:w-[76px]" : "lg:w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={() => writeCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="
            absolute -right-3 top-[60px] z-50
            hidden h-6 w-6
            items-center justify-center
            rounded-full border border-border
            bg-card text-muted shadow-md
            outline-none
            transition-[background-color,color,transform] duration-200
            hover:bg-secondary hover:text-foreground
            focus-visible:ring-2 focus-visible:ring-primary
            active:scale-90
            motion-reduce:transition-none
            lg:flex
          "
        >
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
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="relative flex h-full min-h-0 flex-col">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-primary opacity-10 blur-3xl"
          />

          <div
            className={`relative flex h-[72px] shrink-0 items-center justify-between border-b border-border px-5 ${collapsed ? "lg:justify-center lg:px-0" : ""
              }`}
          >
            <Link
              href="/"
              onClick={onClose}
              aria-label="Pocketa home"
              className="group flex min-w-0 items-center gap-3"
            >
              <span className="pocketa-logo-pop relative block h-9 w-9 shrink-0">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-primary opacity-25 blur-md transition-opacity duration-300 group-hover:opacity-50"
                />
                <span className="relative block h-full w-full rounded-xl bg-gradient-to-br from-primary to-success p-px shadow-md transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 motion-reduce:transition-none">
                  <span className="relative block h-full w-full overflow-hidden rounded-[11px] bg-card">
                    <Image
                      src="/pocketa.png"
                      alt=""
                      fill
                      sizes="36px"
                      priority
                      className="object-contain p-1"
                    />
                  </span>
                </span>
              </span>

              <span
                className={`flex min-w-0 flex-col leading-tight ${collapsed ? "lg:hidden" : ""
                  }`}
              >
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Pocketa
                </span>
                <span className="truncate text-[11px] text-muted">
                  Personal Finance
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-muted transition duration-200 hover:rotate-90 hover:bg-secondary hover:text-foreground active:scale-90 motion-reduce:transition-none lg:hidden"
            >
              ×
            </button>
          </div>

          <nav
            aria-label="Main navigation"
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 [scrollbar-width:thin]"
          >
            <div key={mobileOpen ? "open" : "closed"} className="space-y-6">
              <NavGroup
                label="Menu"
                items={menuItems}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onClose}
                delayOffset={0}
              />
              <NavGroup
                label="Account"
                items={accountItems}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onClose}
                delayOffset={menuItems.length}
              />
            </div>
          </nav>

          <div className="relative shrink-0 border-t border-border p-3">
            <div
              className={`pocketa-card-in flex items-center gap-3 rounded-xl p-1.5 ${collapsed ? "lg:flex-col lg:gap-2" : ""
                }`}
            >
              <UserAvatar name={userName} size={34} />

              <div
                className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}
              >
                <p
                  suppressHydrationWarning
                  className="truncate text-xs font-semibold text-foreground"
                >
                  {userName}
                </p>
                <p
                  suppressHydrationWarning
                  className="truncate text-[11px] text-muted"
                >
                  {user?.email || "Personal Account"}
                </p>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Log out"
                  title="Log out"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition duration-200 hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger active:scale-90"
                >
                  {logoutIcon}
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}