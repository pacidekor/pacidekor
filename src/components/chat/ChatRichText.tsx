import Link from "next/link";
import type { ReactNode } from "react";

const MD_LINK_RE = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
const BARE_PATH_RE =
  /(^|[\s([„"])(\/(?:ucet|prihlasenie|registracia|kontakt|akcia|oblubene|kosik|produkty|novinky|blog|zabudnute-heslo|obnova-hesla)(?:\/[a-zA-Z0-9\-/_]*)?)/g;

function isSafeInternalHref(href: string) {
  return (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.includes("://") &&
    href.length < 200
  );
}

function linkClassName(className?: string) {
  return (
    className ??
    "font-medium text-[#75825B] underline decoration-[#75825B]/35 underline-offset-2 transition-colors hover:text-[#5f6a49] hover:decoration-[#75825B]/70"
  );
}

function renderBarePaths(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BARE_PATH_RE.source, "g");

  while ((match = re.exec(text)) !== null) {
    const prefix = match[1] ?? "";
    const href = match[2] ?? "";
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    nodes.push(prefix);
    if (isSafeInternalHref(href)) {
      nodes.push(
        <Link
          key={`${keyPrefix}-bare-${start}`}
          href={href}
          className={linkClassName()}
        >
          {href}
        </Link>,
      );
    } else {
      nodes.push(href);
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

/** Render chat text with [label](/path) and bare known paths as links. */
export function ChatRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MD_LINK_RE.source, "g");
  let part = 0;

  while ((match = re.exec(text)) !== null) {
    const label = match[1] ?? "";
    const href = match[2] ?? "";
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(
        ...renderBarePaths(text.slice(lastIndex, start), `t${part}`),
      );
    }

    if (isSafeInternalHref(href) && label) {
      nodes.push(
        <Link
          key={`md-${part}-${start}`}
          href={href}
          className={linkClassName(className)}
        >
          {label}
        </Link>,
      );
    } else {
      nodes.push(label || match[0]);
    }

    lastIndex = start + match[0].length;
    part += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderBarePaths(text.slice(lastIndex), `t${part}`));
  }

  return <>{nodes}</>;
}

export function hrefsInChatText(text: string): Set<string> {
  const found = new Set<string>();
  const re = new RegExp(MD_LINK_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const href = match[2];
    if (href && isSafeInternalHref(href)) found.add(href);
  }
  return found;
}
