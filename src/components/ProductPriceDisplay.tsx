"use client";

import {
  formatPriceExVat,
  formatPriceIncVat,
} from "@/lib/price";
import { useIsWholesale } from "@/lib/use-is-wholesale";

type ProductPriceDisplayProps = {
  price: string;
  originalPrice?: string;
  variant?: "card" | "pdp" | "inline";
};

function RetailCardPrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  if (originalPrice && incOriginal) {
    return (
      <div className="min-w-0 shrink">
        <span className="block whitespace-nowrap font-sans text-[11px] text-[#2f2924]/50 line-through sm:text-sm">
          {incOriginal}
        </span>
        <span className="block whitespace-nowrap font-sans text-sm font-bold text-[#c45c4a] sm:text-base">
          {inc}
        </span>
      </div>
    );
  }

  return (
    <span className="min-w-0 shrink whitespace-nowrap font-sans text-sm font-semibold text-[#2f2924] sm:text-base">
      {inc}
    </span>
  );
}

function WholesaleCardPrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const exVat = formatPriceExVat(price);
  const exVatOriginal = originalPrice
    ? formatPriceExVat(originalPrice)
    : undefined;
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  if (originalPrice && exVatOriginal) {
    return (
      <div className="min-w-0 shrink">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 whitespace-nowrap">
          <span className="font-sans text-[11px] text-[#2f2924]/45 line-through sm:text-sm">
            {exVatOriginal}
          </span>
          <span className="font-sans text-sm font-bold text-[#c45c4a] sm:text-base">
            {exVat}
            <span className="ml-1 text-[10px] font-medium text-[#2f2924]/45 sm:text-xs">
              / ks
            </span>
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 whitespace-nowrap text-[10px] text-[#2f2924]/45 sm:text-xs">
          <span className="line-through">{incOriginal}</span>
          <span>
            {inc} <span className="font-normal">s DPH</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 shrink">
      <span className="block whitespace-nowrap font-sans text-sm font-semibold text-[#2f2924] sm:text-base">
        {exVat}
        <span className="ml-1 text-[10px] font-medium text-[#2f2924]/45 sm:text-xs">
          / ks
        </span>
      </span>
      <span className="mt-0.5 block whitespace-nowrap text-[10px] text-[#2f2924]/45 sm:text-xs">
        {inc} s DPH
      </span>
    </div>
  );
}

function RetailPdpPrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  if (originalPrice && incOriginal) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-heading text-3xl font-semibold text-[#c45c4a] sm:text-4xl">
          {inc}
        </span>
        <span className="text-lg text-[#2f2924]/45 line-through">
          {incOriginal}
        </span>
        <span className="text-sm font-medium text-[#2f2924]/55">s DPH / ks</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <p className="font-heading text-3xl font-semibold text-[#2f2924] sm:text-4xl">
        {inc}
      </p>
      <span className="text-sm font-medium text-[#2f2924]/55">s DPH / ks</span>
    </div>
  );
}

function WholesalePdpPrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const exVat = formatPriceExVat(price);
  const exVatOriginal = originalPrice
    ? formatPriceExVat(originalPrice)
    : undefined;
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  return (
    <div>
      {originalPrice && exVatOriginal ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-heading text-3xl font-semibold text-[#c45c4a] sm:text-4xl">
            {exVat}
          </span>
          <span className="text-lg text-[#2f2924]/45 line-through">
            {exVatOriginal}
          </span>
          <span className="text-sm font-medium text-[#2f2924]/55">
            bez DPH / ks
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="font-heading text-3xl font-semibold text-[#2f2924] sm:text-4xl">
            {exVat}
          </p>
          <span className="text-sm font-medium text-[#2f2924]/55">
            bez DPH / ks
          </span>
        </div>
      )}

      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-[#2f2924]/55">
        {originalPrice && incOriginal ? (
          <>
            <span className="line-through opacity-70">{incOriginal}</span>
            <span>
              {inc} <span className="font-normal">s DPH</span>
            </span>
          </>
        ) : (
          <span>{inc} s DPH</span>
        )}
      </p>
    </div>
  );
}

function RetailInlinePrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  if (originalPrice && incOriginal) {
    return (
      <>
        <span className="mr-1.5 line-through">{incOriginal}</span>
        <span className="font-semibold text-[#c45c4a]">{inc}</span>
      </>
    );
  }

  return <span className="font-semibold text-[#2f2924]">{inc}</span>;
}

function WholesaleInlinePrice({
  price,
  originalPrice,
}: {
  price: string;
  originalPrice?: string;
}) {
  const exVat = formatPriceExVat(price);
  const exVatOriginal = originalPrice
    ? formatPriceExVat(originalPrice)
    : undefined;
  const inc = formatPriceIncVat(price);
  const incOriginal = originalPrice
    ? formatPriceIncVat(originalPrice)
    : undefined;

  if (originalPrice && exVatOriginal) {
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span>
          <span className="mr-1.5 line-through">{exVatOriginal}</span>
          <span className="font-semibold text-[#c45c4a]">{exVat}</span>
        </span>
        <span className="text-xs text-[#2f2924]/45">
          <span className="mr-1 line-through">{incOriginal}</span>
          {inc} s DPH
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="font-semibold text-[#2f2924]">{exVat}</span>
      <span className="text-xs text-[#2f2924]/45">{inc} s DPH</span>
    </span>
  );
}

export function ProductPriceDisplay({
  price,
  originalPrice,
  variant = "card",
}: ProductPriceDisplayProps) {
  const isWholesale = useIsWholesale();

  if (variant === "pdp") {
    return isWholesale ? (
      <WholesalePdpPrice price={price} originalPrice={originalPrice} />
    ) : (
      <RetailPdpPrice price={price} originalPrice={originalPrice} />
    );
  }

  if (variant === "inline") {
    return isWholesale ? (
      <WholesaleInlinePrice price={price} originalPrice={originalPrice} />
    ) : (
      <RetailInlinePrice price={price} originalPrice={originalPrice} />
    );
  }

  return isWholesale ? (
    <WholesaleCardPrice price={price} originalPrice={originalPrice} />
  ) : (
    <RetailCardPrice price={price} originalPrice={originalPrice} />
  );
}
