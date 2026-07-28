"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  footerAboutLinks,
  footerShopLinks,
  legalLinks,
} from "@/lib/navigation";
import { useSiteContent } from "@/lib/use-site-content";

function SocialIcon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <SocialIcon className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </SocialIcon>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <SocialIcon className={className}>
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </SocialIcon>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <SocialIcon className={className}>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </SocialIcon>
  );
}

function FooterLinkList({
  title,
  links,
}: {
  title: string;
  links: readonly {
    label: string;
    href: string;
    highlight?: boolean;
  }[];
}) {
  return (
    <div>
      <h3 className="font-heading text-sm font-semibold text-[#2f2924]">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={
                link.highlight
                  ? "text-sm font-medium text-[#c45c4a] transition-opacity hover:opacity-80"
                  : "text-sm text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              }
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const { contact } = useSiteContent();

  return (
    <footer className="mt-14 w-full bg-[#e8ebe2]">
      <div className="mx-auto w-[var(--content-width)] px-0 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div>
            <Link
              href="/"
              className="font-heading text-xl tracking-[0.08em] text-[#75825B]"
            >
              PACIDEKOR
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#2f2924]/70">
              Váš partner pre umelé kvety, dekorácie a aranžérsky materiál.
              Kvalita a inšpirácia pre každý priestor.
            </p>
          </div>

          <FooterLinkList title="Obchod" links={footerShopLinks} />
          <FooterLinkList title="O nás" links={footerAboutLinks} />

          <div>
            <h3 className="font-heading text-sm font-semibold text-[#2f2924]">
              Kontakt
            </h3>
            <div className="mt-4 space-y-1.5 text-sm text-[#2f2924]/70">
              <p className="font-medium text-[#2f2924]">{contact.company}</p>
              <p>{contact.address}</p>
              <a
                href={`mailto:${contact.email}`}
                className="inline-block transition-colors hover:text-[#75825B]"
              >
                {contact.email}
              </a>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              >
                <FacebookIcon className="size-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              >
                <InstagramIcon className="size-5" />
              </a>
              <a
                href={contact.phoneHref}
                aria-label="Zavolať"
                className="text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              >
                <PhoneIcon className="size-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-black/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#2f2924]/55">
            © {year} PACIDEKOR. Všetky práva vyhradené.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-[#2f2924]/55 transition-colors hover:text-[#75825B]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
