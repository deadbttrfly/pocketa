"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { getToken } from "@/lib/auth-storage";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
  type AppNotification,
} from "@/lib/notifications";

interface HeaderProps {
  onMenuClick?: () => void;
}

const SECTIONS: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/transactions", "Transactions"],
  ["/accounts", "Accounts"],
  ["/categories", "Categories"],
  ["/budgets", "Budgets"],
  ["/goals", "Goals"],
  ["/recurring", "Recurring"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

function getSectionLabel(pathname: string) {
  const match = SECTIONS.find(
    ([href]) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return match ? match[1] : "Pocketa";
}

function getNotificationHref(notification: AppNotification): string {
  const allowedPaths: Record<AppNotification["type"], string> = {
    budget_alert: "/budgets",
    recurring_due: "/recurring",
    recurring_success: "/recurring",
    recurring_failure: "/recurring",
  };

  const fallback = allowedPaths[notification.type];
  const link = notification.link;

  if (
    !link ||
    !link.startsWith("/") ||
    link.startsWith("//") ||
    link.includes("\\")
  ) {
    return fallback;
  }

  const allowedPrefixes = [
    "/dashboard",
    "/transactions",
    "/accounts",
    "/categories",
    "/budgets",
    "/goals",
    "/recurring",
    "/reports",
    "/settings",
  ];

  const isAllowed = allowedPrefixes.some(
    (path) => link === path || link.startsWith(`${path}/`),
  );

  return isAllowed ? link : fallback;
}

function isNotificationRead(notification: AppNotification) {
  return (
    notification.is_read === true ||
    Number(notification.is_read) === 1
  );
}

function normalizeNotificationsResponse(result: unknown): {
  items: AppNotification[];
  unread: number;
} {
  let items: AppNotification[] = [];
  let unread: number | null = null;

  if (Array.isArray(result)) {
    items = result as AppNotification[];
  } else if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    const nested = record.data;

    if (Array.isArray(record.notifications)) {
      items = record.notifications as AppNotification[];
    } else if (Array.isArray(nested)) {
      items = nested as AppNotification[];
    } else if (nested && typeof nested === "object") {
      const nestedRecord = nested as Record<string, unknown>;

      if (Array.isArray(nestedRecord.notifications)) {
        items = nestedRecord.notifications as AppNotification[];
      }

      const nestedCount =
        nestedRecord.unread_count ?? nestedRecord.unreadCount;

      if (
        typeof nestedCount === "number" &&
        Number.isFinite(nestedCount)
      ) {
        unread = nestedCount;
      }
    }

    const count = record.unread_count ?? record.unreadCount;

    if (typeof count === "number" && Number.isFinite(count)) {
      unread = count;
    }
  }

  return {
    items,
    unread:
      unread ?? items.filter((item) => !isNotificationRead(item)).length,
  };
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) return "";

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const formatter = new Intl.RelativeTimeFormat("id-ID", {
    numeric: "auto",
  });

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const minutes = Math.round(diffSeconds / 60);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);

  if (Math.abs(days) < 30) {
    return formatter.format(days, "day");
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SvgIcon({
  children,
  size = 18,
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function NotificationIcon({
  type,
}: {
  type: AppNotification["type"];
}) {
  if (type === "budget_alert") {
    return (
      <SvgIcon size={17}>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </SvgIcon>
    );
  }

  if (type === "recurring_failure") {
    return (
      <SvgIcon size={17}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </SvgIcon>
    );
  }

  if (type === "recurring_success") {
    return (
      <SvgIcon size={17}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </SvgIcon>
    );
  }

  return (
    <SvgIcon size={17}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  );
}

function getNotificationStyle(type: AppNotification["type"]) {
  switch (type) {
    case "budget_alert":
      return "bg-amber-500/10 text-amber-500";
    case "recurring_failure":
      return "bg-danger/10 text-danger";
    case "recurring_success":
      return "bg-success/10 text-success";
    case "recurring_due":
    default:
      return "bg-primary/10 text-primary";
  }
}

function NotificationsMenu() {
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const loadNotifications = useCallback(async () => {
    const id = ++requestRef.current;
    const token = getToken();

    if (!token) {
      if (id !== requestRef.current) return;

      setNotifications([]);
      setUnreadCount(0);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      try {
        await syncNotifications(token);
      } catch {
      }

      const result: unknown = await getNotifications(token);

      if (id !== requestRef.current) return;

      const { items, unread } = normalizeNotificationsResponse(result);

      setNotifications(items);
      setUnreadCount(unread);
      setError("");
    } catch {
      if (id !== requestRef.current) return;

      setError("Could not load notifications.");
    } finally {
      if (id === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [pathname, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleRefresh = () => {
    setError("");
    void loadNotifications();
  };

  const handleToggle = () => {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      void loadNotifications();
    }
  };

  const handleMarkRead = async (notification: AppNotification) => {
    if (isNotificationRead(notification)) return;
    if (actionLoading !== null) return;

    const token = getToken();

    if (!token) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setActionLoading(`read-${notification.id}`);
    setError("");

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true }
          : item,
      ),
    );

    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationRead(token, notification.id);
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError("Could not mark the notification as read.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    const token = getToken();

    if (!token || unreadCount === 0 || actionLoading !== null) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setActionLoading("read-all");
    setError("");

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead(token);
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError("Could not mark all notifications as read.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (notification: AppNotification) => {
    const token = getToken();

    if (!token || actionLoading !== null) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    const wasUnread = !isNotificationRead(notification);

    setActionLoading(`delete-${notification.id}`);
    setError("");

    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );

    if (wasUnread) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    try {
      await deleteNotification(token, notification.id);
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError("Could not delete the notification.");
    } finally {
      setActionLoading(null);
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted outline-none transition duration-200 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90 ${open ? "bg-secondary text-foreground" : "bg-transparent"
          }`}
      >
        <span className={unreadCount > 0 ? "hdr-ring" : ""}>
          <SvgIcon>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </SvgIcon>
        </span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="hdr-pop absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Notifications
              </p>

              <p className="mt-0.5 text-xs text-muted">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"
                  }`
                  : "You are up to date"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={actionLoading !== null}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "read-all"
                  ? "Updating..."
                  : "Mark all read"}
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mx-3 mt-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2"
            >
              <p className="text-xs text-danger">{error}</p>

              <button
                type="button"
                onClick={handleRefresh}
                className="mt-1 text-xs font-semibold text-danger underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {loading && !hasNotifications ? (
            <div className="flex flex-col items-center px-4 py-9 text-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />

              <p className="mt-3 text-sm text-muted">
                Loading notifications...
              </p>
            </div>
          ) : hasNotifications ? (
            <ul className="max-h-[min(26rem,65vh)] overflow-y-auto p-2">
              {notifications.map((notification) => {
                const read = isNotificationRead(notification);
                const busy =
                  actionLoading === `read-${notification.id}` ||
                  actionLoading === `delete-${notification.id}`;

                return (
                  <li
                    key={notification.id}
                    className={`group relative rounded-xl transition ${read ? "opacity-80" : "bg-secondary/60"
                      }`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getNotificationStyle(
                          notification.type,
                        )}`}
                      >
                        <NotificationIcon type={notification.type} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={getNotificationHref(notification)}
                          onClick={() => {
                            if (!read) {
                              void handleMarkRead(notification);
                            }

                            setOpen(false);
                          }}
                          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="flex items-start gap-2">
                            <span
                              className={`min-w-0 flex-1 text-sm ${read
                                  ? "font-medium text-foreground"
                                  : "font-semibold text-foreground"
                                }`}
                            >
                              {notification.title}
                            </span>

                            {!read && (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                aria-label="Unread"
                              />
                            )}
                          </span>

                          <span className="mt-1 block break-words text-xs leading-relaxed text-muted">
                            {notification.message}
                          </span>

                          <span className="mt-2 block text-[11px] text-muted/80">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </Link>

                        <div className="mt-2 flex items-center gap-3">
                          {!read && (
                            <button
                              type="button"
                              disabled={busy || actionLoading !== null}
                              onClick={() =>
                                void handleMarkRead(notification)
                              }
                              className="text-xs font-medium text-primary transition hover:underline disabled:opacity-50"
                            >
                              Mark as read
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={busy || actionLoading !== null}
                            onClick={() => void handleDelete(notification)}
                            className="text-xs text-muted transition hover:text-danger disabled:opacity-50"
                          >
                            {actionLoading ===
                              `delete-${notification.id}`
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-4 py-9 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <SvgIcon size={22}>
                  <path d="m5 12 5 5L20 7" />
                </SvgIcon>
              </span>

              <p className="mt-3 text-sm font-semibold text-foreground">
                You&apos;re all caught up
              </p>

              <p className="mt-1 max-w-[15rem] text-xs leading-relaxed text-muted">
                No notifications yet. Budget alerts and recurring updates will
                appear here when available.
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
              >
                Refresh notifications
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[11px] text-muted">
              {notifications.length} notification
              {notifications.length === 1 ? "" : "s"}
            </span>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh notifications"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <SvgIcon size={13}>
                <path d="M20 7v5h-5" />
                <path d="M4 17v-5h5" />
                <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12" />
                <path d="M4 12l2.8 5a7 7 0 0 0 11.6-2" />
              </SvgIcon>

              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const darkMode = theme === "dark";
  const title = getSectionLabel(pathname);
  const themeLabel = darkMode
    ? "Switch to light mode"
    : "Switch to dark mode";

  return (
    <header className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <style>{`
        @keyframes hdr-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes hdr-pop {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes hdr-ring {
          0%, 88%, 100% { transform: rotate(0); }
          90% { transform: rotate(14deg); }
          93% { transform: rotate(-12deg); }
          96% { transform: rotate(8deg); }
        }

        .hdr-in {
          animation: hdr-in 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .hdr-pop {
          animation: hdr-pop 220ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .hdr-ring {
          display: inline-flex;
          transform-origin: 50% 0;
          animation: hdr-ring 6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hdr-in, .hdr-pop, .hdr-ring {
            animation: none;
          }
        }
      `}</style>

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition hover:shadow-md active:scale-90 lg:hidden"
        >
          <SvgIcon size={20}>
            <path d="M4 7h16M4 12h10M4 17h16" />
          </SvgIcon>
        </button>

        <h1
          key={title}
          className="hdr-in truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted outline-none transition duration-200 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
        >
          <svg
            className={`absolute h-[18px] w-[18px] text-amber-400 transition-all duration-500 ${darkMode
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-50 opacity-0"
              }`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"
              clipRule="evenodd"
            />
          </svg>

          <svg
            className={`absolute h-[18px] w-[18px] transition-all duration-500 ${darkMode
                ? "rotate-90 scale-50 opacity-0"
                : "rotate-0 scale-100 opacity-100"
              }`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </button>

        <NotificationsMenu />
      </div>
    </header>
  );
}