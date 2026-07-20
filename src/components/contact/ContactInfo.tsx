import { Mail, Phone } from "lucide-react";

function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const stores = [
  {
    name: "Kvetinárstvo Mia I.",
    addressLine: "SNP 43, Šaľa (budova Billa)",
    mapsQuery: "SNP 43, Šaľa Billa",
    phone: "+421 911 571 255",
    phoneHref: "tel:+421911571255",
  },
  {
    name: "Kvetinárstvo Mia II.",
    addressLine: "Kráľovská 779/9, Šaľa",
    mapsQuery: "Kráľovská 779/9, Šaľa",
    phone: "+421 918 911 474",
    phoneHref: "tel:+421918911474",
  },
  {
    name: "Veľkosklad",
    addressLine: "Kráľová nad Váhom 283",
    mapsQuery: "Kráľová nad Váhom 283",
    phone: null,
    phoneHref: null,
  },
] as const;

export function ContactStores() {
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
          {stores.map((store) => (
            <article
              key={store.name}
              className="border-b border-black/6 px-6 py-7 text-center last:border-b-0 md:border-b-0 md:px-8 md:py-8"
            >
              <h3 className="font-heading text-lg font-semibold text-[#2f2924]">
                {store.name}
              </h3>
              <a
                href={mapsUrl(store.mapsQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm leading-relaxed text-[#2f2924]/70 transition-colors hover:text-[#75825B]"
              >
                {store.addressLine}
              </a>
              {store.phone && store.phoneHref ? (
                <a
                  href={store.phoneHref}
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
            PACIDEKOR s.r.o.
          </p>
          <p className="mt-1 text-sm text-[#2f2924]/65">Kráľová nad Váhom 283</p>
        </div>

        <div className="h-px w-12 bg-black/10" aria-hidden />

        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
            Telefón
          </p>
          <a
            href="tel:+421900123456"
            className="mt-2 inline-flex items-center gap-2.5 text-lg font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
          >
            <Phone
              className="size-5 shrink-0 text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />
            0900 123 456
          </a>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
            E-mail
          </p>
          <a
            href="mailto:info@pacidekor.sk"
            className="mt-2 inline-flex items-center gap-2.5 text-lg font-medium text-[#2f2924] transition-colors hover:text-[#75825B]"
          >
            <Mail
              className="size-5 shrink-0 text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />
            info@pacidekor.sk
          </a>
        </div>
      </div>
    </div>
  );
}
