"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/theme/ThemeProvider";
import { register } from "@/lib/auth";
import { saveAuth } from "@/lib/auth-storage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const RING = 2 * Math.PI * 50;

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "",
  "bg-danger",
  "bg-amber-500",
  "bg-primary",
  "bg-success",
];
const STRENGTH_TEXT = [
  "text-muted",
  "text-danger",
  "text-amber-500",
  "text-primary",
  "text-success",
];

function getPasswordRules(password: string) {
  return [
    { label: "Min. 8 characters", met: password.length >= 8 },
    { label: "Upper & lowercase", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
    { label: "One symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
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
  user: (
    <SvgIcon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </SvgIcon>
  ),
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
  shield: (
    <SvgIcon>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
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
        className={`absolute h-5 w-5 transition-all duration-500 ${darkMode ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
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
          className={`absolute inset-0 rounded-2xl blur-lg transition-opacity duration-300 group-hover:opacity-60 ${onPrimary ? "bg-white opacity-30" : "bg-primary opacity-25"
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
        className={`text-xl font-extrabold tracking-tight ${onPrimary ? "text-primary-foreground" : "text-foreground"
          }`}
      >
        Pocketa
      </span>
    </Link>
  );
}

type FieldProps = {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "email" | "text";
  autoComplete?: string;
  valid?: boolean;
  error?: string;
  delay: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  onBlur?: () => void;
  onKey?: (event: KeyboardEvent<HTMLInputElement>) => void;
  trailing?: ReactNode;
  children?: ReactNode;
};

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  valid,
  error,
  delay,
  inputRef,
  onBlur,
  onKey,
  trailing,
  children,
}: FieldProps) {
  return (
    <div className="lg-rise" style={{ animationDelay: `${delay}ms` }}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="group/field relative mt-2">
        <span
          className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${error ? "text-danger" : "text-muted group-focus-within/field:text-primary"
            }`}
        >
          {icon}
        </span>

        <input
          ref={inputRef}
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyUp={onKey}
          onKeyDown={onKey}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          className={`block w-full rounded-xl border bg-background py-3 pl-11 text-base text-foreground outline-none transition duration-200 placeholder:text-muted/70 focus:ring-4 sm:text-sm ${trailing ? "pr-20" : "pr-11"
            } ${error
              ? "border-danger focus:ring-danger/15"
              : "border-border focus:border-primary focus:ring-primary/15"
            }`}
        />

        {valid && (
          <span
            className={`lg-pop absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-success/15 text-success ${trailing ? "right-12" : "right-4"
              }`}
          >
            {icons.check}
          </span>
        )}

        {trailing}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {children}
    </div>
  );
}

function VisibilityToggle({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-90"
    >
      {shown ? icons.eyeOff : icons.eye}
    </button>
  );
}

type Step = { label: string; done: boolean };

function ShowcasePanel({
  firstName,
  steps,
}: {
  firstName: string;
  steps: Step[];
}) {
  const doneCount = steps.filter((step) => step.done).length;
  const progress = doneCount / steps.length;
  const complete = doneCount === steps.length;

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
          Your money, finally organized in one calm place.
        </h2>

        <p
          className="lg-rise mt-5 max-w-sm text-sm opacity-85 xl:text-base"
          style={{ animationDelay: "300ms" }}
        >
          Signing up takes less than a minute. Fill in the form and watch your
          account take shape.
        </p>

        <div
          aria-hidden="true"
          className="lg-rise relative mt-12 h-[19rem] max-w-md"
          style={{ animationDelay: "450ms" }}
        >
          <div className="lg-float absolute left-0 top-0 w-[19.5rem] rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
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
                    strokeDasharray={RING}
                    strokeDashoffset={RING * (1 - progress)}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
                  {Math.round(progress * 100)}%
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium opacity-80">
                  {complete ? "Ready to use" : "Setting up"}
                </p>
                <p
                  key={firstName}
                  className="lg-rise truncate text-lg font-extrabold"
                  style={{ animationDuration: "400ms" }}
                >
                  {firstName ? `Hi, ${firstName}` : "Hi"}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className={`flex items-center gap-2.5 text-xs transition-opacity duration-300 ${step.done ? "opacity-100" : "opacity-60"
                    }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${step.done ? "scale-100 bg-white text-primary" : "scale-90 bg-white/20"
                      }`}
                  >
                    {step.done && (
                      <span className="lg-pop flex">{icons.check}</span>
                    )}
                  </span>
                  <span className={step.done ? "font-semibold" : ""}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg-float-delayed absolute bottom-0 right-0 w-64 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">Emergency fund</p>
              <p className="text-xs font-bold tabular-nums">62%</p>
            </div>
            <p className="mt-0.5 text-xs opacity-80">
              {formatRupiah(12_500_000)} of {formatRupiah(20_000_000)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="lg-grow h-full w-[62%] origin-left rounded-full bg-white" />
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

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const nameValid = name.trim().length >= 2;
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD;
  const confirmMatches = confirmPassword !== "" && confirmPassword === password;

  const showEmailError = emailTouched && email.trim() !== "" && !emailValid;
  const showConfirmError =
    confirmTouched && confirmPassword !== "" && confirmPassword !== password;

  const rules = getPasswordRules(password);
  const metCount = rules.filter((rule) => rule.met).length;
  const strength = !password ? 0 : !passwordValid ? 1 : Math.max(1, metCount);

  const steps: Step[] = [
    { label: "Enter your name", done: nameValid },
    { label: "Add a valid email", done: emailValid },
    { label: "Create a password", done: passwordValid },
    { label: "Confirm your password", done: passwordValid && confirmMatches },
  ];
  const progress = steps.filter((step) => step.done).length / steps.length;
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  function showError(message: string) {
    setError(message);
    setErrorKey((key) => key + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!nameValid) {
      showError("Please enter your name.");
      nameRef.current?.focus();
      return;
    }

    if (!emailValid) {
      setEmailTouched(true);
      showError("Please enter a valid email address.");
      emailRef.current?.focus();
      return;
    }

    if (!passwordValid) {
      showError(`Password must be at least ${MIN_PASSWORD} characters.`);
      passwordRef.current?.focus();
      return;
    }

    if (password !== confirmPassword) {
      setConfirmTouched(true);
      showError("Passwords do not match.");
      confirmRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      saveAuth(response.data.token, response.data.user);

      setSuccess(true);
      router.push("/dashboard");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed");
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
        @keyframes lg-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
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
        .lg-grow         { animation: lg-grow 1600ms cubic-bezier(0.22, 1, 0.36, 1) 900ms backwards; }
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
          .lg-grow, .lg-shake, .lg-pop { animation: none; }
          .lg-btn::after { display: none; }
        }
      `}</style>

      <ShowcasePanel firstName={firstName} steps={steps} />

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
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-border/50"
              >
                <div
                  className="h-full rounded-r-full bg-gradient-to-r from-primary to-success transition-[width] duration-700 ease-out"
                  style={{ width: `${progress * 100}%` } as CSSProperties}
                />
              </div>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-primary opacity-0 transition-opacity duration-300 [mask-image:radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] [-webkit-mask-image:radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),black,transparent)] group-hover:opacity-[0.07]"
              />

              <div className="relative">
                <h1
                  className="lg-rise text-3xl font-black tracking-tight text-foreground"
                  style={{ animationDelay: "250ms" }}
                >
                  Create account
                </h1>

                <p
                  className="lg-rise mt-2 text-sm text-muted"
                  style={{ animationDelay: "320ms" }}
                >
                  Enter your details below to start managing your finances.
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
                  <Field
                    id="name"
                    label="Name"
                    icon={icons.user}
                    value={name}
                    onChange={setName}
                    inputRef={nameRef}
                    autoComplete="name"
                    placeholder="Your name"
                    valid={nameValid}
                    delay={380}
                  />

                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    inputMode="email"
                    icon={icons.mail}
                    value={email}
                    onChange={setEmail}
                    inputRef={emailRef}
                    onBlur={() => setEmailTouched(true)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    valid={emailValid}
                    error={showEmailError ? "Please enter a valid email address." : undefined}
                    delay={440}
                  />

                  <Field
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    icon={icons.lock}
                    value={password}
                    onChange={setPassword}
                    inputRef={passwordRef}
                    onKey={handleCapsLock}
                    onBlur={() => setCapsLock(false)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    valid={passwordValid}
                    delay={500}
                    trailing={
                      <VisibilityToggle
                        shown={showPassword}
                        onToggle={() => setShowPassword((current) => !current)}
                      />
                    }
                  >
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${password ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pt-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-1 gap-1.5" aria-hidden="true">
                              {[1, 2, 3, 4].map((segment) => (
                                <span
                                  key={segment}
                                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${segment <= strength ? STRENGTH_COLORS[strength] : "bg-border"
                                    }`}
                                />
                              ))}
                            </div>

                            <span
                              className={`w-20 text-right text-xs font-semibold transition-colors ${STRENGTH_TEXT[strength]}`}
                              aria-live="polite"
                            >
                              {passwordValid ? STRENGTH_LABELS[strength] : "Too short"}
                            </span>
                          </div>

                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {rules.map((rule) => (
                              <li
                                key={rule.label}
                                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 ${rule.met
                                    ? "border-success/30 bg-success/10 text-success"
                                    : "border-border text-muted"
                                  }`}
                              >
                                {rule.met && (
                                  <span className="lg-pop flex scale-75">{icons.check}</span>
                                )}
                                {rule.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {capsLock && (
                      <p
                        role="status"
                        className="lg-pop mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-500"
                      >
                        {icons.alert}
                        Caps Lock is on
                      </p>
                    )}
                  </Field>

                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    type={showConfirm ? "text" : "password"}
                    icon={icons.shield}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    inputRef={confirmRef}
                    onKey={handleCapsLock}
                    onBlur={() => {
                      setConfirmTouched(true);
                      setCapsLock(false);
                    }}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    valid={confirmMatches}
                    error={showConfirmError ? "Passwords do not match." : undefined}
                    delay={560}
                    trailing={
                      <VisibilityToggle
                        shown={showConfirm}
                        onToggle={() => setShowConfirm((current) => !current)}
                      />
                    }
                  />

                  <div className="lg-rise" style={{ animationDelay: "620ms" }}>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`lg-btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-primary/30 enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-not-allowed motion-reduce:transform-none ${success
                          ? "bg-success text-white"
                          : "bg-primary text-primary-foreground disabled:opacity-80"
                        }`}
                    >
                      {success ? (
                        <>
                          <span className="lg-pop flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                            {icons.check}
                          </span>
                          Account created!
                        </>
                      ) : loading ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          {icons.arrow}
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p
                  className="lg-rise mt-6 text-center text-sm text-muted"
                  style={{ animationDelay: "700ms" }}
                >
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-primary underline-offset-4 transition hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            <p
              className="lg-rise mt-6 text-center text-xs text-muted lg:hidden"
              style={{ animationDelay: "780ms" }}
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