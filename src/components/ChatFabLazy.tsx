"use client";

import dynamic from "next/dynamic";

const ChatFab = dynamic(
  () => import("@/components/ChatFab").then((mod) => mod.ChatFab),
  { ssr: false },
);

export function ChatFabLazy() {
  return <ChatFab />;
}
