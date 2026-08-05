"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  FolderTree,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  type AdminCategory,
  type AdminCategoriesStore,
  type AdminSubcategory,
  readAdminCategoriesStore,
  seedAdminCategoriesStore,
  setTaxonomySnapshot,
} from "@/lib/admin-categories-store";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/lib/actions/categories";
import { getProductCatalog } from "@/lib/product-catalog";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { useTaxonomy } from "@/components/ProductCatalogProvider";

function productCountForCategory(label: string) {
  return getProductCatalog().filter((product) => product.category === label)
    .length;
}

export function AdminCategoriesManager() {
  const taxonomy = useTaxonomy();
  const [store, setStore] = useState<AdminCategoriesStore>(seedAdminCategoriesStore);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const editorOpen = creating || selectedId != null;

  useEffect(() => {
    // Don't clobber in-progress edits if a transient empty snapshot arrives.
    if (taxonomy.categories.length > 0) {
      setStore(taxonomy);
    } else if (!editorOpen) {
      setStore(readAdminCategoriesStore());
    }
    setHydrated(true);
  }, [taxonomy, editorOpen]);

  const selectedCategory = creating
    ? null
    : (store.categories.find((category) => category.id === selectedId) ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.categories;
    return store.categories.filter((category) => {
      const subs = store.subcategories.filter(
        (sub) => sub.categoryId === category.id,
      );
      const haystack = [category.label, ...subs.map((sub) => sub.label)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, store]);

  function applyStore(next: AdminCategoriesStore) {
    setStore(next);
    setTaxonomySnapshot(next);
  }

  function openCreate() {
    setCreating(true);
    setSelectedId(null);
  }

  function openCategory(id: string) {
    setCreating(false);
    setSelectedId(id);
  }

  function closeEditor() {
    setCreating(false);
    setSelectedId(null);
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  async function saveCategory(next: {
    id?: string;
    label: string;
    description: string;
    image?: string;
    subs: { id?: string; label: string }[];
  }) {
    const label = next.label.trim();
    if (!label || saving) return;

    setSaving(true);
    try {
      const result = await saveCategoryAction({
        id: creating ? undefined : next.id,
        label,
        description: next.description,
        image: next.image,
        sortOrder: creating
          ? store.categories.length
          : store.categories.find((item) => item.id === next.id)?.sortOrder,
        subs: next.subs,
      });

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      applyStore(result.data);
      flashSaved();
      closeEditor();
    } catch (error) {
      console.error("saveCategory", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Uloženie zlyhalo. Skúste to znova.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await deleteCategoryAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      applyStore(result.data);
      flashSaved();
      closeEditor();
    } catch (error) {
      console.error("deleteCategory", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Odstránenie zlyhalo. Skúste to znova.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return (
      <div>
        <div className="h-16 animate-pulse rounded-2xl bg-white/60" />
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
            Kategórie
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            Správa hlavných kategórií a ich subkategórií.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Pridať kategóriu
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hľadať kategóriu alebo subkategóriu…"
            className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
          />
        </div>

      <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase sm:flex">
          <span className="min-w-0 flex-1">Kategória</span>
          <span className="w-28 shrink-0 text-right">Subkategórie</span>
          <span className="w-20 shrink-0 text-right">Produkty</span>
          <span className="w-4 shrink-0" aria-hidden />
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-[#2f2924]">
              Žiadne kategórie
            </p>
            <p className="mt-1 text-sm text-[#2f2924]/50">
              Skúste zmeniť vyhľadávanie alebo pridajte novú kategóriu.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map((category) => {
              const subs = store.subcategories.filter(
                (sub) => sub.categoryId === category.id,
              );
              const productCount = productCountForCategory(category.label);

              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => openCategory(category.id)}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#faf8f5]"
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                      {category.image ? (
                        <Image
                          src={category.image}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[#75825B]">
                          <FolderTree className="size-5" aria-hidden />
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-[#2f2924]">
                        {category.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-[#2f2924]/45 sm:hidden">
                        {subs.length} sub · {productCount} produktov
                      </p>
                      {subs.length > 0 ? (
                        <p className="mt-1 hidden truncate text-sm text-[#2f2924]/50 sm:block">
                          {subs.map((sub) => sub.label).join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 hidden text-sm text-[#2f2924]/40 sm:block">
                          Zatiaľ bez subkategórií
                        </p>
                      )}
                    </div>

                    <p className="hidden w-28 shrink-0 text-right text-[15px] tabular-nums text-[#2f2924]/70 sm:block">
                      {subs.length}
                    </p>
                    <p className="hidden w-20 shrink-0 text-right text-[15px] tabular-nums text-[#2f2924]/70 sm:block">
                      {productCount}
                    </p>
                    <ChevronRight
                      className="size-4 shrink-0 text-[#2f2924]/25"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </div>

      {editorOpen ? (
        <CategoryEditor
          key={creating ? "__new__" : (selectedId ?? "__edit__")}
          category={selectedCategory}
          categoryId={creating ? undefined : (selectedId ?? undefined)}
          subcategories={
            selectedId
              ? store.subcategories.filter((sub) => sub.categoryId === selectedId)
              : []
          }
          isNew={creating}
          saving={saving}
          onClose={closeEditor}
          onSave={saveCategory}
          onDelete={
            selectedId && !creating
              ? () => deleteCategory(selectedId)
              : undefined
          }
        />
      ) : null}

      <div
        aria-live="polite"
        className={`fixed right-5 bottom-5 z-[60] transition-all duration-300 ${
          savedFlash
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="inline-flex items-center gap-2.5 rounded-xl bg-[#75825B] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(47,41,36,0.18)]">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/15">
            <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
          </span>
          Zmeny boli uložené
        </div>
      </div>
    </div>
  );
}

function CategoryEditor({
  category,
  categoryId,
  subcategories,
  isNew,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  category: AdminCategory | null;
  categoryId?: string;
  subcategories: AdminSubcategory[];
  isNew: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (next: {
    id?: string;
    label: string;
    description: string;
    image?: string;
    subs: { id?: string; label: string }[];
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [label, setLabel] = useState(category?.label ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [subs, setSubs] = useState<{ id?: string; label: string }[]>(() =>
    subcategories.map((sub) => ({ id: sub.id, label: sub.label })),
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelOpen = entered && !exiting;
  const busy = saving || exiting;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unlock = lockPageScroll();

    const enterFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      cancelAnimationFrame(enterFrame);
      unlock();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function closePanel() {
    if (busy) return;
    setDeleteOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 320);
  }

  function saveAndClose() {
    if (busy || !label.trim()) return;
    void onSave({
      id: categoryId ?? category?.id,
      label,
      description,
      image: image || undefined,
      subs,
    });
  }

  function confirmDelete() {
    if (!onDelete || busy) return;
    setDeleteOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      void onDelete();
    }, 320);
  }

  function updateSub(index: number, value: string) {
    setSubs((prev) =>
      prev.map((sub, i) => (i === index ? { ...sub, label: value } : sub)),
    );
  }

  function removeSub(index: number) {
    setSubs((prev) => prev.filter((_, i) => i !== index));
  }

  function addSub() {
    setSubs((prev) => [...prev, { label: "" }]);
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setImage(result);
    };
    reader.readAsDataURL(file);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className={`absolute inset-0 cursor-pointer transition-colors duration-300 ${
          panelOpen ? "bg-black/30" : "bg-black/0"
        }`}
        aria-label="Zavrieť"
        onClick={closePanel}
      />
      <div className="pointer-events-none absolute inset-0 flex justify-end">
        <aside
          className={`pointer-events-auto relative flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-editor-title"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
                {isNew ? "Nová kategória" : "Úprava kategórie"}
              </p>
              <h2
                id="category-editor-title"
                className="mt-1 truncate font-heading text-lg text-[#2f2924]"
              >
                {label.trim() || "Bez názvu"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zavrieť"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
            />

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-[#2f2924]">
                  Obrázok kategórie
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                    {image ? (
                      <CategoryThumb src={image} />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[#75825B]/50">
                        <FolderTree className="size-5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#75825B] transition-colors hover:border-[#75825B]/40 hover:bg-[#e8ebe2]/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ImagePlus
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {image ? "Vymeniť" : "Pridať"}
                    </button>
                    {image ? (
                      <button
                        type="button"
                        onClick={() => setImage("")}
                        disabled={busy}
                        className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924]/60 transition-colors hover:border-[#c45c4a]/30 hover:text-[#c45c4a] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Odstrániť
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-[#2f2924]">
                Názov kategórie
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  disabled={busy}
                  className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white disabled:opacity-60"
                  placeholder="Napr. Umelé kvety"
                />
              </label>

              <label className="block text-sm font-medium text-[#2f2924]">
                Popis
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={busy}
                  rows={3}
                  className="mt-2 min-h-[4.5rem] w-full resize-y rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3 text-sm leading-relaxed text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white disabled:opacity-60"
                  placeholder="Krátky popis kategórie…"
                />
              </label>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#2f2924]">
                      Subkategórie
                    </p>
                    <p className="mt-0.5 text-sm text-[#2f2924]/50">
                      Spravujte podkategórie priamo v tejto kategórii.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSub}
                    disabled={busy}
                    className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#75825B] transition-colors hover:border-[#75825B]/40 hover:bg-[#e8ebe2]/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-3.5" strokeWidth={1.75} aria-hidden />
                    Pridať
                  </button>
                </div>

                {subs.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-black/10 bg-[#faf8f5] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#2f2924]">
                      Zatiaľ žiadne subkategórie
                    </p>
                    <p className="mt-1 text-sm text-[#2f2924]/50">
                      Pridajte napríklad Ruže, Pivónie alebo Dálie.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {subs.map((sub, index) => (
                      <li
                        key={sub.id ?? `new-${index}`}
                        className="flex items-center gap-2"
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8ebe2] text-[#75825B]">
                          <Pencil
                            className="size-3.5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </span>
                        <input
                          type="text"
                          value={sub.label}
                          onChange={(event) =>
                            updateSub(index, event.target.value)
                          }
                          disabled={busy}
                          placeholder="Názov subkategórie"
                          className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => removeSub(index)}
                          disabled={busy}
                          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/40 transition-colors hover:bg-[#c45c4a]/10 hover:text-[#c45c4a] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Odstrániť subkategóriu"
                        >
                          <Trash2
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                  Odstrániť
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveAndClose}
                disabled={!label.trim() || busy}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:px-8"
              >
                {saving ? "Ukladám…" : "Uložiť"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {deleteOpen ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="delete-category-title"
              className="font-heading text-lg text-[#2f2924]"
            >
              Odstrániť kategóriu?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
              Odstráni sa aj so všetkými subkategóriami. Túto akciu nie je možné
              vrátiť späť.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Odstrániť
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function CategoryThumb({ src }: { src: string }) {
  const isLocalPath = src.startsWith("/");

  if (isLocalPath) {
    return (
      <Image src={src} alt="" fill sizes="64px" className="object-cover" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
  );
}
