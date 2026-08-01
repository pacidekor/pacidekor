import {
  HandCoins,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";

const benefits: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Package,
    title: "Expedícia do 24 hodín",
    description:
      "Balík odošleme do 24 hodín. Kuriér ho zvyčajne doručí do 1-3 pracovných dní.",
  },
  {
    icon: HandCoins,
    title: "Možnosť objednávky na dobierku",
    description:
      "Zásielku môžete zaplatiť až pri prevzatí. Pohodlné riešenie bez nutnosti platby vopred.",
  },
  {
    icon: Truck,
    title: "Doprava zdarma nad 100 €",
    description:
      "Pri objednávke nad 100 € dopravu neplatíte. Šetrite na väčších nákupoch pre vašu predajňu.",
  },
];

export function ProductDetailsCards() {
  return (
    <div className="mt-8 grid gap-3" aria-label="Výhody nákupu">
      {benefits.map((benefit) => {
        const Icon = benefit.icon;

        return (
          <div
            key={benefit.title}
            className="flex items-start gap-3.5 rounded-2xl bg-white px-4 py-4 sm:gap-4 sm:px-5 sm:py-5"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#faf8f5] text-[#75825B] sm:size-11">
              <Icon
                className="size-5 sm:size-[1.35rem]"
                strokeWidth={1.6}
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-sm font-semibold leading-snug text-[#2f2924] sm:text-[0.95rem]">
                {benefit.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
                {benefit.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
