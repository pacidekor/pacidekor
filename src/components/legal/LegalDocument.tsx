import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
  beforeSections?: ReactNode;
};

export function LegalDocument({
  title,
  subtitle,
  updatedAt,
  sections,
  beforeSections,
}: LegalDocumentProps) {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">{title}</span>
      </nav>

      <header>
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
          {subtitle}
        </p>
        <p className="mt-3 text-xs text-[#2f2924]/45">
          Posledná aktualizácia: {updatedAt}
        </p>
      </header>

      {beforeSections ? <div className="mt-8">{beforeSections}</div> : null}

      <article className="mt-10 space-y-8">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id}>
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-base leading-relaxed text-[#2f2924]/80">
              {section.content}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
