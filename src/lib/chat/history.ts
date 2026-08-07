export const CHAT_HISTORY_STORAGE_KEY = "pacidekor.chat.conversations";
export const CHAT_ACTIVE_ID_KEY = "pacidekor.chat.activeId";
export const CHAT_HISTORY_MAX = 30;

export type StoredChatProduct = {
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
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: StoredChatProduct[];
};

export type StoredConversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: StoredChatMessage[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadConversations(): StoredConversation[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredConversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          Array.isArray(item.messages),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: StoredConversation[]) {
  if (!canUseStorage()) return;
  const trimmed = conversations
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, CHAT_HISTORY_MAX);
  localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
}

export function upsertConversation(conversation: StoredConversation) {
  const all = loadConversations().filter((item) => item.id !== conversation.id);
  all.unshift(conversation);
  saveConversations(all);
}

export function deleteConversation(id: string) {
  saveConversations(loadConversations().filter((item) => item.id !== id));
}

export function getActiveConversationId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(CHAT_ACTIVE_ID_KEY);
}

export function setActiveConversationId(id: string | null) {
  if (!canUseStorage()) return;
  if (id) localStorage.setItem(CHAT_ACTIVE_ID_KEY, id);
  else localStorage.removeItem(CHAT_ACTIVE_ID_KEY);
}

export function createConversationId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Fallback title before AI names the chat. */
export function titleFromUserMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Nový chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42).trim()}…` : cleaned;
}
