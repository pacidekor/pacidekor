"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { registerRetail } from "@/lib/actions/auth";
import { notifyClientAuthChanged } from "@/lib/client-auth";

const fieldClass =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION_MS = 480;

const STEPS = [
  {
    id: "kontakt",
    title: "Kontakt",
    subtitle: "Ako vás môžeme osloviť a kam poslať potvrdenie.",
    sideTitle: "Začnime kontaktom",
    sideBody: "Meno, e-mail a telefón stačia na založenie účtu.",
  },
  {
    id: "adresa",
    title: "Adresa",
    subtitle: "Dodacia adresa pre vaše objednávky.",
    sideTitle: "Kam doručiť",
    sideBody: "Adresu použijeme pri doručení vašich objednávok.",
  },
  {
    id: "ucet",
    title: "Prístup",
    subtitle: "Nastavte si heslo k zákazníckemu účtu.",
    sideTitle: "Takmer hotovo",
    sideBody: "Po registrácii sa hneď prihlásite a môžete nakupovať.",
  },
] as const;

type FormState = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  password: string;
  passwordConfirm: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  zip: "",
  country: "Slovensko",
  password: "",
  passwordConfirm: "",
};

export function RetailRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(INITIAL);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
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
      if (!data.name.trim()) return "Zadajte meno a priezvisko.";
      if (!data.email.trim()) return "Zadajte e-mail.";
      if (!data.phone.trim()) return "Zadajte telefón.";
    }
    if (step === 1) {
      if (!data.street.trim()) return "Zadajte ulicu.";
      if (!data.city.trim()) return "Zadajte mesto.";
      if (!data.zip.trim()) return "Zadajte PSČ.";
      if (!data.country.trim()) return "Zadajte krajinu.";
    }
    if (step === 2) {
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
    const result = await registerRetail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      street: data.street,
      city: data.city,
      zip: data.zip,
      country: data.country,
      password: data.password,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notifyClientAuthChanged();
    setDone(true);
  }

  function goBack() {
    setError("");
    if (step > 0) {
      setStep((value) => value - 1);
    }
  }

  if (done) {
    return (
      <AuthSplitShell
        sideTitle="Vitajte"
        sideBody="Váš účet je pripravený. Môžete hneď nakupovať."
      >
        <AuthBrandLink />
        <div className="mt-8 animate-[auth-rise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#e8ebe2] text-[#75825B]">
            <Check className="size-5" strokeWidth={2.25} aria-hidden />
          </div>
          <h1 className="mt-5 font-heading text-3xl font-semibold text-[#2f2924]">
            Účet je pripravený
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
            Registrácia prebehla úspešne. Ste prihlásení a môžete pokračovať do
            eshopu alebo do svojho účtu.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.replace("/ucet")}
              className="inline-flex min-h-12 w-full flex-none cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 py-3.5 text-center text-sm leading-none font-medium text-white transition-opacity hover:opacity-90 sm:flex-1"
            >
              Prejsť do môjho účtu
            </button>
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
    <AuthSplitShell sideTitle={current.sideTitle} sideBody={current.sideBody}>
      <div className="mb-6">
        <AuthBrandLink />
        <h1 className="mt-6 font-heading text-3xl font-semibold text-[#2f2924]">
          Registrácia
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
          Pre bežných zákazníkov PACIDEKOR.
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
              <label htmlFor="mo-name" className={labelClass}>
                Meno a priezvisko
              </label>
              <input
                id="mo-name"
                type="text"
                autoComplete="name"
                value={data.name}
                onChange={(event) => patch("name", event.target.value)}
                className={fieldClass}
                placeholder="Meno a priezvisko"
                tabIndex={step === 0 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="mo-email" className={labelClass}>
                E-mail
              </label>
              <input
                id="mo-email"
                type="email"
                autoComplete="email"
                value={data.email}
                onChange={(event) => patch("email", event.target.value)}
                className={fieldClass}
                placeholder="vas@email.sk"
                tabIndex={step === 0 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="mo-phone" className={labelClass}>
                Telefón
              </label>
              <input
                id="mo-phone"
                type="tel"
                autoComplete="tel"
                value={data.phone}
                onChange={(event) => patch("phone", event.target.value)}
                className={fieldClass}
                placeholder="+421 …"
                tabIndex={step === 0 ? 0 : -1}
              />
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
              <label htmlFor="mo-street" className={labelClass}>
                Ulica a číslo
              </label>
              <input
                id="mo-street"
                type="text"
                autoComplete="street-address"
                value={data.street}
                onChange={(event) => patch("street", event.target.value)}
                className={fieldClass}
                placeholder="Ulica 12"
                tabIndex={step === 1 ? 0 : -1}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mo-city" className={labelClass}>
                  Mesto
                </label>
                <input
                  id="mo-city"
                  type="text"
                  autoComplete="address-level2"
                  value={data.city}
                  onChange={(event) => patch("city", event.target.value)}
                  className={fieldClass}
                  tabIndex={step === 1 ? 0 : -1}
                />
              </div>
              <div>
                <label htmlFor="mo-zip" className={labelClass}>
                  PSČ
                </label>
                <input
                  id="mo-zip"
                  type="text"
                  autoComplete="postal-code"
                  value={data.zip}
                  onChange={(event) => patch("zip", event.target.value)}
                  className={fieldClass}
                  tabIndex={step === 1 ? 0 : -1}
                />
              </div>
            </div>
            <div>
              <label htmlFor="mo-country" className={labelClass}>
                Krajina
              </label>
              <input
                id="mo-country"
                type="text"
                autoComplete="country-name"
                value={data.country}
                onChange={(event) => patch("country", event.target.value)}
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
              <label htmlFor="mo-password" className={labelClass}>
                Heslo
              </label>
              <input
                id="mo-password"
                type="password"
                autoComplete="new-password"
                value={data.password}
                onChange={(event) => patch("password", event.target.value)}
                className={fieldClass}
                tabIndex={step === 2 ? 0 : -1}
              />
            </div>
            <div>
              <label htmlFor="mo-password-confirm" className={labelClass}>
                Potvrdenie hesla
              </label>
              <input
                id="mo-password-confirm"
                type="password"
                autoComplete="new-password"
                value={data.passwordConfirm}
                onChange={(event) =>
                  patch("passwordConfirm", event.target.value)
                }
                className={fieldClass}
                tabIndex={step === 2 ? 0 : -1}
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

      <div
        className={`mt-6 flex w-full items-center ${step > 0 ? "gap-3" : ""}`}
      >
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
              ? "Vytváram…"
              : step === total - 1
                ? "Vytvoriť účet"
                : "Pokračovať"}
          </span>
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-[#2f2924]/55">
        Už máte účet?{" "}
        <Link
          href="/prihlasenie"
          className="font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
        >
          Prihláste sa
        </Link>
      </p>
    </AuthSplitShell>
  );
}
