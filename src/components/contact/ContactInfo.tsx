"use client";

import { Mail, Phone } from "lucide-react";
import { useSiteContent } from "@/lib/use-site-content";

function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function storePhoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function ContactStores() {
  const { contact } = useSiteContent();

  if (contact.stores.length === 0) return null;

  return (
    <section aria-labelledby="stores-heading" className="mt-16 w-full">
      <h2
        id="stores-heading"
        className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl"
      >
        Predajne a veľkosklad
      </h2>

      <div className="mt-6 overflow-hidden rounded-3xl border border-black/6 bg-white">
        <div className="grid md:grid-cols-3 md:divide-x md:divide-black/6">
          {contact.stores.map((store) => (
            <article
              key={store.id}
              className="border-b border-black/6 px-6 py-7 text-center last:border-b-0 md:border-b-0 md:px-8 md:py-8"
            >
              <h3 className="font-heading text-lg font-semibold text-[#2f2924]">
                {store.name}
              </h3>
              <a
                href={mapsUrl(store.mapsQuery || store.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm leading-relaxed text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              >
                {store.address}
              </a>
              {store.hours ? (
                <p className="mt-2 text-xs text-[#2f2924]/50">{store.hours}</p>
              ) : null}
              {store.phone ? (
                <a
                  href={storePhoneHref(store.phone)}
                  className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
                >
                  <Phone
                    className="size-3.5 shrink-0 text-[#75825B]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {store.phone}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactDetails() {
  const { contact } = useSiteContent();

  return (
    <div className="flex h-full flex-col">
      <h2 className="font-heading text-2xl font-semibold text-[#2f2924]">
        Kontaktné údaje
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
        Zavolajte alebo napíšte - sme tu pre maloobchod aj veľkoobchod.
      </p>

      <div className="mt-8 flex flex-1 flex-col justify-center gap-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
            Spoločnosť
          </p>
          <p className="mt-2 font-heading text-xl font-semibold text-[#2f2924]">
            {contact.company}
          </p>
          <p className="mt-1 text-sm text-[#2f2924]/65">{contact.address}</p>
        </div>

        <div className="h-px w-12 bg-black/10" aria-hidden />

        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
            Telefón
          </p>
          <a
            href={contact.phoneHref}
            className="mt-2 inline-flex items-center gap-2.5 text-lg font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
          >
            <Phone
              className="size-5 shrink-0 text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />
            {contact.phone}
          </a>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
            E-mail
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-2 inline-flex items-center gap-2.5 text-lg font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
          >
            <Mail
              className="size-5 shrink-0 text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />
            {contact.email}
          </a>
        </div>
      </div>
    </div>
  );
}
