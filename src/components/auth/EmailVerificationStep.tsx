"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import {
  resendEmailVerifyCodeAction,
  verifyEmailCodeAction,
} from "@/lib/actions/auth";
import {
  EMAIL_VERIFY_CODE_LENGTH,
  EMAIL_VERIFY_RESEND_SECONDS,
  normalizeEmailVerifyCode,
} from "@/lib/email-verification";
import type { AuthSideSlide } from "@/lib/products";

const CODE_LENGTH = EMAIL_VERIFY_CODE_LENGTH;

const digitClass =
  "aspect-square min-w-0 flex-1 rounded-xl border border-black/10 bg-white text-center font-heading text-2xl font-semibold text-[#2f2924] outline-none transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

type EmailVerificationStepProps = {
  email: string;
  sideSlides?: AuthSideSlide[];
  sideTitle?: string;
  sideBody?: string;
  onVerified: () => void;
};

export function EmailVerificationStep({
  email,
  sideSlides = [],
  sideTitle = "Overenie e-mailu",
  sideBody = "Poslali sme vám kód. Zadajte ho sem a dokončite registráciu.",
  onVerified,
}: EmailVerificationStepProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(
    EMAIL_VERIFY_RESEND_SECONDS,
  );
  const [resendFlash, setResendFlash] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!resendFlash) return;
    const timer = window.setTimeout(() => setResendFlash(null), 2500);
    return () => window.clearTimeout(timer);
  }, [resendFlash]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  }

  function applyDigits(next: string[], focusAt?: number) {
    setDigits(next);
    if (error) setError("");
    if (typeof focusAt === "number") {
      requestAnimationFrame(() => focusIndex(focusAt));
    }
  }

  function setDigitAt(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    applyDigits(next, digit ? index + 1 : index);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = normalizeEmailVerifyCode(event.clipboardData.getData("text"));
    if (!pasted) return;

    const next = Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? "");
    applyDigits(next, Math.min(pasted.length, CODE_LENGTH - 1));
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        applyDigits(next, index);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        applyDigits(next, index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex(index + 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  async function handleSubmit() {
    setError("");
    const normalized = normalizeEmailVerifyCode(code);
    if (normalized.length !== CODE_LENGTH) {
      setError("Zadajte 5-miestny kód z e-mailu.");
      return;
    }

    setPending(true);
    const result = await verifyEmailCodeAction({ email, code: normalized });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onVerified();
  }

  async function handleResend() {
    if (resendSeconds > 0) return;
    setError("");
    setPending(true);
    const result = await resendEmailVerifyCodeAction(email);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    setResendSeconds(EMAIL_VERIFY_RESEND_SECONDS);
    setResendFlash("Nový kód sme odoslali na váš e-mail.");
    requestAnimationFrame(() => focusIndex(0));
  }

  return (
    <AuthSplitShell
      sideSlides={sideSlides}
      sideTitle={sideTitle}
      sideBody={sideBody}
    >
      <AuthBrandLink />
      <div className="mt-8 animate-[auth-rise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
        <h1 className="font-heading text-3xl font-semibold text-[#2f2924]">
          Overte svoj e-mail
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
          Na adresu{" "}
          <span className="font-medium text-[#2f2924]">{email}</span> sme
          poslali 5-miestny kód. Zadajte ho nižšie.
        </p>

        <div className="mt-8">
          <p
            id="email-verify-code-label"
            className="mb-1.5 block text-sm font-medium text-[#2f2924]"
          >
            Overovací kód
          </p>
          <div
            role="group"
            aria-labelledby="email-verify-code-label"
            className="flex w-full gap-2 sm:gap-3"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                aria-label={`Číslica ${index + 1} z ${CODE_LENGTH}`}
                aria-invalid={Boolean(error)}
                onChange={(event) => setDigitAt(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                onFocus={(event) => event.target.select()}
                className={digitClass}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[#2f2924]/40">
            Kód platí 15&nbsp;minút. Ak e-mail nepríde, skontrolujte spam.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]"
          >
            {error}
          </p>
        ) : null}

        {resendFlash ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-[#75825B]/20 bg-[#e8ebe2] px-3.5 py-2.5 text-sm text-[#5a6648]"
          >
            {resendFlash}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={pending || code.length !== CODE_LENGTH}
          className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? "Overujem…" : "Overiť a pokračovať"}
        </button>

        <div className="mt-5 text-center text-sm text-[#2f2924]/55">
          {resendSeconds > 0 ? (
            <p>
              Nový kód môžete poslať o{" "}
              <span className="font-medium tabular-nums text-[#2f2924]">
                {resendSeconds}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={pending}
              className="cursor-pointer font-medium text-[#75825B] transition-colors hover:text-[#5f6a49] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Poslať kód znova
            </button>
          )}
        </div>
      </div>
    </AuthSplitShell>
  );
}
