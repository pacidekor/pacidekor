import {
  Flower2,
  HandCoins,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";

const benefits: {
  icon: LucideIcon;
  text: string;
}[] = [
  {
    icon: Package,
    text: "Expedícia do 24 hodín",
  },
  {
    icon: HandCoins,
    text: "Možnosť objednávky na dobierku",
  },
  {
    icon: Truck,
    text: "Doprava zdarma nad 100 €",
  },
  {
    icon: Flower2,
    text: "Široký sortiment umelých kvetov",
  },
];

export function BenefitsBar() {
  return (
    <section
      aria-label="Výhody nákupu"
      className="cv-auto mt-14 w-full overflow-hidden rounded-3xl bg-[#e8ebe2] py-8 sm:py-9"
    >
      <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7 sm:px-8 lg:grid-cols-4 lg:gap-8">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <div key={benefit.text} className="flex items-center gap-4">
              <Icon
                className="size-9 shrink-0 text-[#75825B] sm:size-10"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="font-sans text-sm font-bold leading-snug text-[#2f2924] sm:text-[0.95rem]">
                {benefit.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
