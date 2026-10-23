"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

import { getToken } from "@/lib/auth-storage";

function SvgIcon({
  children,
  size = 24,
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

const features = [
  {
    icon: (
      <SvgIcon>
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M2.5 10h19" />
        <path d="M6.5 15h3" />
      </SvgIcon>
    ),
    title: "Every Account, One Elegant View",
    description:
      "Cash, bank accounts, and e-wallets unified in a single, refined overview, so you always know exactly where you stand.",
  },
  {
    icon: (
      <SvgIcon>
        <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
      </SvgIcon>
    ),
    title: "Effortless Recording",
    description:
      "Log income and expenses in seconds. Smart categories keep every entry impeccably organized.",
  },
  {
    icon: (
      <SvgIcon>
        <path d="M12 3 2 20h20Z" />
        <path d="M12 10v4" />
        <path d="M12 17h.01" />
      </SvgIcon>
    ),
    title: "Intelligent Budget Alerts",
    description:
      "Set monthly limits for each category. Visual indicators shift color well before you overspend, keeping you gracefully in control.",
  },
  {
    icon: (
      <SvgIcon>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </SvgIcon>
    ),
    title: "Categories Made to Measure",
    description:
      "Shape your finances around your lifestyle, from Dining and Transport to Entertainment and Investments.",
  },
  {
    icon: (
      <SvgIcon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.2" />
      </SvgIcon>
    ),
    title: "Goals Worth Reaching",
    description:
      "Define your ambitions, log every deposit, and celebrate each milestone, guided by a monthly savings estimate.",
  },
  {
    icon: (
      <SvgIcon>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </SvgIcon>
    ),
    title: "Insightful Visual Reports",
    description:
      "Cash flow charts, category breakdowns, and budget performance reveal the story behind your spending habits.",
  },
];

const steps = [
  {
    step: "01",
    title: "Add Your Accounts",
    description:
      "List the wallets and bank accounts you rely on every day. Your complete picture begins here.",
    icon: (
      <SvgIcon>
        <rect x="2.5" y="6" width="19" height="13" rx="3" />
        <path d="M16 12.5h.01" />
        <path d="M5 6l11-3v3" />
      </SvgIcon>
    ),
  },
  {
    step: "02",
    title: "Capture Every Rupiah",
    description:
      "Choose a category, enter the amount, and save the transaction in a matter of seconds.",
    icon: (
      <SvgIcon>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </SvgIcon>
    ),
  },
  {
    step: "03",
    title: "Monitor & Refine",
    description:
      "See your spending beautifully visualized and keep every budget comfortably within its limits.",
    icon: (
      <SvgIcon>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </SvgIcon>
    ),
  },
];

const stats = [
  { prefix: "", value: 100, suffix: "%", decimals: 0, label: "Privacy Protected" },
  { prefix: "< ", value: 1, suffix: " Minute", decimals: 0, label: "Effortless Setup" },
  { prefix: "", value: 3, suffix: "x", decimals: 0, label: "Smarter Saving" },
  { prefix: "", value: 4.9, suffix: " / 5", decimals: 1, label: "User Satisfaction" },
];

const faqs = [
  {
    question: "Is Pocketa really free?",
    answer:
      "Yes. Pocketa is free to use and never interrupts you with intrusive ads.",
  },
  {
    question: "Which accounts can I track?",
    answer:
      "Cash, bank accounts, and e-wallets. Every balance is combined into one overview that is effortless to read.",
  },
  {
    question: "Can I create my own categories?",
    answer:
      "Absolutely. Create income and expense categories that suit your lifestyle, from Dining to Investments.",
  },
  {
    question: "How do budget alerts work?",
    answer:
      "Set a limit for each category and period. The indicator changes color as your spending approaches the limit, well before you overspend.",
  },
  {
    question: "Is there a dark theme?",
    answer:
      "Yes. Use the theme button at the top of the page to switch between light and dark mode.",
  },
];

const navLinks = [
  { id: "stats", label: "Why Pocketa" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "faq", label: "FAQ" },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
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

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`lp-reveal ${inView ? "lp-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-secondary hover:text-foreground active:scale-90"
    >
      <svg
        className={`absolute h-5 w-5 text-amber-400 transition-all duration-500 ${darkMode ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
          }`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 001.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"
          clipRule="evenodd"
        />
      </svg>
      <svg
        className={`absolute h-5 w-5 text-foreground transition-all duration-500 ${darkMode ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);

  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot() {
  return getToken();
}

function getServerSnapshot() {
  return undefined;
}

function LandingActions({
  variant = "hero",
  onNavigate,
}: {
  variant?: "hero" | "nav" | "menu";
  onNavigate?: () => void;
}) {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const size =
    variant === "hero"
      ? "px-7 py-3.5 text-base"
      : variant === "menu"
        ? "px-5 py-3 text-base"
        : "px-4 py-2 text-sm";

  const primary = `lp-btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none ${size}`;
  const secondary = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card font-semibold text-foreground transition duration-300 hover:-translate-y-0.5 hover:bg-secondary active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none ${size}`;

  if (token) {
    return (
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`${primary} ${variant === "menu" ? "w-full" : ""}`}
      >
        Go to Dashboard
        <span aria-hidden="true">→</span>
      </Link>
    );
  }

  if (variant === "nav") {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className={secondary}>
          Log In
        </Link>
        <Link href="/register" className={primary}>
          Get Started Free
        </Link>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/register" onClick={onNavigate} className={`${primary} w-full`}>
          Get Started Free
        </Link>
        <Link href="/login" onClick={onNavigate} className={`${secondary} w-full`}>
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href="/register" className={primary}>
        Start Free Today
        <span aria-hidden="true">→</span>
      </Link>
      <Link href="/login" className={secondary}>
        Log In
      </Link>
    </div>
  );
}

function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? window.scrollY / max : 0;

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }

      if (headerRef.current) {
        headerRef.current.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
      }

      if (window.scrollY < 120) setActiveId(null);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    for (const link of navLinks) {
      const section = document.getElementById(link.id);

      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    document.documentElement.style.scrollBehavior = "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      data-scrolled="false"
      className="sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-xl transition-all duration-300 [&[data-scrolled='true']]:border-border [&[data-scrolled='true']]:bg-background/85 [&[data-scrolled='true']]:shadow-lg"
    >
      <div
        ref={progressRef}
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary"
        aria-hidden="true"
      />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-xl font-extrabold tracking-tight"
        >
          <Image
            src="/pocketa.png"
            alt="Pocketa Logo"
            width={32}
            height={32}
            priority
            className="rounded-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
          />
          <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
            Pocketa
          </span>
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 text-sm font-medium md:flex"
        >
          {navLinks.map((link) => {
            const active = activeId === link.id;

            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={active ? "true" : undefined}
                className={`relative rounded-lg px-3 py-2 transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0"
                    }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <div className="hidden sm:block">
            <LandingActions variant="nav" />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition hover:bg-secondary active:scale-90 md:hidden"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${menuOpen ? "top-1.5 rotate-45" : "top-0"
                  }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : "opacity-100"
                  }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${menuOpen ? "top-1.5 -rotate-45" : "top-3"
                  }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 md:hidden ${menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 border-t border-border px-4 pb-5 pt-3">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-secondary ${activeId === link.id ? "text-primary" : "text-foreground"
                  }`}
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3">
              <LandingActions variant="menu" onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const DEMO_LIMIT = 1_000_000;
const DEMO_MAX = 1_400_000;
const GOAL_TARGET = 12_000_000;
const GOAL_START = 4_800_000;
const CONFETTI_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];

const EXPENSE_SAMPLES = [
  { title: "Lunch", category: "Food", amount: 45_000 },
  { title: "Ride Fare", category: "Transport", amount: 22_000 },
  { title: "Streaming Subscription", category: "Entertainment", amount: 54_000 },
  { title: "Monthly Groceries", category: "Essentials", amount: 180_000 },
];

const INCOME_SAMPLES = [
  { title: "Design Project", category: "Income", amount: 750_000 },
  { title: "Weekly Bonus", category: "Income", amount: 300_000 },
];

type DemoTab = "budget" | "transactions" | "goal";

const DEMO_TABS: { id: DemoTab; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "transactions", label: "Transactions" },
  { id: "goal", label: "Goals" },
];

interface DemoTx {
  id: number;
  title: string;
  category: string;
  amount: number;
}

function DemoRing({
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
          className={`lp-ring transition-[stroke-dashoffset,color] duration-500 ${colorClass}`}
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

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("budget");
  const [spent, setSpent] = useState(450_000);
  const [txList, setTxList] = useState<DemoTx[]>([
    { id: 1, title: "Morning Coffee", category: "Food", amount: -28_000 },
    { id: 2, title: "Freelance Payment", category: "Income", amount: 1_200_000 },
    { id: 3, title: "Fuel Top-up", category: "Transport", amount: -35_000 },
  ]);
  const [goalSaved, setGoalSaved] = useState(GOAL_START);

  const nextId = useRef(100);
  const expenseIndex = useRef(0);
  const incomeIndex = useRef(0);

  const percentage = Math.round((spent / DEMO_LIMIT) * 100);
  const remaining = DEMO_LIMIT - spent;

  const tone =
    percentage >= 100
      ? {
        ring: "text-danger",
        text: "text-danger",
        message: "Over budget. Time to rein in spending.",
      }
      : percentage >= 75
        ? {
          ring: "text-amber-500",
          text: "text-amber-500",
          message: "Approaching your budget limit.",
        }
        : {
          ring: "text-success",
          text: "text-success",
          message: "Spending is well under control.",
        };

  const balance = txList.reduce((sum, tx) => sum + tx.amount, 0);
  const goalPercent = Math.min(Math.round((goalSaved / GOAL_TARGET) * 100), 100);
  const goalDone = goalSaved >= GOAL_TARGET;
  const goalMonths = Math.ceil(Math.max(GOAL_TARGET - goalSaved, 0) / 1_000_000);

  const animatedSpent = useCountUp(spent, 500);
  const animatedBalance = useCountUp(balance, 600);
  const animatedGoal = useCountUp(goalSaved, 600);

  const tiltRef = useRef<HTMLDivElement>(null);

  function addTransaction(kind: "expense" | "income") {
    const sample =
      kind === "expense"
        ? EXPENSE_SAMPLES[expenseIndex.current++ % EXPENSE_SAMPLES.length]
        : INCOME_SAMPLES[incomeIndex.current++ % INCOME_SAMPLES.length];

    const signed = kind === "expense" ? -sample.amount : sample.amount;

    nextId.current += 1;

    setTxList((current) =>
      [
        {
          id: nextId.current,
          title: sample.title,
          category: sample.category,
          amount: signed,
        },
        ...current,
      ].slice(0, 5),
    );

    if (kind === "expense" && sample.category === "Food") {
      setSpent((current) => Math.min(current + sample.amount, DEMO_MAX));
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const node = tiltRef.current;

    if (!node || event.pointerType !== "mouse" || prefersReducedMotion()) return;

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.transform = `perspective(1100px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
  }

  function handlePointerLeave() {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }

  const tabIndex = DEMO_TABS.findIndex((tab) => tab.id === activeTab);

  const sliderFill = Math.min((spent / DEMO_MAX) * 100, 100);

  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden="true"
        className="lp-float absolute -left-6 -top-5 z-10 hidden items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur lg:flex"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
          <SvgIcon size={14}>
            <path d="m5 12 5 5L20 7" />
          </SvgIcon>
        </span>
        Food budget on track
      </div>

      <div
        aria-hidden="true"
        className="lp-float-delayed absolute -bottom-5 -right-4 z-10 hidden items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur lg:flex"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SvgIcon size={14}>
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </SvgIcon>
        </span>
        <span className="text-success">+Rp 1.200.000</span>
      </div>

      <div
        ref={tiltRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out will-change-transform sm:p-6"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary opacity-15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-success opacity-10 blur-3xl" />

        <div
          role="tablist"
          aria-label="Pocketa demo"
          className="relative mb-6 grid grid-cols-3 rounded-xl bg-secondary p-1"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(${tabIndex * 100}%)`,
            }}
          />

          {DEMO_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 rounded-lg py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tab.id
                ? "text-foreground"
                : "text-muted hover:text-foreground"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div key={activeTab} className="lp-fade-up relative" role="tabpanel">
          {activeTab === "budget" && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <DemoRing
                  percent={percentage}
                  colorClass={tone.ring}
                  className="h-24 w-24 sm:h-28 sm:w-28"
                >
                  <span className={`text-xl font-extrabold tabular-nums ${tone.text}`}>
                    {percentage}%
                  </span>
                </DemoRing>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Food &amp; Dining · This Month
                  </p>
                  <p className="mt-1 break-words text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
                    {formatRupiah(animatedSpent)}
                  </p>
                  <p className="text-xs text-muted">
                    of {formatRupiah(DEMO_LIMIT)} limit
                  </p>
                </div>
              </div>

              <p className={`text-sm font-semibold ${tone.text}`}>
                {tone.message}{" "}
                <span className="block font-normal text-muted sm:inline">
                  {remaining >= 0
                    ? `${formatRupiah(remaining)} remaining`
                    : `${formatRupiah(Math.abs(remaining))} over budget`}
                </span>
              </p>

              <div className="border-t border-border pt-4">
                <label
                  htmlFor="demo-spent"
                  className="mb-2 block text-xs font-semibold text-foreground"
                >
                  Drag to simulate your spending:
                </label>
                <input
                  id="demo-spent"
                  type="range"
                  min={0}
                  max={DEMO_MAX}
                  step={25_000}
                  value={spent}
                  onChange={(event) => setSpent(Number(event.target.value))}
                  className={`lp-range h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${tone.ring}`}
                  style={{ "--fill": `${sliderFill}%` } as CSSProperties}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "Frugal", value: 300_000 },
                    { label: "Balanced", value: 650_000 },
                    { label: "Indulgent", value: 1_100_000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSpent(preset.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${spent === preset.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Simulated Balance
                  </p>
                  <p
                    className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${balance < 0 ? "text-danger" : "text-foreground"
                      }`}
                  >
                    {formatRupiah(animatedBalance)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addTransaction("expense")}
                    className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 active:scale-95"
                  >
                    + Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => addTransaction("income")}
                    className="rounded-lg border border-success/20 bg-success/5 px-3 py-1.5 text-xs font-semibold text-success transition hover:bg-success/10 active:scale-95"
                  >
                    + Income
                  </button>
                </div>
              </div>

              <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {txList.map((tx) => {
                  const isIncome = tx.amount > 0;

                  return (
                    <li
                      key={tx.id}
                      className="lp-row group flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5 transition hover:bg-secondary"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isIncome
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                          }`}
                      >
                        <SvgIcon size={16}>
                          {isIncome ? (
                            <>
                              <path d="M7 17 17 7" />
                              <path d="M8 7h9v9" />
                            </>
                          ) : (
                            <>
                              <path d="M7 7l10 10" />
                              <path d="M17 8v9H8" />
                            </>
                          )}
                        </SvgIcon>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {tx.title}
                        </p>
                        <p className="text-xs text-muted">{tx.category}</p>
                      </div>

                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${isIncome ? "text-success" : "text-foreground"
                          }`}
                      >
                        {isIncome ? "+" : ""}
                        {formatRupiah(tx.amount)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setTxList((current) =>
                            current.filter((entry) => entry.id !== tx.id),
                          )
                        }
                        aria-label={`Remove ${tx.title}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <SvgIcon size={14}>
                          <path d="M6 6l12 12M18 6 6 18" />
                        </SvgIcon>
                      </button>
                    </li>
                  );
                })}

                {txList.length === 0 && (
                  <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
                    No transactions yet. Try adding one.
                  </li>
                )}
              </ul>
            </div>
          )}

          {activeTab === "goal" && (
            <div className="relative space-y-5">
              {goalDone && (
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  aria-hidden="true"
                >
                  {Array.from({ length: 16 }, (_, index) => (
                    <span
                      key={index}
                      className="lp-confetti absolute -top-3 block rounded-sm"
                      style={{
                        left: `${(index * 61) % 100}%`,
                        width: 6 + (index % 3) * 2,
                        height: 9 + (index % 3) * 3,
                        backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                        animationDelay: `${(index % 6) * 80}ms`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <DemoRing
                  percent={goalPercent}
                  colorClass={goalDone ? "text-success" : "text-primary"}
                  className="h-24 w-24 sm:h-28 sm:w-28"
                >
                  <span
                    className={`text-xl font-extrabold tabular-nums ${goalDone ? "text-success" : "text-foreground"
                      }`}
                  >
                    {goalPercent}%
                  </span>
                </DemoRing>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Goal · New Laptop
                  </p>
                  <p className="mt-1 break-words text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
                    {formatRupiah(animatedGoal)}
                  </p>
                  <p className="text-xs text-muted">
                    of {formatRupiah(GOAL_TARGET)}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5">
                {[25, 50, 75, 100].map((milestone) => (
                  <div key={milestone} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-colors duration-500 ${goalPercent >= milestone ? "bg-primary" : "bg-secondary"
                        }`}
                    />
                    <p
                      className={`mt-1 text-center text-[10px] font-semibold ${goalPercent >= milestone ? "text-primary" : "text-muted"
                        }`}
                    >
                      {milestone}%
                    </p>
                  </div>
                ))}
              </div>

              <p
                className={`text-sm font-semibold ${goalDone ? "text-success" : "text-foreground"
                  }`}
              >
                {goalDone
                  ? "Goal reached. Your new laptop awaits."
                  : `Save Rp 1.000.000 a month and reach your goal in ${goalMonths} ${goalMonths === 1 ? "month" : "months"}.`}
              </p>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={goalDone}
                  onClick={() =>
                    setGoalSaved((current) => Math.min(current + 500_000, GOAL_TARGET))
                  }
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-secondary active:scale-95 disabled:opacity-40"
                >
                  + Rp 500.000
                </button>
                <button
                  type="button"
                  disabled={goalDone}
                  onClick={() =>
                    setGoalSaved((current) => Math.min(current + 1_000_000, GOAL_TARGET))
                  }
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-40"
                >
                  + Rp 1.000.000
                </button>
                <button
                  type="button"
                  onClick={() => setGoalSaved(GOAL_START)}
                  className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatValue({
  prefix,
  value,
  suffix,
  decimals,
  enabled,
}: {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
  enabled: boolean;
}) {
  const animated = useCountUp(enabled ? value : 0, 1400);

  return (
    <p className="text-3xl font-extrabold tabular-nums text-primary sm:text-4xl">
      {prefix}
      {animated.toFixed(decimals)}
      {suffix}
    </p>
  );
}

function StatsSection() {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section
      id="stats"
      className="scroll-mt-20 border-y border-border bg-card/50"
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <StatValue
              prefix={stat.prefix}
              value={stat.value}
              suffix={stat.suffix}
              decimals={stat.decimals}
              enabled={inView}
            />
            <p className="mt-1 text-xs text-muted sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const node = ref.current;

    if (!node) return;

    const rect = node.getBoundingClientRect();

    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl motion-reduce:transform-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-primary opacity-0 transition-opacity duration-300 [mask-image:radial-gradient(240px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] [-webkit-mask-image:radial-gradient(240px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] group-hover:opacity-10"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">Features</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything You Need, Beautifully Simple
        </h2>
        <p className="mt-3 text-muted">
          No complicated spreadsheet formulas. Only the essentials, refined to
          make your financial life effortless.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={(index % 3) * 90}>
            <SpotlightCard className="h-full p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transform-none">
                {feature.icon}
              </div>

              <h3 className="mt-5 text-lg font-bold text-foreground">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">How It Works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Get Started in 3 Simple Steps
          </h2>
          <p className="mt-3 text-muted">
            A refined flow designed to keep you consistent, day after day.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((item, index) => (
            <StepCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({
  item,
  index,
}: {
  item: (typeof steps)[number];
  index: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`lp-reveal group relative overflow-hidden rounded-2xl border border-border bg-background p-7 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl motion-reduce:transform-none ${inView ? "lp-in" : ""
        }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <span className="absolute right-6 top-5 text-5xl font-black text-primary opacity-15 transition-opacity duration-300 group-hover:opacity-30">
        {item.step}
      </span>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transform-none">
        {item.icon}
      </div>

      <h3 className="mt-5 text-xl font-bold text-foreground">{item.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {item.description}
      </p>

      <div className="mt-6 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-[1400ms] ease-out"
          style={{
            width: inView ? "100%" : "0%",
            transitionDelay: `${300 + index * 200}ms`,
          }}
        />
      </div>
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
    >
      <Reveal className="text-center">
        <p className="text-sm font-semibold text-primary">FAQ</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Frequently Asked Questions
        </h2>
      </Reveal>

      <div className="mt-10 space-y-3">
        {faqs.map((faq, index) => {
          const open = openIndex === index;

          return (
            <Reveal key={faq.question} delay={index * 60}>
              <div
                className={`rounded-2xl border bg-card transition-colors duration-300 ${open ? "border-primary/40 shadow-lg" : "border-border"
                  }`}
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {faq.question}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-300 ${open
                        ? "rotate-45 bg-primary text-primary-foreground"
                        : "bg-secondary text-muted"
                        }`}
                    >
                      <SvgIcon size={16}>
                        <path d="M12 5v14M5 12h14" />
                      </SvgIcon>
                    </span>
                  </button>
                </h3>

                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-2xl sm:px-12">
          <span
            aria-hidden="true"
            className="lp-drift pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white opacity-10 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="lp-drift-delayed pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white opacity-10 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="lp-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <h2 className="relative mx-auto max-w-xl text-3xl font-black tracking-tight text-primary-foreground sm:text-4xl">
            Ready to Take Command of Your Finances?
          </h2>

          <p className="relative mx-auto mt-4 max-w-md text-sm text-primary-foreground opacity-90 sm:text-base">
            Create your free account today and discover how effortless
            recording transactions can be, in under a minute.
          </p>

          <Link
            href="/register"
            className="lp-btn relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-xl bg-background px-8 py-3.5 text-base font-bold text-foreground shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95 motion-reduce:transform-none"
          >
            Create Your Free Account
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <style>{`
        @keyframes lp-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes lp-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(30px, 20px) scale(1.08); }
        }
        @keyframes lp-shimmer {
          from { background-position: 0% 50%; }
          to   { background-position: 200% 50%; }
        }
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-row {
          from { opacity: 0; transform: translateX(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes lp-ring {
          from { stroke-dashoffset: var(--ring-from); }
        }
        @keyframes lp-confetti {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to   { transform: translateY(260px) rotate(540deg); opacity: 0; }
        }
        @keyframes lp-sweep {
          from { transform: translateX(0); }
          to   { transform: translateX(520%); }
        }
        @keyframes lp-pop {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .lp-float         { animation: lp-float 5s ease-in-out infinite; }
        .lp-float-delayed { animation: lp-float 6s ease-in-out 1.2s infinite; }
        .lp-drift         { animation: lp-drift 14s ease-in-out infinite; }
        .lp-drift-delayed { animation: lp-drift 18s ease-in-out 2s infinite; }
        .lp-shimmer       { background-size: 200% auto; animation: lp-shimmer 6s linear infinite; }
        .lp-fade-up       { animation: lp-fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lp-row           { animation: lp-row 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lp-ring          { animation: lp-ring 1000ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lp-confetti      { animation: lp-confetti 1800ms cubic-bezier(0.3, 0.6, 0.5, 1) forwards; }
        .lp-sweep         { animation: lp-sweep 5s ease-in-out infinite; }
        .lp-hero-in       { animation: lp-pop 800ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }

        .lp-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 300ms, box-shadow 300ms;
        }
        .lp-reveal.lp-in { opacity: 1; transform: none; }

        .lp-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 700ms ease;
          pointer-events: none;
        }
        .lp-btn:hover::after { transform: translateX(120%); }

        .lp-range {
          background-image: linear-gradient(currentColor, currentColor);
          background-repeat: no-repeat;
          background-size: var(--fill, 0%) 100%;
          transition: color 300ms ease;
        }
        .lp-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 1.25rem;
          width: 1.25rem;
          border-radius: 9999px;
          background: currentColor;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
          transition: transform 150ms ease;
        }
        .lp-range:active::-webkit-slider-thumb { transform: scale(1.15); }
        .lp-range::-moz-range-track { background: transparent; }
        .lp-range::-moz-range-thumb {
          height: 1.25rem;
          width: 1.25rem;
          border-radius: 9999px;
          background: currentColor;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-float, .lp-float-delayed, .lp-drift, .lp-drift-delayed, .lp-shimmer,
          .lp-fade-up, .lp-row, .lp-ring, .lp-confetti, .lp-sweep, .lp-hero-in { animation: none; }
          .lp-reveal { opacity: 1; transform: none; transition: none; }
          .lp-btn::after { display: none; }
          .lp-range { transition: none; }
        }
      `}</style>

      <Navbar />

      <main>
        <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="lp-drift absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary opacity-15 blur-3xl" />
            <div className="lp-drift-delayed absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-success opacity-10 blur-3xl" />
            <div className="absolute inset-0 text-foreground opacity-[0.04] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div
                className="lp-hero-in mb-8 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                style={{ animationDelay: "50ms" }}
              >
                <span className="h-px w-8 bg-primary" aria-hidden="true" />
                <span>Effortless Financial Clarity</span>
              </div>

              <h1
                className="lp-hero-in text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ animationDelay: "120ms" }}
              >
                Command Your Finances Before Your Money{" "}
                <span className="lp-shimmer bg-gradient-to-r from-primary via-success to-primary bg-clip-text text-transparent">
                  Disappears Without a Trace.
                </span>
              </h1>

              <p
                className="lp-hero-in mt-6 max-w-lg text-lg leading-relaxed text-muted"
                style={{ animationDelay: "200ms" }}
              >
                Pocketa brings every wallet, daily transaction, and monthly
                budget together in one refined, intuitive view, so clarity is
                always within reach.
              </p>

              <div
                className="lp-hero-in mt-8"
                style={{ animationDelay: "280ms" }}
              >
                <LandingActions variant="hero" />
              </div>

              <div
                className="lp-hero-in mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted"
                style={{ animationDelay: "360ms" }}
              >
                {["Completely free to use", "No intrusive ads"].map((text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/10 text-success">
                      <SvgIcon size={11}>
                        <path d="m5 12 5 5L20 7" />
                      </SvgIcon>
                    </span>
                    {text}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="lp-hero-in flex justify-center lg:justify-end"
              style={{ animationDelay: "240ms" }}
            >
              <InteractiveDemo />
            </div>
          </div>
        </section>

        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <ClosingCta />
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Image src="/pocketa.png" alt="Pocketa" width={20} height={20} />
            <p className="font-semibold text-foreground">Pocketa</p>
            <span>— Personal Finance, Refined</span>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          >
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Pocketa. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}