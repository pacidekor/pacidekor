"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, Plus, Send, Trash2, X } from "lucide-react";
import { CHAT_SUGGESTIONS } from "@/lib/chat/config";
import {
  ChatRichText,
  hrefsInChatText,
} from "@/components/chat/ChatRichText";
import {
  createConversationId,
  deleteConversation,
  getActiveConversationId,
  loadConversations,
  setActiveConversationId,
  titleFromUserMessage,
  upsertConversation,
  type StoredConversation,
} from "@/lib/chat/history";

type ChatProductCard = {
  id: string;
  slug: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  image: string;
  category: string;
  href: string;
  colorId?: string;
  inStock?: boolean;
  availableColors?: string[];
};

type ChatLink = {
  label: string;
  href: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ChatProductCard[];
  links?: ChatLink[];
};

type PanelView = "chat" | "history";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Dobrý deň! Som asistent PACIDEKOR. Pomôžem vám s výberom kvetov, dekorácií, akcií, dopravou aj kontaktom. Vyberte tip nižšie alebo napíšte otázku.",
};

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

function ProductCards({ products }: { products: ChatProductCard[] }) {
  if (products.length === 0) return null;

  return (
    <ul className="mt-2 flex w-full flex-col gap-2 pl-[2.625rem]">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={product.href}
            className="flex gap-3 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(45,35,25,0.06)] transition-opacity hover:opacity-90"
          >
            <span className="relative size-16 shrink-0 overflow-hidden bg-[#f0ebe3]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1 py-2 pr-3">
              <span className="line-clamp-2 text-xs font-medium leading-snug text-[#2f2924]">
                {product.name}
              </span>
              <span className="mt-1 flex flex-wrap items-baseline gap-1.5 text-xs">
                <span className="font-semibold text-[#75825B]">
                  {product.price}
                </span>
                {product.originalPrice ? (
                  <span className="text-[#2f2924]/40 line-through">
                    {product.originalPrice}
                  </span>
                ) : null}
                {product.discount ? (
                  <span className="font-medium text-[#a05a3c]">
                    −{product.discount}&nbsp;%
                  </span>
                ) : null}
                {product.inStock === false ? (
                  <span className="font-medium text-[#a05a3c]">Vypredané</span>
                ) : (
                  <span className="text-[#2f2924]/45">Skladom</span>
                )}
              </span>
              {product.availableColors && product.availableColors.length > 0 ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-[#2f2924]/45">
                  {product.availableColors.slice(0, 4).join(" · ")}
                  {product.availableColors.length > 4 ? "…" : ""}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ChatLinkButtons({
  links,
  content,
}: {
  links?: ChatLink[];
  content: string;
}) {
  if (!links?.length) return null;
  const inline = hrefsInChatText(content);
  const visible = links.filter(
    (link) =>
      link.href.startsWith("/") &&
      !link.href.startsWith("//") &&
      !inline.has(link.href),
  );
  if (visible.length === 0) return null;

  return (
    <div className="mt-2 flex w-full flex-col gap-1.5 pl-[2.625rem]">
      {visible.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex w-fit max-w-full items-center rounded-full border border-[#75825B]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#75825B] shadow-[0_1px_3px_rgba(45,35,25,0.04)] transition-colors hover:border-[#75825B]/55 hover:bg-[#75825B]/8"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function formatHistoryDate(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("sk-SK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("PACIDEKOR asistent");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [input, setInput] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);
  const messagesRef = useRef(messages);
  const conversationIdRef = useRef(conversationId);
  const chatTitleRef = useRef(chatTitle);

  messagesRef.current = messages;
  conversationIdRef.current = conversationId;
  chatTitleRef.current = chatTitle;

  const showSuggestions = useMemo(() => {
    const real = messages.filter((message) => message.id !== "welcome");
    return !sending && real.length === 0;
  }, [messages, sending]);

  function refreshHistoryList() {
    setConversations(loadConversations());
  }

  function persistCurrentChat(
    nextMessages: ChatMessage[],
    nextTitle: string,
    id: string,
  ) {
    const meaningful = nextMessages.filter((message) => message.id !== "welcome");
    if (meaningful.length === 0) return;
    upsertConversation({
      id,
      title: nextTitle,
      updatedAt: Date.now(),
      messages: meaningful,
    });
    setActiveConversationId(id);
    refreshHistoryList();
  }

  function startNewChat() {
    setConversationId(null);
    setActiveConversationId(null);
    setChatTitle("PACIDEKOR asistent");
    setMessages([WELCOME]);
    setError(null);
    setView("chat");
  }

  function openConversation(conversation: StoredConversation) {
    setConversationId(conversation.id);
    setActiveConversationId(conversation.id);
    setChatTitle(conversation.title);
    setMessages([WELCOME, ...conversation.messages]);
    setError(null);
    setView("chat");
  }

  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    const activeId = getActiveConversationId();
    if (!activeId) return;
    const active = stored.find((item) => item.id === activeId);
    if (!active) return;
    setConversationId(active.id);
    setChatTitle(active.title);
    setMessages([WELCOME, ...active.messages]);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (view === "history") setView("chat");
        else setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, view]);

  useEffect(() => {
    if (!open || view !== "chat") return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, view]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || view !== "chat") return;

    if (pendingScrollRef.current && anchorRef.current) {
      pendingScrollRef.current = false;
      const top = anchorRef.current.offsetTop - list.offsetTop - 8;
      list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }

    if (sending) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, sending, open, view]);

  async function sendMessage(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!text || sending) return;

    setError(null);
    setInput("");
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSending(true);

    let id = conversationId;
    if (!id) {
      id = createConversationId();
      setConversationId(id);
      setActiveConversationId(id);
    }

    const provisionalTitle =
      chatTitle === "PACIDEKOR asistent"
        ? titleFromUserMessage(text)
        : chatTitle;
    if (provisionalTitle !== chatTitle) {
      setChatTitle(provisionalTitle);
    }
    persistCurrentChat(nextMessages, provisionalTitle, id);

    try {
      const history = nextMessages
        .filter((message) => message.id !== "welcome")
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, honeypot }),
      });

      const data = (await response.json()) as {
        reply?: string;
        products?: ChatProductCard[];
        links?: ChatLink[];
        title?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "Nepodarilo sa odoslať správu.");
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Prepáčte, skúste to prosím znova.",
        products: data.products ?? [],
        links: data.links ?? [],
      };
      const withReply = [...nextMessages, assistantMessage];
      const nextTitle = data.title?.trim() || provisionalTitle;

      pendingScrollRef.current = true;
      setMessages(withReply);
      setChatTitle(nextTitle);
      persistCurrentChat(withReply, nextTitle, id);
    } catch {
      setError("Spojenie zlyhalo. Skontrolujte internet a skúste znova.");
    } finally {
      setSending(false);
    }
  }

  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.id !== "welcome")
    ?.id;

  const headerTitle =
    view === "history" ? "História chatov" : chatTitle;

  return (
    <div
      ref={wrapRef}
      className="fixed right-4 bottom-4 z-[60] sm:right-6 sm:bottom-6"
    >
      <div
        id={panelId}
        role="dialog"
        aria-label="PACIDEKOR asistent"
        aria-hidden={!open}
        className={`absolute right-0 bottom-[calc(100%+0.75rem)] flex h-[min(32rem,78vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-[#75825B] shadow-[0_0_0_1px_rgba(45,35,25,0.16),0_0_28px_rgba(45,35,25,0.18),0_14px_36px_rgba(45,35,25,0.2)] outline-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-bottom-right sm:h-[min(35rem,82vh)] ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="relative flex h-14 shrink-0 items-center justify-center bg-[#75825B] px-12">
          {view === "chat" ? (
            <button
              type="button"
              aria-label="História chatov"
              onClick={() => {
                const id = conversationIdRef.current;
                const msgs = messagesRef.current;
                if (id && msgs.some((m) => m.id !== "welcome")) {
                  persistCurrentChat(msgs, chatTitleRef.current, id);
                }
                refreshHistoryList();
                setView("history");
              }}
              className="absolute left-2 top-1/2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          <p className="min-w-0 truncate text-center font-heading text-base font-normal tracking-wide text-white">
            {headerTitle}
          </p>
        </div>

        {view === "history" ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[#faf8f5]">
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {conversations.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-[#2f2924]/45">
                  Zatiaľ žiadna história. Začnite nový chat.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <div className="group relative rounded-2xl bg-white shadow-[0_1px_3px_rgba(45,35,25,0.06)] transition-colors hover:bg-[#75825B]/6">
                        <button
                          type="button"
                          onClick={() => openConversation(conversation)}
                          className="w-full cursor-pointer px-3.5 py-3 pr-11 text-left"
                        >
                          <p className="truncate text-sm font-medium text-[#2f2924]">
                            {conversation.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#2f2924]/40">
                            {formatHistoryDate(conversation.updatedAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          aria-label="Zmazať chat"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteConversation(conversation.id);
                            if (conversationId === conversation.id) {
                              startNewChat();
                            }
                            refreshHistoryList();
                          }}
                          className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/35 transition-colors hover:bg-black/6 hover:text-[#a05a3c]"
                        >
                          <Trash2
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-black/6 bg-white px-3 py-3">
              <button
                type="button"
                onClick={startNewChat}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#75825B] px-3 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" strokeWidth={1.75} aria-hidden />
                Nový chat
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div
              ref={listRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#faf8f5] px-4 py-4"
            >
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#75825B] px-3.5 py-3 text-sm leading-relaxed text-white">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    ref={
                      message.id === lastAssistantId ? anchorRef : undefined
                    }
                    className="flex flex-col gap-0"
                  >
                    <div className="flex items-end gap-2.5">
                      <AssistantAvatar />
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-sm leading-relaxed text-[#2f2924] shadow-[0_1px_3px_rgba(45,35,25,0.06)]">
                        <ChatRichText text={message.content} />
                      </div>
                    </div>
                    {message.id === "welcome" && showSuggestions ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[2.625rem]">
                        {CHAT_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion.message}
                            type="button"
                            disabled={sending}
                            onClick={() => void sendMessage(suggestion.message)}
                            className="cursor-pointer rounded-full border border-[#75825B]/25 bg-white px-2.5 py-1.5 text-left text-[11px] leading-snug text-[#2f2924] transition-colors hover:border-[#75825B]/50 hover:bg-[#75825B]/8 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {message.products ? (
                      <ProductCards products={message.products} />
                    ) : null}
                    <ChatLinkButtons
                      links={message.links}
                      content={message.content}
                    />
                  </div>
                ),
              )}

              {sending ? (
                <div className="flex items-end gap-2.5">
                  <AssistantAvatar />
                  <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-sm text-[#2f2924]/55 shadow-[0_1px_3px_rgba(45,35,25,0.06)]">
                    Pripravujem odpoveď…
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-black/6 bg-white px-3 py-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <label className="sr-only" aria-hidden>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                </label>
                <div className="flex items-center gap-2 rounded-full border border-black/8 bg-[#faf8f5] px-1.5 py-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    maxLength={500}
                    disabled={sending}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Napíšte správu…"
                    aria-label="Napíšte správu"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sending || input.trim().length < 2}
                    aria-label="Odoslať správu"
                    className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#75825B] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </form>
              {error ? (
                <p className="mt-2 px-1 text-center text-[11px] text-[#a05a3c]">
                  {error}
                </p>
              ) : (
                <p className="mt-2 px-1 text-center text-[11px] text-[#2f2924]/40">
                  Umelá inteligencia sa môže mýliť. Overte si dôležité info.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label={open ? "Zavrieť chat" : "Chat - napíšte nám"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-[#75825B] text-white shadow-[0_8px_24px_rgba(45,35,25,0.22)] outline-none transition-[transform,opacity] duration-200 hover:scale-105 hover:opacity-90 focus-visible:outline-none active:scale-95"
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
