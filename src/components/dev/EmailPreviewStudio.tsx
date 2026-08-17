"use client";

import { useMemo, useState } from "react";
import {
  emailPreviewCatalog,
  type EmailPreviewContext,
  type EmailPreviewDefinition,
} from "@/lib/emails/catalog";
import type { EmailTemplate } from "@/lib/emails/types";
import { sendDevTestEmail } from "@/lib/actions/emails";

type PreviewTab = "html" | "text" | "meta";

type BuiltPreview = EmailPreviewDefinition & {
  email: EmailTemplate;
};

export function EmailPreviewStudio({
  siteUrl,
  initialId,
  defaultTestTo = "",
  newsletter,
}: {
  siteUrl: string;
  initialId?: string;
  /** Optional predvyplnený príjemca (napr. BREVO_TEST_TO). */
  defaultTestTo?: string;
  newsletter?: EmailPreviewContext["newsletter"];
}) {
  const previewCtx = useMemo<EmailPreviewContext>(
    () => ({ newsletter }),
    [newsletter],
  );

  const previews = useMemo<BuiltPreview[]>(
    () =>
      emailPreviewCatalog.map((item) => ({
        ...item,
        email: item.build(siteUrl, previewCtx),
      })),
    [siteUrl, previewCtx],
  );

  const fallbackId = previews[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(
    initialId && previews.some((p) => p.id === initialId)
      ? initialId
      : fallbackId,
  );
  const [tab, setTab] = useState<PreviewTab>("html");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [sendOpen, setSendOpen] = useState(false);
  const [testTo, setTestTo] = useState(defaultTestTo);
  const [sendPending, setSendPending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState("");

  const selected =
    previews.find((item) => item.id === selectedId) ?? previews[0] ?? null;

  async function handleSendTest() {
    if (!selected) return;
    setSendError("");
    setSendOk("");
    setSendPending(true);
    const result = await sendDevTestEmail({
      templateId: selected.id,
      to: testTo,
      siteUrl,
    });
    setSendPending(false);

    if (!result.ok) {
      setSendError(result.error);
      return;
    }

    setSendOk(`Odoslané na ${testTo.trim()}.`);
  }

  if (!selected) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white px-6 py-10 text-center text-sm text-[#2f2924]/55">
        Zatiaľ nie sú žiadne e-mailové šablóny.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="border-b border-black/[0.05] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-[#2f2924]/40 uppercase">
            Šablóny
          </p>
          <p className="mt-1 text-sm text-[#2f2924]/55">
            {previews.length} e-mail{previews.length === 1 ? "" : "ov"}
          </p>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {previews.map((item) => {
            const active = item.id === selected.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setTab("html");
                    setSendOpen(false);
                    setSendError("");
                    setSendOk("");
                  }}
                  className={`flex w-full cursor-pointer flex-col gap-1 px-4 py-3.5 text-left transition-colors ${
                    active ? "bg-[#f7f8f4]" : "hover:bg-[#faf8f5]"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      active ? "text-[#75825B]" : "text-[#2f2924]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-xs leading-relaxed text-[#2f2924]/45">
                    {item.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="border-b border-black/[0.05] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold text-[#2f2924]">
                {selected.label}
              </h2>
              <p className="mt-1 text-sm text-[#2f2924]/50">
                {selected.trigger}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["html", "Náhľad"],
                  ["meta", "Meta"],
                  ["text", "Text"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium transition-colors ${
                    tab === id
                      ? "bg-[#75825B] text-white"
                      : "bg-[#f0eee9] text-[#2f2924]/70 hover:bg-[#e8ebe2]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSendOpen((value) => !value);
                  setSendError("");
                  setSendOk("");
                }}
                className={`inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium transition-colors ${
                  sendOpen
                    ? "bg-[#2f2924] text-white"
                    : "border border-[#75825B]/35 bg-[#eef1e8] text-[#5a6648] hover:bg-[#e8ebe2]"
                }`}
              >
                Odoslať test
              </button>
            </div>
          </div>

          {sendOpen ? (
            <div className="mt-4 rounded-xl border border-[#75825B]/20 bg-[#f7f8f4] p-3.5 sm:p-4">
              <p className="text-sm font-medium text-[#2f2924]">
                Testovací e-mail cez Brevo
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#2f2924]/50">
                Pošle aktuálnu šablónu „{selected.label}“ na zadanú adresu.
                Len development.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="dev-test-email"
                    className="mb-1 block text-xs font-medium text-[#2f2924]/55"
                  >
                    Príjemca
                  </label>
                  <input
                    id="dev-test-email"
                    type="email"
                    autoComplete="email"
                    value={testTo}
                    onChange={(event) => {
                      setTestTo(event.target.value);
                      if (sendError) setSendError("");
                      if (sendOk) setSendOk("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendTest();
                      }
                    }}
                    placeholder="vas@email.sk"
                    className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendTest()}
                  disabled={sendPending || !testTo.trim()}
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {sendPending ? "Odosielam…" : "Odoslať"}
                </button>
              </div>
              {sendError ? (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-[#c45c4a]/25 bg-[#f3e8e6] px-3 py-2 text-sm text-[#9a4d3f]"
                >
                  {sendError}
                </p>
              ) : null}
              {sendOk ? (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-[#75825B]/25 bg-[#eef1e8] px-3 py-2 text-sm text-[#5a6648]"
                >
                  {sendOk}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "html" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                  device === "desktop"
                    ? "bg-[#2f2924] text-white"
                    : "bg-[#f0eee9] text-[#2f2924]/65"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                  device === "mobile"
                    ? "bg-[#2f2924] text-white"
                    : "bg-[#f0eee9] text-[#2f2924]/65"
                }`}
              >
                Mobil
              </button>
              <a
                href={`/emails/preview/${selected.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-[#75825B] hover:underline"
              >
                Otvoriť raw HTML ↗
              </a>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 bg-[#efebe4] p-3 sm:p-5">
          {tab === "html" ? (
            <div className="flex h-full justify-center">
              <div
                className={`flex h-[min(78vh,860px)] w-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-[#faf8f5] shadow-[0_16px_40px_rgba(47,41,36,0.12)] transition-[max-width] ${
                  device === "mobile" ? "max-w-[390px]" : "max-w-[720px]"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-black/[0.06] bg-white px-3 py-2">
                  <span className="size-2.5 rounded-full bg-[#e8a09a]" />
                  <span className="size-2.5 rounded-full bg-[#e2c57a]" />
                  <span className="size-2.5 rounded-full bg-[#9bb58a]" />
                  <p className="ml-2 truncate text-[11px] text-[#2f2924]/40">
                    {selected.email.subject}
                  </p>
                </div>
                <iframe
                  title={`Náhľad e-mailu ${selected.label}`}
                  srcDoc={selected.email.html}
                  className="h-full w-full flex-1 bg-white"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>
          ) : null}

          {tab === "meta" ? (
            <div className="mx-auto max-w-2xl space-y-3 rounded-xl border border-black/[0.06] bg-white p-5">
              <MetaRow label="ID" value={selected.email.id} />
              <MetaRow label="Subject" value={selected.email.subject} />
              <MetaRow label="Preheader" value={selected.email.preheader} />
              <MetaRow label="Trigger" value={selected.trigger} />
            </div>
          ) : null}

          {tab === "text" ? (
            <pre className="mx-auto max-w-2xl overflow-auto whitespace-pre-wrap rounded-xl border border-black/[0.06] bg-white p-5 font-sans text-sm leading-relaxed text-[#2f2924]">
              {selected.email.text}
            </pre>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/[0.05] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold tracking-wide text-[#2f2924]/40 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#2f2924]">{value}</p>
    </div>
  );
}
