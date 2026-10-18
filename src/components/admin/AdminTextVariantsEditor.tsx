"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Pencil, Plus, X } from "lucide-react";
import type { TextVariant, VariantMode } from "@/lib/product-variants";
import {
  eurosToCents,
  formatCentsAsPrice,
  parsePriceToCents,
} from "@/lib/product-variants";

export type AdminVariantEditorValue = {
  variantMode: VariantMode;
  variantAxisLabel: string;
  textVariants: TextVariant[];
  defaultVariantId: string;
  /** Required when leaving custom mode. */
  priceAfterModeSwitch: string;
  priceBeforeCustom?: string;
};

/** Fields edited inside the custom-variants drawer (applied only via Použiť). */
export type CustomVariantsDraft = {
  variantAxisLabel: string;
  textVariants: TextVariant[];
  defaultVariantId: string;
};

type EditorProps = {
  value: CustomVariantsDraft;
  onChange: (next: CustomVariantsDraft) => void;
  images: string[];
  /** Seed price for newly added custom variants. */
  productPrice: string;
};

const MODE_OPTIONS = [
  ["none", "Bez variant"],
  ["colors", "Farby"],
  ["custom", "Vlastné varianty"],
] as const;

const DRAWER_EXIT_MS = 300;

const inputClassName =
  "h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white";

function newVariantId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneCustomVariantsDraft(
  value: Pick<
    AdminVariantEditorValue,
    "variantAxisLabel" | "textVariants" | "defaultVariantId"
  >,
): CustomVariantsDraft {
  return {
    variantAxisLabel: value.variantAxisLabel,
    defaultVariantId: value.defaultVariantId,
    textVariants: value.textVariants.map((variant) => ({
      ...variant,
      imageUrls: [...variant.imageUrls],
    })),
  };
}

export function applyVariantMode(
  value: AdminVariantEditorValue,
  mode: VariantMode,
  productPrice: string,
): AdminVariantEditorValue {
  return {
    ...value,
    variantMode: mode,
    priceAfterModeSwitch:
      value.priceBeforeCustom?.trim() ||
      value.priceAfterModeSwitch ||
      productPrice,
  };
}

export function AdminVariantModePicker({
  value,
  onChange,
  productPrice,
  infoHint,
}: {
  value: AdminVariantEditorValue;
  onChange: (next: AdminVariantEditorValue) => void;
  productPrice: string;
  infoHint?: ReactNode;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2f2924]">
        Nastavenie variant
        {infoHint}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODE_OPTIONS.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() =>
              onChange(applyVariantMode(value, mode, productPrice))
            }
            className={[
              "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium",
              value.variantMode === mode
                ? "border-[#75825B] bg-[#75825B] text-white"
                : "border-black/10 bg-[#faf8f5] text-[#2f2924]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatVariantsSummary(value: CustomVariantsDraft): string {
  const count = value.textVariants.length;
  if (count === 0) return "Zatiaľ žiadne varianty";

  const axis = value.variantAxisLabel.trim() || "Výber";
  const prices = value.textVariants.map((v) => v.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pricePart =
    min === max ? formatCentsAsPrice(min) : `od ${formatCentsAsPrice(min)}`;
  const countLabel =
    count === 1
      ? "1 varianta"
      : count < 5
        ? `${count} varianty`
        : `${count} variantov`;
  return `${axis} · ${countLabel} · ${pricePart}`;
}

function DrawerField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-[#2f2924]">
      <span className="inline-flex items-center gap-1.5">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-[#2f2924]/45">
          {hint}
        </span>
      ) : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

/** Compact summary in the product panel — opens the drawer via + / pencil. */
export function AdminCustomVariantsSummary({
  value,
  onOpen,
}: {
  value: AdminVariantEditorValue;
  onOpen: () => void;
}) {
  const empty = value.textVariants.length === 0;
  return (
    <div className="rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#2f2924]">Vlastné varianty</p>
          <p className="mt-1 text-sm leading-snug text-[#2f2924]/65">
            {formatVariantsSummary(value)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white text-[#75825B] transition-colors hover:bg-[#e8ebe2]"
          aria-label={
            empty ? "Nastaviť vlastné varianty" : "Upraviť vlastné varianty"
          }
          title={empty ? "Nastaviť" : "Upraviť"}
        >
          {empty ? (
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          ) : (
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

/** Right drawer with local draft — Použiť applies to product draft, Zrušiť discards. */
export function AdminCustomVariantsDrawer({
  open,
  applied,
  images,
  productPrice,
  onCancel,
  onApply,
}: {
  open: boolean;
  applied: AdminVariantEditorValue;
  images: string[];
  productPrice: string;
  onCancel: () => void;
  onApply: (draft: CustomVariantsDraft) => void;
}) {
  const titleId = useId();
  const [present, setPresent] = useState(false);
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<CustomVariantsDraft>(() =>
    cloneCustomVariantsDraft(applied),
  );

  useEffect(() => {
    if (open) {
      setDraft(cloneCustomVariantsDraft(applied));
      setPresent(true);
      const show = window.setTimeout(() => setActive(true), 20);
      return () => window.clearTimeout(show);
    }
    setActive(false);
    const hide = window.setTimeout(() => setPresent(false), DRAWER_EXIT_MS);
    return () => window.clearTimeout(hide);
    // Only re-seed when opening; ignore applied changes while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gated seed
  }, [open]);

  useEffect(() => {
    if (!present) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [present, onCancel]);

  if (!present) return null;

  return (
    <div
      className={`absolute inset-0 z-[70] flex justify-end transition-colors duration-300 ${
        active ? "bg-black/35" : "bg-black/0"
      }`}
      onWheel={(event) => {
        // Keep wheel events from reaching the product panel underneath.
        if (event.target === event.currentTarget) event.preventDefault();
      }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zrušiť úpravy variant"
        onClick={onCancel}
        onWheel={(event) => event.preventDefault()}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Vlastné varianty
            </p>
            <h3
              id={titleId}
              className="mt-1 truncate font-heading text-lg text-[#2f2924]"
            >
              Nastavenie variant
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zrušiť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
          <AdminTextVariantsEditor
            value={draft}
            onChange={setDraft}
            images={images}
            productPrice={productPrice}
          />
        </div>

        <div className="shrink-0 border-t border-black/6 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Použiť
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function VariantPhotosPicker({
  open,
  images,
  selectedUrls,
  onClose,
  onSave,
}: {
  open: boolean;
  images: string[];
  selectedUrls: string[];
  onClose: () => void;
  onSave: (urls: string[]) => void;
}) {
  const [draftUrls, setDraftUrls] = useState<string[]>(selectedUrls);

  useEffect(() => {
    if (open) setDraftUrls(selectedUrls);
  }, [open, selectedUrls]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/35 px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť výber fotiek"
        onClick={onClose}
        onWheel={(event) => event.preventDefault()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-photos-title"
        className="relative z-10 flex max-h-[min(80vh,36rem)] w-full max-w-md flex-col rounded-2xl border border-black/8 bg-white shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-black/6 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h4
              id="variant-photos-title"
              className="font-heading text-lg text-[#2f2924]"
            >
              Fotky varianty
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
              Vyberte fotky z médií produktu, ktoré patria k tejto variante.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {images.length === 0 ? (
            <p className="text-sm text-[#2f2924]/55">
              Najprv nahrajte fotky v sekcii Médiá produktu.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {images.map((url, index) => {
                const checked = draftUrls.includes(url);
                return (
                  <label
                    key={url}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-colors ${
                      checked
                        ? "border-[#75825B] ring-2 ring-[#75825B]/30"
                        : "border-black/10 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="size-full object-cover"
                    />
                    <input
                      type="checkbox"
                      className="absolute top-1.5 left-1.5 size-4 cursor-pointer accent-[#75825B]"
                      checked={checked}
                      onChange={() => {
                        setDraftUrls((prev) =>
                          checked
                            ? prev.filter((item) => item !== url)
                            : [...prev, url],
                        );
                      }}
                      aria-label={`Fotka ${index + 1}`}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2.5 border-t border-black/6 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
          >
            Zrušiť
          </button>
          <button
            type="button"
            onClick={() => onSave(draftUrls)}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Potvrdiť
          </button>
        </div>
      </div>
    </div>
  );
}

function variantCollapsedTitle(variant: TextVariant, index: number): string {
  const label = variant.label.trim();
  return label || `Varianta ${index + 1}`;
}

function variantCollapsedMeta(
  variant: TextVariant,
  isDefault: boolean,
): string {
  const parts = [formatCentsAsPrice(variant.priceCents)];
  if (!variant.available) parts.push("neobjednateľná");
  if (isDefault) parts.push("predvolená");
  if (variant.imageUrls.length > 0) {
    parts.push(
      variant.imageUrls.length === 1
        ? "1 fotka"
        : `${variant.imageUrls.length} fotky`,
    );
  }
  return parts.join(" · ");
}

/** Form body for custom text-variants (used inside the drawer draft). */
export function AdminTextVariantsEditor({
  value,
  onChange,
  images,
  productPrice,
}: EditorProps) {
  const { textVariants } = value;
  const [photosPickerId, setPhotosPickerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateVariant(id: string, patch: Partial<TextVariant>) {
    onChange({
      ...value,
      textVariants: textVariants.map((v) =>
        v.id === id ? { ...v, ...patch } : v,
      ),
    });
  }

  function addVariant() {
    const id = newVariantId();
    const next: TextVariant = {
      id,
      label: "",
      priceCents: parsePriceToCents(productPrice) || 0,
      available: true,
      sortOrder: textVariants.length,
      imageUrls: [],
    };
    onChange({
      ...value,
      textVariants: [...textVariants, next],
      defaultVariantId: value.defaultVariantId || id,
    });
    setExpandedId(id);
  }

  function removeVariant(id: string) {
    const next = textVariants.filter((v) => v.id !== id);
    onChange({
      ...value,
      textVariants: next,
      defaultVariantId:
        value.defaultVariantId === id ? next[0]?.id ?? "" : value.defaultVariantId,
    });
    if (photosPickerId === id) setPhotosPickerId(null);
    if (expandedId === id) setExpandedId(null);
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  const photosPickerVariant =
    photosPickerId != null
      ? textVariants.find((item) => item.id === photosPickerId)
      : null;

  return (
    <div className="space-y-6">
      <DrawerField
        label="Názov výberu"
        hint="Nadpis na webe, napr. Veľkosť alebo Dĺžka."
      >
        <input
          className={inputClassName}
          value={value.variantAxisLabel}
          onChange={(e) =>
            onChange({ ...value, variantAxisLabel: e.target.value })
          }
          placeholder="Veľkosť / Dĺžka / Priemer…"
        />
      </DrawerField>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#2f2924]">Varianty</p>
            <p className="mt-0.5 text-xs text-[#2f2924]/45">
              Vyplňte jednu, zbaliť „Uložiť variantu“, potom pridajte ďalšiu.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Pridať variant
          </button>
        </div>

        {textVariants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/15 bg-[#faf8f5] px-4 py-5 text-sm text-[#9a4d3f]">
            Zatiaľ žiadna varianta — pridajte aspoň jednu.
          </p>
        ) : null}

        <ul className="space-y-2.5">
          {textVariants.map((variant, index) => {
            const isDefault = value.defaultVariantId === variant.id;
            const photoCount = variant.imageUrls.length;
            const expanded = expandedId === variant.id;
            return (
              <li
                key={variant.id}
                className="overflow-hidden rounded-2xl border border-black/8 bg-[#faf8f5]"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(variant.id)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#e8ebe2]/45"
                  aria-expanded={expanded}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#2f2924]">
                      {variantCollapsedTitle(variant, index)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#2f2924]/55">
                      {variantCollapsedMeta(variant, isDefault)}
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-[#2f2924]/45 transition-transform duration-200 ${
                      expanded ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>

                {expanded ? (
                  <div className="space-y-5 border-t border-black/6 px-4 py-5 sm:px-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <DrawerField label="Názov">
                        <input
                          className={inputClassName}
                          value={variant.label}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              label: e.target.value,
                            })
                          }
                          placeholder="21 cm"
                        />
                      </DrawerField>
                      <DrawerField label="Cena bez DPH">
                        <div className="relative">
                          <input
                            className={`${inputClassName} pr-10`}
                            value={formatCentsAsPrice(
                              variant.priceCents,
                            ).replace(" €", "")}
                            onChange={(e) =>
                              updateVariant(variant.id, {
                                priceCents: eurosToCents(
                                  Number.parseFloat(
                                    e.target.value.replace(",", "."),
                                  ) || 0,
                                ),
                              })
                            }
                            placeholder="4,90"
                            inputMode="decimal"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-[#2f2924]/45">
                            €
                          </span>
                        </div>
                      </DrawerField>
                    </div>

                    <DrawerField
                      label="Poradie zobrazenia"
                      hint="Nižšie číslo = skôr vo výbere na webe."
                    >
                      <input
                        type="number"
                        className={inputClassName}
                        value={variant.sortOrder}
                        onChange={(e) =>
                          updateVariant(variant.id, {
                            sortOrder: Number(e.target.value) || index,
                          })
                        }
                      />
                    </DrawerField>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                          variant.available
                            ? "border-[#75825B]/35 bg-white"
                            : "border-black/10 bg-white/70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 cursor-pointer accent-[#75825B]"
                          checked={variant.available}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              available: e.target.checked,
                            })
                          }
                        />
                        <span>
                          <span className="block text-sm font-medium text-[#2f2924]">
                            Objednateľná
                          </span>
                          <span className="mt-0.5 block text-xs text-[#2f2924]/50">
                            Zákazník ju môže vložiť do košíka.
                          </span>
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...value,
                            defaultVariantId: variant.id,
                          })
                        }
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                          isDefault
                            ? "border-[#75825B]/35 bg-white"
                            : "border-black/10 bg-white/70 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            isDefault
                              ? "border-[#75825B] bg-[#75825B]"
                              : "border-black/25 bg-white"
                          }`}
                          aria-hidden
                        >
                          {isDefault ? (
                            <span className="size-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-[#2f2924]">
                            Predvolená na webe
                          </span>
                          <span className="mt-0.5 block text-xs text-[#2f2924]/50">
                            Predvybraná pri otvorení produktu.
                          </span>
                        </span>
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#2f2924]">
                        Fotky
                      </p>
                      <p className="mt-0.5 text-xs text-[#2f2924]/45">
                        Voliteľné — inak sa použijú fotky produktu.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {variant.imageUrls.slice(0, 3).map((url) => (
                          <span
                            key={url}
                            className="relative size-14 overflow-hidden rounded-xl border border-black/10 bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="size-full object-cover"
                            />
                          </span>
                        ))}
                        {photoCount > 3 ? (
                          <span className="text-sm text-[#2f2924]/55">
                            +{photoCount - 3}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setPhotosPickerId(variant.id)}
                          disabled={images.length === 0}
                          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#75825B]/40 bg-white px-4 text-sm font-medium text-[#75825B] transition-colors hover:border-[#75825B] hover:bg-[#e8ebe2]/45 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ImagePlus
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          {photoCount > 0
                            ? `Upraviť fotky (${photoCount})`
                            : "Určiť fotky"}
                        </button>
                      </div>
                      {images.length === 0 ? (
                        <p className="mt-2 text-xs text-[#2f2924]/45">
                          Najprv pridajte fotky v sekcii Médiá.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 border-t border-black/6 pt-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:flex-none sm:min-w-[10rem]"
                      >
                        Uložiť variantu
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#c45c4a]/25 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                      >
                        Odstrániť
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <VariantPhotosPicker
        open={photosPickerVariant != null}
        images={images}
        selectedUrls={photosPickerVariant?.imageUrls ?? []}
        onClose={() => setPhotosPickerId(null)}
        onSave={(urls) => {
          if (!photosPickerId) return;
          updateVariant(photosPickerId, { imageUrls: urls });
          setPhotosPickerId(null);
        }}
      />
    </div>
  );
}
