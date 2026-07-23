import Link from "next/link";
import { ChevronRight, Flower2, ShoppingCart, type LucideIcon } from "lucide-react";

export type AccountChoiceOption = {
  accent: string;
  softBg: string;
  icon: LucideIcon;
  title: string;
  description: string;
  loginHref: string;
  registerHref: string;
};

export const accountChoices: AccountChoiceOption[] = [
  {
    accent: "#5f6a49",
    softBg: "#e8ebe2",
    icon: Flower2,
    title: "Som kvetinárka / firma",
    description: "Veľkoobchodné ceny a partnerské výhody",
    loginHref: "/prihlasenie/velkoobchod",
    registerHref: "/registracia/velkoobchod",
  },
  {
    accent: "#75825B",
    softBg: "#f3efe9",
    icon: ShoppingCart,
    title: "Nakupujem pre seba",
    description: "Maloobchodný nákup pre bežných zákazníkov",
    loginHref: "/prihlasenie",
    registerHref: "/registracia",
  },
];

export function AccountChoiceCard({
  option,
  onNavigate,
}: {
  option: AccountChoiceOption;
  onNavigate?: () => void;
}) {
  const Icon = option.icon;

  return (
    <div className="flex flex-col items-center rounded-xl bg-[#e8ebe2] px-4 py-5 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon
          className="size-6"
          strokeWidth={1.75}
          style={{ color: option.accent }}
          aria-hidden
        />
      </div>

      <h3 className="font-heading text-sm leading-snug text-[#2f2924]">
        {option.title}
      </h3>
      <p className="mt-1.5 mb-4 text-xs leading-relaxed text-[#6b625a]">
        {option.description}
      </p>

      <div className="mt-auto flex w-full flex-col gap-2">
        <Link
          href={option.loginHref}
          onClick={onNavigate}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-3 text-xs font-medium tracking-wide text-white uppercase transition-opacity hover:opacity-90"
          style={{ backgroundColor: option.accent }}
        >
          Prihlásiť sa
        </Link>
        <Link
          href={option.registerHref}
          onClick={onNavigate}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border bg-white px-3 text-xs font-medium tracking-wide uppercase transition-opacity hover:opacity-80"
          style={{ borderColor: `${option.accent}40`, color: option.accent }}
        >
          Registrovať sa
        </Link>
      </div>
    </div>
  );
}

export function AccountTypeSelectButton({
  option,
  onSelect,
}: {
  option: AccountChoiceOption;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-black/[0.06] bg-white px-4 py-4 text-left shadow-[0_2px_10px_rgba(47,41,36,0.04)] transition-colors hover:border-[#75825B]/25"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e8ebe2]">
        <Icon
          className="size-6"
          strokeWidth={1.75}
          style={{ color: option.accent }}
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-base leading-snug text-[#2f2924]">
          {option.title}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[#6b625a]">
          {option.description}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-[#2f2924]/30"
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}
