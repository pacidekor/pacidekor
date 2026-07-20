import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import {
  ContactDetails,
  ContactStores,
} from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktujte PACIDEKOR – formulár, telefón, e-mail a adresy našich predajní.",
};

export default function KontaktPage() {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Kontakt</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Kontakt</h1>
        <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
          Napíšte nám, zavolajte alebo nás navštívte osobne.
        </p>
      </header>

      <div className="mt-8 grid overflow-hidden rounded-3xl border border-black/6 bg-white lg:grid-cols-2">
        <div className="border-b border-black/6 p-6 sm:p-8 lg:border-r lg:border-b-0 lg:p-10">
          <ContactForm />
        </div>
        <div className="p-6 sm:p-8 lg:p-10">
          <ContactDetails />
        </div>
      </div>

      <ContactStores />
    </main>
  );
}
