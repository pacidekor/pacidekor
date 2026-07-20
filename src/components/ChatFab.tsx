"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEMO_MESSAGE =
  "Dobrý deň! Tu bude umelá inteligencia odpovedať na otázky zákazníkov. Táto funkcia je zatiaľ len ukážka a ešte nie je nastavená.";

function AssistantAvatar() {
  return (
    <span
      className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-white"
      aria-hidden
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-[18px]"
      >
        <path
          d="M17.7545 14.0002C18.9966 14.0002 20.0034 15.007 20.0034 16.2491V17.1675C20.0034 17.7409 19.8242 18.2999 19.4908 18.7664C17.9449 20.9296 15.4206 22.0013 12.0004 22.0013C8.5794 22.0013 6.05643 20.9292 4.51427 18.7648C4.18231 18.2989 4.00391 17.7411 4.00391 17.169V16.2491C4.00391 15.007 5.01076 14.0002 6.25278 14.0002H17.7545ZM12.0004 2.00488C14.7618 2.00488 17.0004 4.24346 17.0004 7.00488C17.0004 9.76631 14.7618 12.0049 12.0004 12.0049C9.23894 12.0049 7.00036 9.76631 7.00036 7.00488C7.00036 4.24346 9.23894 2.00488 12.0004 2.00488Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6"
    >
      <div
        id={panelId}
        role="dialog"
        aria-label="Chat asistent"
        aria-hidden={!open}
        className={`absolute right-0 bottom-[calc(100%+0.75rem)] flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-[#75825B] shadow-[0_16px_48px_rgba(45,35,25,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-bottom-right ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3.5 text-white">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold">Chat asistent</p>
            <p className="mt-0.5 text-xs text-white/75">PACIDEKOR</p>
          </div>
          <button
            type="button"
            aria-label="Zavrieť chat"
            onClick={() => setOpen(false)}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-3xl bg-white">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#faf8f5] px-4 py-4">
            <div className="flex items-end gap-2.5">
              <AssistantAvatar />
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-sm leading-relaxed text-[#2f2924] shadow-[0_1px_3px_rgba(45,35,25,0.06)]">
                {DEMO_MESSAGE}
              </div>
            </div>
          </div>

          <div className="border-t border-black/6 bg-white px-3 py-3">
            <div className="flex items-center gap-2 rounded-full border border-black/8 bg-[#faf8f5] px-1.5 py-1.5">
              <input
                type="text"
                disabled
                placeholder="Napíšte správu…"
                aria-label="Napíšte správu"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                disabled
                aria-label="Odoslať správu"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-white opacity-40"
              >
                <Send className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <p className="mt-2 px-1 text-center text-[11px] text-[#2f2924]/40">
              Ukážka – chat ešte nie je aktívny
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={open ? "Zavrieť chat" : "Chat - napíšte nám"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-[#75825B] text-white shadow-[0_8px_24px_rgba(45,35,25,0.22)] transition-[transform,opacity] duration-200 hover:scale-105 hover:opacity-90 active:scale-95"
      >
        {open ? (
          <X className="size-7" strokeWidth={1.75} aria-hidden />
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className="size-7"
          >
            <path
              d="M10.9972 17.4988C10.9972 16.2098 11.3723 15.0085 12.0193 13.9979H6.24934C5.00706 13.9979 4 15.005 4 16.2473V17.1675C4 17.7397 4.17844 18.2976 4.51047 18.7636C5.9132 20.7323 8.12722 21.7976 11.0903 21.9744L11.6119 20.2613C11.2175 19.422 10.9972 18.485 10.9972 17.4988ZM11.9981 2C14.7601 2 16.9991 4.23907 16.9991 7.0011C16.9991 9.76314 14.7601 12.0022 11.9981 12.0022C9.23611 12.0022 6.99707 9.76314 6.99707 7.0011C6.99707 4.23907 9.23611 2 11.9981 2ZM23 17.4988C23 20.537 20.5371 23 17.4989 23C16.5312 23 15.6219 22.7502 14.832 22.3115L12.6449 22.977C12.2621 23.0935 11.9043 22.7357 12.0209 22.3529L12.6866 20.1664C12.2477 19.3763 11.9977 18.4667 11.9977 17.4988C11.9977 14.4605 14.4607 11.9976 17.4989 11.9976C20.5371 11.9976 23 14.4605 23 17.4988ZM15.4985 15.9985C15.2223 15.9985 14.9984 16.2224 14.9984 16.4986C14.9984 16.7748 15.2223 16.9987 15.4985 16.9987H19.4993C19.7755 16.9987 19.9994 16.7748 19.9994 16.4986C19.9994 16.2224 19.7755 15.9985 19.4993 15.9985H15.4985ZM14.9984 18.499C14.9984 18.7752 15.2223 18.9991 15.4985 18.9991H17.4989C17.7751 18.9991 17.999 18.7752 17.999 18.499C17.999 18.2228 17.7751 17.9989 17.4989 17.9989H15.4985C15.2223 17.9989 14.9984 18.2228 14.9984 18.499Z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
