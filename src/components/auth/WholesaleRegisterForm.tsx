"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { EmailVerificationStep } from "@/components/auth/EmailVerificationStep";
import { PasswordField } from "@/components/PasswordField";
import { registerWholesale } from "@/lib/actions/auth";
import {
  companyError,
  emailError,
  icoError,
  phoneError,
  sanitizeCompany,
  sanitizeIco,
  sanitizePhone,
  sanitizeZip,
  zipError,
} from "@/lib/form-validation";
import { birthDateError } from "@/lib/birth-date";
import type { AuthSideSlide } from "@/lib/products";

const fieldClass =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION_MS = 480;

const STEPS = [
  {
    id: "firma",
    title: "O firme",
    subtitle: "Základné firemné údaje pre overenie partnera.",
    sideTitle: "Začnime firmou",
    sideBody: "Potrebujeme údaje o vašej prevádzke alebo spoločnosti.",
  },
  {
    id: "kontakt",
    title: "Kontakt",
    subtitle: "Ako vás môžeme osloviť po overení žiadosti.",
    sideTitle: "Kontaktná osoba",
    sideBody: "E-mail a telefón použijeme na potvrdenie účtu.",
  },
  {
    id: "adresa",
    title: "Adresa",
    subtitle: "Fakturačná / dodacia adresa firmy.",
    sideTitle: "Kde vás nájdeme",
    sideBody: "Adresa pomáha pri veľkoobchodnej spolupráci a doprave.",
  },
  {
    id: "ucet",
    title: "Prístup",
    subtitle: "Nastavte si heslo k veľkoobchodnému účtu.",
    sideTitle: "Takmer hotovo",
    sideBody: "Po odoslaní overíte e-mail. Žiadosť potom skontrolujeme.",
  },
] as const;

type FormState = {
  company: string;
  ico: string;
  dic: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  password: string;
  passwordConfirm: string;
  note: string;
};

const INITIAL: FormState = {
  company: "",
  ico: "",
  dic: "",
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  street: "",
  city: "",
  zip: "",
  country: "Slovensko",
  password: "",
  passwordConfirm: "",
  note: "",
};

export function WholesaleRegisterForm({
  sideSlides = [],
}: {
  sideSlides?: AuthSideSlide[];
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(INITIAL);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "verify" | "done">("form");
  const [pending, setPending] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const current = STEPS[step];
  const total = STEPS.length;

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function measureActivePanel() {
    const el = panelRefs.current[step];
    if (el) setPanelHeight(el.offsetHeight);
  }

  useLayoutEffect(() => {
    measureActivePanel();
  }, [step]);

  useEffect(() => {
    const el = panelRefs.current[step];
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureActivePanel());
    observer.observe(el);
    return () => observer.disconnect();
  }, [step]);

  function validateStep(): string | null {
    if (step === 0) {
      return companyError(data.company) || icoError(data.ico);
    }
    if (step === 1) {
      if (!data.name.trim()) return "Zadajte kontaktnú osobu.";
      return (
        emailError(data.email) ||
        phoneError(data.phone) ||
        birthDateError(data.birthDate)
      );
    }
    if (step === 2) {
      if (!data.street.trim()) return "Zadajte ulicu.";
      if (!data.city.trim()) return "Zadajte mesto.";
      return zipError(data.zip) || (!data.country.trim() ? "Zadajte krajinu." : null);
    }
    if (step === 3) {
      if (data.password.length < 6) return "Heslo musí mať aspoň 6 znakov.";
      if (data.password !== data.passwordConfirm) return "Heslá sa nezhodujú.";
    }
    return null;
  }

  async function goNext() {
    setError("");
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    if (step < total - 1) {
      setStep((value) => value + 1);
      return;
    }

    setPending(true);
    const result = await registerWholesale({
      name: data.name,
      company: data.company,
      ico: data.ico,
      dic: data.dic || undefined,
      email: data.email,
      phone: data.phone,
      street: data.street,
      city: data.city,
      zip: data.zip,
      country: data.country,
      note: data.note || undefined,
      birthDate: data.birthDate || undefined,
      password: data.password,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPhase("verify");
  }

  function goBack() {
    setError("");
    if (step > 0) {
      setStep((value) => value - 1);
    }
  }

  if (phase === "verify") {
    return (
      <EmailVerificationStep
        email={data.email.trim()}
        sideSlides={sideSlides}
        sideTitle="Overenie e-mailu"
        sideBody="Po overení e-mailu žiadosť skontrolujeme a ozveme sa."
        onVerified={() => setPhase("done")}
      />
    );
  }

  if (phase === "done") {
    return (
      <AuthSplitShell
        sideSlides={sideSlides}
        sideTitle="Ďakujeme"
        sideBody="Žiadosť sme prijali. Po overení vám účet aktivujeme."
      >
        <AuthBrandLink />
        <div className="mt-8 animate-[auth-rise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#e8ebe2] text-[#75825B]">
            <Check className="size-5" strokeWidth={2.25} aria-hidden />
          </div>
          <h1 className="mt-5 font-heading text-3xl font-semibold text-[#2f2924]">
            Žiadosť odoslaná
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
            Vašu veľkoobchodnú registráciu overíme a ozveme sa e-mailom. Po
            schválení sa budete môcť prihlásiť.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href="/prihlasenie/velkoobchod"
              className="inline-flex min-h-12 w-full flex-none items-center justify-center rounded-xl bg-[#75825B] px-5 py-3.5 text-center text-sm leading-none font-medium text-white transition-opacity hover:opacity-90 sm:flex-1"
            >
              Prejsť na prihlásenie
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 w-full flex-none items-center justify-center rounded-xl border border-black/10 px-5 py-3.5 text-center text-sm leading-none font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] sm:flex-1"
            >
              Späť na eshop
            </Link>
          </div>
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell
      sideSlides={sideSlides}
      sideTitle={current.sideTitle}
      sideBody={current.sideBody}
    >
      <div className="mb-6">
        <AuthBrandLink />
        <h1 className="mt-6 font-heading text-3xl font-semibold text-[#2f2924]">
          Registrácia
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
          Pre veľkoobchodných partnerov PACIDEKOR.
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase transition-opacity duration-300">
            Krok {step + 1} / {total}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className="h-1.5 rounded-full bg-[#2f2924]/12 transition-[width,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: index === step ? 28 : 10,
                  backgroundColor:
                    index <= step ? "#75825B" : "rgba(47, 41, 36, 0.12)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-4 min-h-[4.25rem] overflow-hidden">
          {STEPS.map((item, index) => {
            const isActive = index === step;
            const offset = isActive ? 0 : index < step ? -22 : 22;
            return (
              <div
                key={item.id}
                aria-hidden={!isActive}
                className="absolute inset-x-0 top-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: `translateX(${offset}px)`,
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#2f2924]/60">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height: panelHeight ?? "auto" }}
      >
        <div
          className="flex items-start will-change-transform"
          style={{
            transform: `translateX(-${step * 100}%)`,
            transition: `transform ${DURATION_MS}ms ${EASE}`,
          }}
        >
          <div
            ref={(node) => {
              panelRefs.current[0] = node;
            }}
            className="w-full min-w-full shrink-0 space-y-4 px-0.5"
            inert={step !== 0}
            aria-hidden={step !== 0}
          >
            <div>
              <label htmlFor="vo-company" className={labelClass}>
                Firma
              </label>
              <input
                id="vo-company"
                type="text"
                autoComplete="organization"
                value={data.company}
                onChange={(event) =>
                  patch("company", sanitizeCompany(event.target.value))
                }
                className={fieldClass}
                placeholder="Názov spoločnosti / prevádzky"
                tabIndex={step === 0 ? 0 : -1}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vo-ico" className={labelClass}>
                  IČO
                </label>
                <input
                  id="vo-ico"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={data.ico}
                  onChange={(event) =>
                    patch("ico", sanitizeIco(event.target.value))
                  }
                  className={fieldClass}
                  placeholder="12345678"
                  tabIndex={step === 0 ? 0 : -1}
                />
              </div>
              <div>
                <label htmlFor="vo-dic" className={labelClass}>
                  DIČ{" "}
                  <span className="font-normal text-[#2f2924]/45">
                    (voliteľné)
                  </span>
                </label>
                <input
                  id="vo-dic"
                  type="text"
                  value={data.dic}
                  onChange={(event) => patch("dic", event.target.value)}
                  className={fieldClass}
                  placeholder="SK1234567890"
                  tabIndex={step === 0 ? 0 : -1}
                />
              </div>
            </div>
          </div>

          <div
            ref={(node) => {
              panelRefs.current[1] = node;
            }}
            className="w-full min-w-full shrink-0 space-y-4 px-0.5"
            inert={step !== 1}
            aria-hidden={step !== 1}
          >
            <div>
              <label htmlFor="vo-name" className={labelClass}>
                Kontaktná osoba
              </label>
              <input
                id="vo-name"
                type="text"
                autoComplete="name"
                value={data.name}
                onChange={(event) => patch("name", event.target.value)}
                className={fieldClass}
                placeholder="Meno a priezvisko"
                tabIndex={step === 1 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="vo-email" className={labelClass}>
                E-mail
              </label>
              <input
                id="vo-email"
                type="email"
                autoComplete="email"
                value={data.email}
                onChange={(event) => patch("email", event.target.value)}
                className={fieldClass}
                placeholder="firma@email.sk"
                tabIndex={step === 1 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="vo-phone" className={labelClass}>
                Telefón
              </label>
              <input
                id="vo-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={data.phone}
                onChange={(event) =>
                  patch("phone", sanitizePhone(event.target.value))
                }
                className={fieldClass}
                placeholder="421901234567"
                tabIndex={step === 1 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="vo-birth" className={labelClass}>
                Dátum narodenia{" "}
                <span className="font-normal text-[#2f2924]/40">(voliteľné)</span>
              </label>
              <input
                id="vo-birth"
                type="date"
                autoComplete="bday"
                value={data.birthDate}
                onChange={(event) => patch("birthDate", event.target.value)}
                className={fieldClass}
                tabIndex={step === 1 ? 0 : -1}
              />
            </div>
          </div>

          <div
            ref={(node) => {
              panelRefs.current[2] = node;
            }}
            className="w-full min-w-full shrink-0 space-y-4 px-0.5"
            inert={step !== 2}
            aria-hidden={step !== 2}
          >
            <div>
              <label htmlFor="vo-street" className={labelClass}>
                Ulica a číslo
              </label>
              <input
                id="vo-street"
                type="text"
                autoComplete="street-address"
                value={data.street}
                onChange={(event) => patch("street", event.target.value)}
                className={fieldClass}
                placeholder="Ulica 12"
                tabIndex={step === 2 ? 0 : -1}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vo-city" className={labelClass}>
                  Mesto
                </label>
                <input
                  id="vo-city"
                  type="text"
                  autoComplete="address-level2"
                  value={data.city}
                  onChange={(event) => patch("city", event.target.value)}
                  className={fieldClass}
                  tabIndex={step === 2 ? 0 : -1}
                />
              </div>
              <div>
                <label htmlFor="vo-zip" className={labelClass}>
                  PSČ
                </label>
                <input
                  id="vo-zip"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  autoComplete="postal-code"
                  value={data.zip}
                  onChange={(event) =>
                    patch("zip", sanitizeZip(event.target.value))
                  }
                  className={fieldClass}
                  placeholder="81102"
                  tabIndex={step === 2 ? 0 : -1}
                />
              </div>
            </div>
            <div>
              <label htmlFor="vo-country" className={labelClass}>
                Krajina
              </label>
              <input
                id="vo-country"
                type="text"
                autoComplete="country-name"
                value={data.country}
                onChange={(event) => patch("country", event.target.value)}
                className={fieldClass}
                tabIndex={step === 2 ? 0 : -1}
              />
            </div>
          </div>

          <div
            ref={(node) => {
              panelRefs.current[3] = node;
            }}
            className="w-full min-w-full shrink-0 space-y-4 px-0.5"
            inert={step !== 3}
            aria-hidden={step !== 3}
          >
            <div>
              <label htmlFor="vo-password" className={labelClass}>
                Heslo
              </label>
              <PasswordField
                id="vo-password"
                autoComplete="new-password"
                value={data.password}
                onChange={(event) => patch("password", event.target.value)}
                className={fieldClass}
                tabIndex={step === 3 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="vo-password-confirm" className={labelClass}>
                Potvrdenie hesla
              </label>
              <PasswordField
                id="vo-password-confirm"
                autoComplete="new-password"
                value={data.passwordConfirm}
                onChange={(event) =>
                  patch("passwordConfirm", event.target.value)
                }
                className={fieldClass}
                tabIndex={step === 3 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="vo-note" className={labelClass}>
                Poznámka{" "}
                <span className="font-normal text-[#2f2924]/45">
                  (voliteľné)
                </span>
              </label>
              <textarea
                id="vo-note"
                rows={3}
                value={data.note}
                onChange={(event) => patch("note", event.target.value)}
                className="min-h-[5rem] w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15"
                placeholder="Napr. typ odberu, sortiment…"
                tabIndex={step === 3 ? 0 : -1}
              />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 animate-[auth-rise_0.35s_cubic-bezier(0.22,1,0.36,1)_both] rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]"
        >
          {error}
        </p>
      ) : null}

      <div className={`mt-6 flex w-full items-center ${step > 0 ? "gap-3" : ""}`}>
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Späť
          </button>
        ) : null}
        <button
          type="button"
          onClick={goNext}
          disabled={pending}
          className="inline-flex h-12 w-full min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-[opacity,transform] duration-300 hover:opacity-90 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
          <span
            key={step === total - 1 ? "submit" : "next"}
            className="animate-[auth-rise_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            {pending
              ? "Odosielam…"
              : step === total - 1
                ? "Odoslať žiadosť"
                : "Pokračovať"}
          </span>
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-[#2f2924]/55">
        Už máte účet?{" "}
        <Link
          href="/prihlasenie/velkoobchod"
          className="font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
        >
          Prihláste sa
        </Link>
      </p>
    </AuthSplitShell>
  );
}
