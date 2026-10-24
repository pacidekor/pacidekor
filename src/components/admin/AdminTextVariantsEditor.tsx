"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminSaveIcon } from "@/components/admin/AdminSaveIcon";
import type { TextVariant, VariantMode } from "@/lib/product-variants";
import {
  eurosToCents,
  formatCentsAsPrice,
  parsePriceToCents,
} from "@/lib/product-variants";
import {
  colorSwatchStyle,
  parseCustomColorId,
  resolveCustomColorId,
  searchCatalogCustomColors,
  suggestColorName,
  suggestSplitColorName,
  type CatalogCustomColor,
  type ProductColor,
} from "@/lib/products";
import { filterColors } from "@/lib/taxonomy";

const CUSTOM_COLOR_PRESETS = [
  "#f5f2ec",
  "#e8d9c4",
  "#d4a0a8",
  "#c9959a",
  "#b43c3c",
  "#6e2c3a",
  "#d4894a",
  "#e0c35a",
  "#6b7f5a",
  "#5a7a9a",
  "#7a5f8a",
  "#8a6a4a",
  "#9a9a96",
  "#2f2924",
] as const;

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

export type VariantColorOption = {
  id: string;
  label: string;
  color?: ProductColor;
};

type EditorProps = {
  value: CustomVariantsDraft;
  onChange: (next: CustomVariantsDraft) => void;
  images: string[];
  /** Seed price for newly added custom variants. */
  productPrice: string;
  /** Product-level + taxonomy colors available to assign on a variant. */
  colorOptions?: VariantColorOption[];
  /** Ensure a newly picked color is also on the product `colors` list. */
  onEnsureProductColor?: (colorId: string) => void;
  /** Catalog of existing custom colors (dedupe by hex/label). */
  catalogCustomColors?: CatalogCustomColor[];
  /** Current product color ids (for resolveCustomColorId). */
  existingProductColorIds?: string[];
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
      colorIds: variant.colorIds ? [...variant.colorIds] : undefined,
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
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#2f2924]">Vlastné varianty</p>
          <p className="mt-1 text-sm leading-snug text-[#2f2924]/65">
            {formatVariantsSummary(value)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-[#75825B] transition-colors hover:bg-[#e8ebe2]"
          aria-label={
            empty ? "Nastaviť vlastné varianty" : "Upraviť vlastné varianty"
          }
          title={empty ? "Nastaviť" : "Upraviť"}
        >
          {empty ? (
            <Plus className="size-5" strokeWidth={1.75} aria-hidden />
          ) : (
            <Pencil className="size-5" strokeWidth={1.75} aria-hidden />
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
  colorOptions,
  onEnsureProductColor,
  catalogCustomColors,
  existingProductColorIds,
  onCancel,
  onApply,
}: {
  open: boolean;
  applied: AdminVariantEditorValue;
  images: string[];
  productPrice: string;
  colorOptions?: VariantColorOption[];
  onEnsureProductColor?: (colorId: string) => void;
  catalogCustomColors?: CatalogCustomColor[];
  existingProductColorIds?: string[];
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
            colorOptions={colorOptions}
            onEnsureProductColor={onEnsureProductColor}
            catalogCustomColors={catalogCustomColors}
            existingProductColorIds={existingProductColorIds}
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
  const colorCount = variant.colorIds?.length ?? 0;
  if (colorCount > 0) {
    parts.push(
      colorCount === 1 ? "1 farba" : colorCount < 5 ? `${colorCount} farby` : `${colorCount} farieb`,
    );
  }
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
  colorOptions,
  onEnsureProductColor,
  catalogCustomColors = [],
  existingProductColorIds = [],
}: EditorProps) {
  const { textVariants } = value;
  const [photosPickerId, setPhotosPickerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customPickerVariantId, setCustomPickerVariantId] = useState<
    string | null
  >(null);
  const [customDraftHex, setCustomDraftHex] = useState("#d4a0a8");
  const [customDraftHexSecondary, setCustomDraftHexSecondary] =
    useState("#f5f2ec");
  const [customDraftSplit, setCustomDraftSplit] = useState(false);
  const [customDraftLabel, setCustomDraftLabel] = useState(() =>
    suggestColorName("#d4a0a8"),
  );
  const [customLabelTouched, setCustomLabelTouched] = useState(false);
  const [customLabelFocused, setCustomLabelFocused] = useState(false);

  const customLabelSuggestions = useMemo(
    () =>
      customLabelFocused
        ? searchCatalogCustomColors(catalogCustomColors, customDraftLabel)
        : [],
    [catalogCustomColors, customDraftLabel, customLabelFocused],
  );

  const resolvedColorOptions = useMemo(() => {
    const byId = new Map<string, VariantColorOption>();
    for (const color of filterColors) {
      if (!color.hex) continue;
      byId.set(color.id, {
        id: color.id,
        label: color.label,
        color: {
          id: color.id,
          label: color.label,
          hex: color.hex,
        },
      });
    }
    for (const option of colorOptions ?? []) {
      byId.set(option.id, option);
    }
    // Include colors already on variants even if not in product list yet
    for (const variant of textVariants) {
      for (const id of variant.colorIds ?? []) {
        if (byId.has(id)) continue;
        const parsed = parseCustomColorId(id);
        byId.set(
          id,
          parsed
            ? { id, label: parsed.label, color: parsed }
            : { id, label: id },
        );
      }
    }
    return [...byId.values()];
  }, [colorOptions, textVariants]);

  function customDraftSuggestedLabel(
    hex = customDraftHex,
    split = customDraftSplit,
    hexSecondary = customDraftHexSecondary,
  ) {
    return split
      ? suggestSplitColorName(hex, hexSecondary)
      : suggestColorName(hex);
  }

  function resetCustomDraft() {
    setCustomDraftHex("#d4a0a8");
    setCustomDraftHexSecondary("#f5f2ec");
    setCustomDraftSplit(false);
    setCustomDraftLabel(suggestColorName("#d4a0a8"));
    setCustomLabelTouched(false);
    setCustomLabelFocused(false);
  }

  function applyCatalogCustomColor(color: CatalogCustomColor) {
    setCustomDraftHex(color.hex);
    setCustomDraftHexSecondary(color.hexSecondary ?? "#f5f2ec");
    setCustomDraftSplit(Boolean(color.hexSecondary));
    setCustomDraftLabel(color.label);
    setCustomLabelTouched(true);
    setCustomLabelFocused(false);
  }

  function toggleVariantColor(variantId: string, colorId: string) {
    const variant = textVariants.find((item) => item.id === variantId);
    if (!variant) return;
    const current = variant.colorIds ?? [];
    const selected = current.includes(colorId);
    const nextIds = selected
      ? current.filter((id) => id !== colorId)
      : [...current, colorId];
    updateVariant(variantId, {
      colorIds: nextIds.length > 0 ? nextIds : undefined,
    });
    if (!selected) onEnsureProductColor?.(colorId);
  }

  function addCustomColorToVariant(variantId: string) {
    const label =
      customDraftLabel.trim() || customDraftSuggestedLabel();
    const id = resolveCustomColorId({
      hex: customDraftHex,
      label,
      hexSecondary: customDraftSplit ? customDraftHexSecondary : undefined,
      registry: catalogCustomColors,
      existingColorIds: existingProductColorIds,
    });
    onEnsureProductColor?.(id);
    const variant = textVariants.find((item) => item.id === variantId);
    const current = variant?.colorIds ?? [];
    if (!current.includes(id)) {
      updateVariant(variantId, { colorIds: [...current, id] });
    }
    setCustomPickerVariantId(null);
    resetCustomDraft();
  }

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
    if (customPickerVariantId === id) {
      setCustomPickerVariantId(null);
      resetCustomDraft();
    }
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => {
      if (current === id) {
        if (customPickerVariantId === id) {
          setCustomPickerVariantId(null);
          resetCustomDraft();
        }
        return null;
      }
      if (customPickerVariantId != null && customPickerVariantId !== id) {
        setCustomPickerVariantId(null);
        resetCustomDraft();
      }
      return id;
    });
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
            Zatiaľ žiadna varianta - pridajte aspoň jednu.
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
                        Farby tejto varianty
                      </p>
                      <p className="mt-0.5 text-xs text-[#2f2924]/45">
                        Voliteľné - napr. veľkosť S v niekoľkých farbách. Fotky
                        ostávajú na variante, nie na farbe.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {(() => {
                          const selectedIds = variant.colorIds ?? [];
                          const renderOption = (option: VariantColorOption) => {
                            const selected = selectedIds.includes(option.id);
                            return (
                              <label
                                key={option.id}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 px-2.5 py-2 text-sm text-[#2f2924] transition-colors hover:bg-white ${
                                  selected ? "bg-white" : "bg-white/70"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() =>
                                    toggleVariantColor(variant.id, option.id)
                                  }
                                  className="size-4 shrink-0 accent-[#75825B]"
                                />
                                {option.color ? (
                                  <span
                                    className="size-3.5 shrink-0 rounded-full border border-black/10"
                                    style={colorSwatchStyle(option.color)}
                                    aria-hidden
                                  />
                                ) : null}
                                <span className="min-w-0 truncate">
                                  {option.label}
                                </span>
                              </label>
                            );
                          };

                          return (
                            <>
                              {resolvedColorOptions.map(renderOption)}
                              <button
                                type="button"
                                onClick={() => {
                                  const opening =
                                    customPickerVariantId !== variant.id;
                                  setCustomPickerVariantId(
                                    opening ? variant.id : null,
                                  );
                                  resetCustomDraft();
                                }}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                                  customPickerVariantId === variant.id
                                    ? "border-[#75825B] bg-[#e8ebe2]/60 text-[#2f2924]"
                                    : "border-[#2f2924]/20 bg-white text-[#2f2924] hover:border-[#75825B]/50 hover:bg-[#e8ebe2]/40"
                                }`}
                              >
                                <span
                                  className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[conic-gradient(from_0deg,#b43c3c,#e0c35a,#6b7f5a,#5a7a9a,#7a5f8a,#d4a0a8,#b43c3c)]"
                                  aria-hidden
                                />
                                Vlastná
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      {customPickerVariantId === variant.id ? (
                        <div className="mt-3 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] p-3">
                          <p className="text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase">
                            Nová vlastná farba
                          </p>
                          <p className="text-xs leading-relaxed text-[#2f2924]/55">
                            Vyberte HEX a zadajte vlastný názov (napr. Svetlo
                            fialová). Návrh názvu z katalógu môžete prepísať.
                          </p>

                          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#2f2924]">
                            <input
                              type="checkbox"
                              checked={customDraftSplit}
                              onChange={(event) => {
                                const split = event.target.checked;
                                setCustomDraftSplit(split);
                                if (!customLabelTouched) {
                                  setCustomDraftLabel(
                                    customDraftSuggestedLabel(
                                      customDraftHex,
                                      split,
                                      customDraftHexSecondary,
                                    ),
                                  );
                                }
                              }}
                              className="size-4 accent-[#75825B]"
                            />
                            Dve farby (split)
                            <span
                              className="size-4 rounded-full border border-black/10"
                              style={colorSwatchStyle({
                                hex: customDraftHex,
                                hexSecondary: customDraftSplit
                                  ? customDraftHexSecondary
                                  : undefined,
                              })}
                              aria-hidden
                            />
                          </label>

                          <div className="flex flex-wrap items-start gap-4">
                            <div className="space-y-2">
                              <p className="text-[11px] font-medium tracking-wide text-[#2f2924]/45 uppercase">
                                {customDraftSplit ? "Farba 1" : "Farba"}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/10 shadow-sm">
                                  <span
                                    className="absolute inset-0"
                                    style={{ backgroundColor: customDraftHex }}
                                    aria-hidden
                                  />
                                  <input
                                    type="color"
                                    value={customDraftHex}
                                    onChange={(event) => {
                                      const hex = event.target.value;
                                      setCustomDraftHex(hex);
                                      if (!customLabelTouched) {
                                        setCustomDraftLabel(
                                          customDraftSuggestedLabel(hex),
                                        );
                                      }
                                    }}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    aria-label="Vybrať prvú farbu"
                                  />
                                </label>
                                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                                  {CUSTOM_COLOR_PRESETS.map((hex) => (
                                    <button
                                      key={`a-${hex}`}
                                      type="button"
                                      onClick={() => {
                                        setCustomDraftHex(hex);
                                        if (!customLabelTouched) {
                                          setCustomDraftLabel(
                                            customDraftSuggestedLabel(hex),
                                          );
                                        }
                                      }}
                                      className={`size-7 cursor-pointer rounded-full border transition-transform hover:scale-105 ${
                                        customDraftHex.toLowerCase() ===
                                        hex.toLowerCase()
                                          ? "border-[#2f2924] ring-2 ring-[#75825B]/35"
                                          : "border-black/10"
                                      }`}
                                      style={{ backgroundColor: hex }}
                                      aria-label={`Predvoľba ${hex}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            {customDraftSplit ? (
                              <div className="space-y-2">
                                <p className="text-[11px] font-medium tracking-wide text-[#2f2924]/45 uppercase">
                                  Farba 2
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/10 shadow-sm">
                                    <span
                                      className="absolute inset-0"
                                      style={{
                                        backgroundColor:
                                          customDraftHexSecondary,
                                      }}
                                      aria-hidden
                                    />
                                    <input
                                      type="color"
                                      value={customDraftHexSecondary}
                                      onChange={(event) => {
                                        const hex = event.target.value;
                                        setCustomDraftHexSecondary(hex);
                                        if (!customLabelTouched) {
                                          setCustomDraftLabel(
                                            customDraftSuggestedLabel(
                                              customDraftHex,
                                              true,
                                              hex,
                                            ),
                                          );
                                        }
                                      }}
                                      className="absolute inset-0 cursor-pointer opacity-0"
                                      aria-label="Vybrať druhú farbu"
                                    />
                                  </label>
                                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                                    {CUSTOM_COLOR_PRESETS.map((hex) => (
                                      <button
                                        key={`b-${hex}`}
                                        type="button"
                                        onClick={() => {
                                          setCustomDraftHexSecondary(hex);
                                          if (!customLabelTouched) {
                                            setCustomDraftLabel(
                                              customDraftSuggestedLabel(
                                                customDraftHex,
                                                true,
                                                hex,
                                              ),
                                            );
                                          }
                                        }}
                                        className={`size-7 cursor-pointer rounded-full border transition-transform hover:scale-105 ${
                                          customDraftHexSecondary.toLowerCase() ===
                                          hex.toLowerCase()
                                            ? "border-[#2f2924] ring-2 ring-[#75825B]/35"
                                            : "border-black/10"
                                        }`}
                                        style={{ backgroundColor: hex }}
                                        aria-label={`Predvoľba ${hex}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <p className="mb-1.5 text-sm font-medium text-[#2f2924]">
                              Názov farby
                            </p>
                            <div className="relative">
                              <input
                                type="text"
                                value={customDraftLabel}
                                onChange={(event) => {
                                  setCustomLabelTouched(true);
                                  setCustomDraftLabel(event.target.value);
                                }}
                                onFocus={() => setCustomLabelFocused(true)}
                                onBlur={() => {
                                  window.setTimeout(
                                    () => setCustomLabelFocused(false),
                                    120,
                                  );
                                }}
                                className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B]"
                                placeholder="Napr. Bordová - nájdite existujúcu farbu"
                                autoComplete="off"
                              />
                              {customLabelSuggestions.length > 0 ? (
                                <ul className="absolute top-[calc(100%+0.35rem)] z-20 max-h-52 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-[0_16px_40px_rgba(47,41,36,0.14)]">
                                  {customLabelSuggestions.map((color) => (
                                    <li key={color.id}>
                                      <button
                                        type="button"
                                        onMouseDown={(event) =>
                                          event.preventDefault()
                                        }
                                        onClick={() =>
                                          applyCatalogCustomColor(color)
                                        }
                                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                                      >
                                        <span
                                          className="size-4 shrink-0 rounded-full border border-black/10"
                                          style={colorSwatchStyle(color)}
                                          aria-hidden
                                        />
                                        <span className="min-w-0 flex-1 truncate font-medium">
                                          {color.label}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-[#2f2924]/45">
                                          {color.usageCount}× v katalógu
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#2f2924]/45">
                              Začnite písať názov - ak farba už existuje, vyberte
                              ju a znovu sa nevytvorí duplicita.
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPickerVariantId(null);
                                resetCustomDraft();
                              }}
                              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                            >
                              Zrušiť
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                addCustomColorToVariant(variant.id)
                              }
                              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                            >
                              Pridať farbu
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#2f2924]">
                        Fotky
                      </p>
                      <p className="mt-0.5 text-xs text-[#2f2924]/45">
                        Voliteľné - inak sa použijú fotky produktu.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPhotosPickerId(variant.id)}
                        disabled={images.length === 0}
                        className={`mt-3 flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          photoCount > 0
                            ? "border-[#75825B]/35 bg-white hover:bg-[#e8ebe2]/45"
                            : "border-dashed border-[#75825B]/40 bg-white hover:border-[#75825B] hover:bg-[#e8ebe2]/45"
                        }`}
                      >
                        <ImagePlus
                          className="size-4 shrink-0 text-[#75825B]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium text-[#2f2924]">
                          {photoCount > 0 ? "Upraviť fotky" : "Zvoliť fotky"}
                        </span>
                        <span
                          className={`shrink-0 text-sm ${
                            photoCount > 0
                              ? "font-medium text-[#75825B]"
                              : "text-[#2f2924]/45"
                          }`}
                        >
                          {photoCount > 0
                            ? photoCount === 1
                              ? "1 fotka"
                              : photoCount < 5
                                ? `${photoCount} fotky`
                                : `${photoCount} fotiek`
                            : "Žiadne zvolené"}
                        </span>
                      </button>
                      {images.length === 0 ? (
                        <p className="mt-2 text-xs text-[#2f2924]/45">
                          Najprv pridajte fotky v sekcii Médiá.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2.5 border-t border-black/6 pt-4">
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/25 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                      >
                        <Trash2
                          className="size-4"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Odstrániť
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:min-w-[10rem]"
                      >
                        <AdminSaveIcon />
                        Uložiť variantu
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
