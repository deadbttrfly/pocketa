"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/theme/ThemeProvider";
import { login } from "@/lib/auth";
import { saveAuth } from "@/lib/auth-storage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function useCountUp(target: number, duration = 1600, delay = 400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduceMotion
        ? 1
        : Math.min(Math.max((now - startedAt - delay) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(target * eased);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const icons = {
  mail: (
    <SvgIcon>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </SvgIcon>
  ),
  lock: (
    <SvgIcon>
      <rect x="4" y="11" width="16" height="10" rx="3" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </SvgIcon>
  ),
  eye: (
    <SvgIcon>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  ),
  eyeOff: (
    <SvgIcon>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
      <path d="M6.6 6.7A17.2 17.2 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </SvgIcon>
  ),
  check: (
    <SvgIcon size={16}>
      <path d="m5 12 5 5L20 7" />
    </SvgIcon>
  ),
  alert: (
    <SvgIcon size={18}>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  ),
  arrow: (
    <SvgIcon size={18}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  ),
};

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70 text-foreground backdrop-blur transition hover:bg-secondary active:scale-90"
    >
      <svg
        className={`absolute h-5 w-5 text-amber-400 transition-all duration-500 ${
          darkMode ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
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
        className={`absolute h-5 w-5 transition-all duration-500 ${
          darkMode ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
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

function BrandMark({ onPrimary = false }: { onPrimary?: boolean }) {
  return (
    <Link href="/" aria-label="Pocketa home" className="group inline-flex items-center gap-3">
      <span className="relative block h-11 w-11 shrink-0">
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-2xl blur-lg transition-opacity duration-300 group-hover:opacity-60 ${
            onPrimary ? "bg-white opacity-30" : "bg-primary opacity-25"
          }`}
        />
        <span className="relative block h-full w-full rounded-2xl bg-gradient-to-br from-primary to-success p-px shadow-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 motion-reduce:transition-none">
          <span className="relative block h-full w-full overflow-hidden rounded-[15px] bg-card">
            <Image
              src="/pocketa.png"
              alt=""
              fill
              sizes="44px"
              priority
              className="object-contain p-1.5"
            />
          </span>
        </span>
      </span>

      <span
        className={`text-xl font-extrabold tracking-tight ${
          onPrimary ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        Pocketa
      </span>
    </Link>
  );
}

const highlights = [
  "All your accounts in one clear view",
  "Budgets that warn you before you overspend",
  "Goals and reports that keep your finances on track",
];

function ShowcasePanel() {
  const balance = useCountUp(47_450_000);

  return (
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="lg-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl" />
        <div className="lg-drift-slow absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-white opacity-10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="lg-rise relative" style={{ animationDelay: "100ms" }}>
        <BrandMark onPrimary />
      </div>

      <div className="relative">
        <h2
          className="lg-rise max-w-md text-4xl font-black leading-[1.12] tracking-tight xl:text-5xl"
          style={{ animationDelay: "200ms" }}
        >
          Take control of every rupiah.
        </h2>

        <ul className="mt-8 space-y-3.5">
          {highlights.map((item, index) => (
            <li
              key={item}
              className="lg-rise flex items-center gap-3 text-sm opacity-90 xl:text-base"
              style={{ animationDelay: `${320 + index * 100}ms` }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                {icons.check}
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div
          aria-hidden="true"
          className="lg-rise relative mt-12 h-64 max-w-md"
          style={{ animationDelay: "650ms" }}
        >
          <div className="lg-float absolute left-0 top-0 w-72 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-medium opacity-80">Total Balance</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {formatRupiah(balance)}
            </p>

            <svg viewBox="0 0 160 48" className="mt-3 h-12 w-full" fill="none">
              <path
                d="M0 40 C 20 38, 30 20, 50 24 S 80 10, 100 14 S 130 6, 160 4"
                pathLength={1}
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="lg-draw"
              />
            </svg>
          </div>

          <div className="lg-float-delayed absolute bottom-0 right-0 flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * 0.2}
                  className="lg-ring"
                  style={{ "--ring-from": 2 * Math.PI * 50 } as CSSProperties}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                80%
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold">Food &amp; Drink</p>
              <p className="text-xs opacity-80">Budget almost used up</p>
            </div>
          </div>
        </div>
      </div>

      <p className="relative text-xs opacity-70" suppressHydrationWarning>
        © {new Date().getFullYear()} Pocketa. All rights reserved.
      </p>
    </aside>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const showEmailError = emailTouched && email.trim() !== "" && !emailValid;

  function showError(message: string) {
    setError(message);
    setErrorKey((key) => key + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!emailValid) {
      setEmailTouched(true);
      showError("Please enter a valid email address.");
      emailRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      saveAuth(response.data.token, response.data.user);

      setSuccess(true);
      router.push("/dashboard");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  function handleCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const node = cardRef.current;

    if (!node) return;

    const rect = node.getBoundingClientRect();

    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  const inputBase =
    "block w-full rounded-xl border bg-background py-3 pl-11 text-base text-foreground outline-none transition duration-200 placeholder:text-muted/70 focus:ring-4 sm:text-sm";

  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <style>{`
        @keyframes lg-rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lg-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes lg-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(40px, 24px) scale(1.1); }
        }
        @keyframes lg-draw {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes lg-ring {
          from { stroke-dashoffset: var(--ring-from); }
        }
        @keyframes lg-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes lg-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          70%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        .lg-rise         { animation: lg-rise 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lg-float        { animation: lg-float 6s ease-in-out infinite; }
        .lg-float-delayed{ animation: lg-float 7s ease-in-out 1.5s infinite; }
        .lg-drift        { animation: lg-drift 16s ease-in-out infinite; }
        .lg-drift-slow   { animation: lg-drift 22s ease-in-out 2s infinite; }
        .lg-draw         { stroke-dasharray: 1; animation: lg-draw 1800ms cubic-bezier(0.22, 1, 0.36, 1) 700ms backwards; }
        .lg-ring         { animation: lg-ring 1600ms cubic-bezier(0.22, 1, 0.36, 1) 700ms backwards; }
        .lg-shake        { animation: lg-shake 450ms ease-in-out; }
        .lg-pop          { animation: lg-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }

        .lg-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 700ms ease;
          pointer-events: none;
        }
        .lg-btn:hover::after { transform: translateX(120%); }

        @media (prefers-reduced-motion: reduce) {
          .lg-rise, .lg-float, .lg-float-delayed, .lg-drift, .lg-drift-slow,
          .lg-draw, .lg-ring, .lg-shake, .lg-pop { animation: none; }
          .lg-btn::after { display: none; }
        }
      `}</style>

      <ShowcasePanel />

      <section className="relative flex flex-col px-4 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="lg-drift absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary opacity-10 blur-3xl" />
          <div className="lg-drift-slow absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-success opacity-5 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="lg:invisible">
            <BrandMark />
          </div>
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              className="lg-rise group relative overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
              style={{ animationDelay: "150ms" }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-primary opacity-0 transition-opacity duration-300 [mask-image:radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] [-webkit-mask-image:radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] group-hover:opacity-[0.07]"
              />

              <div className="relative">
                <h1
                  className="lg-rise text-3xl font-black tracking-tight text-foreground"
                  style={{ animationDelay: "250ms" }}
                >
                  Welcome back
                </h1>

                <p
                  className="lg-rise mt-2 text-sm text-muted"
                  style={{ animationDelay: "320ms" }}
                >
                  Sign in to manage your finances. Enter your account details below.
                </p>

                {error && (
                  <div
                    key={errorKey}
                    role="alert"
                    className="lg-shake mt-6 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4"
                  >
                    <span className="mt-0.5 shrink-0 text-danger">{icons.alert}</span>
                    <p className="text-sm font-medium text-danger">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                  <div className="lg-rise" style={{ animationDelay: "400ms" }}>
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email
                    </label>

                    <div className="group/field relative mt-2">
                      <span
                        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                          showEmailError
                            ? "text-danger"
                            : "text-muted group-focus-within/field:text-primary"
                        }`}
                      >
                        {icons.mail}
                      </span>

                      <input
                        ref={emailRef}
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        required
                        aria-invalid={showEmailError}
                        aria-describedby={showEmailError ? "email-error" : undefined}
                        placeholder="you@example.com"
                        className={`${inputBase} pr-11 ${
                          showEmailError
                            ? "border-danger focus:ring-danger/15"
                            : "border-border focus:border-primary focus:ring-primary/15"
                        }`}
                      />

                      {emailValid && (
                        <span className="lg-pop absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-success/15 text-success">
                          {icons.check}
                        </span>
                      )}
                    </div>

                    {showEmailError && (
                      <p id="email-error" className="mt-1.5 text-xs font-medium text-danger">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>

                  <div className="lg-rise" style={{ animationDelay: "470ms" }}>
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>

                    <div className="group/field relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within/field:text-primary">
                        {icons.lock}
                      </span>

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyUp={handleCapsLock}
                        onKeyDown={handleCapsLock}
                        onBlur={() => setCapsLock(false)}
                        required
                        placeholder="••••••••"
                        className={`${inputBase} border-border pr-12 focus:border-primary focus:ring-primary/15`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
                      >
                        {showPassword ? icons.eyeOff : icons.eye}
                      </button>
                    </div>

                    {capsLock && (
                      <p
                        role="status"
                        className="lg-pop mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-500"
                      >
                        {icons.alert}
                        Caps Lock is on
                      </p>
                    )}
                  </div>

                  <div className="lg-rise" style={{ animationDelay: "540ms" }}>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`lg-btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-primary/30 enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-not-allowed motion-reduce:transform-none ${
                        success
                          ? "bg-success text-white"
                          : "bg-primary text-primary-foreground disabled:opacity-80"
                      }`}
                    >
                      {success ? (
                        <>
                          <span className="lg-pop flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                            {icons.check}
                          </span>
                          Welcome back!
                        </>
                      ) : loading ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                            {icons.arrow}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p
                  className="lg-rise mt-6 text-center text-sm text-muted"
                  style={{ animationDelay: "620ms" }}
                >
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-primary underline-offset-4 transition hover:underline"
                  >
                    Sign up now
                  </Link>
                </p>
              </div>
            </div>

            <p
              className="lg-rise mt-6 text-center text-xs text-muted lg:hidden"
              style={{ animationDelay: "700ms" }}
              suppressHydrationWarning
            >
              © {new Date().getFullYear()} Pocketa
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}