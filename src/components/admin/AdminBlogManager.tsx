"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Info,
  Newspaper,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  formatBlogDate,
  type BlogBlock,
  type BlogCategory,
  type BlogPost,
  type BlogPostWithId,
} from "@/lib/blog";
import {
  deleteBlogPostAction,
  listBlogPostsAction,
  saveBlogPostAction,
} from "@/lib/actions/blog";
import { uploadCompressedAdminImage } from "@/lib/admin-image-upload";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { toSlug } from "@/lib/navigation";

const BLOG_CATEGORIES: BlogCategory[] = [
  "Inšpirácia",
  "Tipy",
  "Sezóna",
  "Novinky",
  "Ako na to",
];

export function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPostWithId[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void listBlogPostsAction().then((result) => {
      if (result.ok) setPosts(result.data);
      setHydrated(true);
    });
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  function flashSaved() {
    setSavedFlash(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2200);
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
            Blog
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            Správa blogových článkov.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditingSlug(null);
          }}
          className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:self-start"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Pridať článok
        </button>
      </div>

      <div className="mt-5">
        <BlogTab
          posts={posts}
          saving={saving}
          onPostsChange={setPosts}
          onSaved={flashSaved}
          onSavingChange={setSaving}
          creating={creating}
          editingSlug={editingSlug}
          onCreatingChange={setCreating}
          onEditingSlugChange={setEditingSlug}
        />
      </div>

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

function BlogTab({
  posts,
  saving,
  onPostsChange,
  onSaved,
  onSavingChange,
  creating,
  editingSlug,
  onCreatingChange,
  onEditingSlugChange,
}: {
  posts: BlogPostWithId[];
  saving: boolean;
  onPostsChange: (next: BlogPostWithId[]) => void;
  onSaved: () => void;
  onSavingChange: (value: boolean) => void;
  creating: boolean;
  editingSlug: string | null;
  onCreatingChange: (value: boolean) => void;
  onEditingSlugChange: (value: string | null) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...posts].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
    if (!q) return list;
    return list.filter((post) =>
      [post.title, post.category, post.author, post.slug]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, posts]);

  const editing = creating
    ? null
    : (posts.find((post) => post.slug === editingSlug) ?? null);

  async function savePost(post: BlogPost, previousSlug?: string) {
    if (saving) return;
    onSavingChange(true);
    try {
      const result = await saveBlogPostAction({
        id: editing?.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        category: post.category,
        author: post.author,
        publishedAt: post.publishedAt,
        content: post.content,
      });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onPostsChange(result.data);
      onSaved();
      onCreatingChange(false);
      onEditingSlugChange(null);
      void previousSlug;
    } finally {
      onSavingChange(false);
    }
  }

  async function deletePost(post: BlogPostWithId) {
    if (saving) return;
    onSavingChange(true);
    try {
      const result = await deleteBlogPostAction(post.id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onPostsChange(result.data);
      onSaved();
      onCreatingChange(false);
      onEditingSlugChange(null);
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full min-w-0 max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hľadať článok…"
            className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e8ebe2] text-[#75825B]">
              <Newspaper className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-[#2f2924]">
              Žiadne články
            </p>
            <p className="mt-1 text-sm text-[#2f2924]/50">
              Pridajte prvý blogový článok.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map((post) => (
              <li key={post.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onCreatingChange(false);
                    onEditingSlugChange(post.slug);
                  }}
                  className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#faf8f5]"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt=""
                        fill
                        sizes="56px"
                        unoptimized={post.coverImage.startsWith("data:")}
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[#75825B]">
                        <Newspaper className="size-5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-[#2f2924]">
                      {post.title}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[#2f2924]/45">
                      {post.category} · {formatBlogDate(post.publishedAt)} ·{" "}
                      {post.author}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-[#2f2924]/25"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating || editing ? (
        <BlogEditor
          key={creating ? "__new__" : editing!.slug}
          post={editing}
          isNew={creating}
          existingSlugs={posts.map((post) => post.slug)}
          onClose={() => {
            onCreatingChange(false);
            onEditingSlugChange(null);
          }}
          onSave={savePost}
          onDelete={editing ? () => deletePost(editing) : undefined}
        />
      ) : null}
    </div>
  );
}

function BlogEditor({
  post,
  isNew,
  existingSlugs,
  onClose,
  onSave,
  onDelete,
}: {
  post: BlogPost | null;
  isNew: boolean;
  existingSlugs: string[];
  onClose: () => void;
  onSave: (post: BlogPost, previousSlug?: string) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [category, setCategory] = useState<BlogCategory>(
    post?.category ?? "Inšpirácia",
  );
  const [author, setAuthor] = useState(post?.author ?? "PACIDEKOR");
  const [publishedAt, setPublishedAt] = useState(
    post?.publishedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [content, setContent] = useState<BlogBlock[]>(
    post?.content ?? [{ type: "paragraph", text: "" }],
  );

  const previousSlug = post?.slug;

  function resolveSlug() {
    if (!isNew && previousSlug) return previousSlug;
    return uniqueBlogSlug(title, existingSlugs);
  }

  function save() {
    if (!title.trim()) return;
    const slug = resolveSlug();
    if (!slug) return;
    onSave(
      {
        slug,
        title: title.trim(),
        excerpt: excerpt.trim(),
        coverImage: coverImage.trim() || "/banner2.webp",
        category,
        author: author.trim() || "PACIDEKOR",
        publishedAt,
        content: content.filter((block) => {
          if (block.type === "list") return block.items.some((item) => item.trim());
          return block.text.trim().length > 0;
        }),
      },
      previousSlug,
    );
  }

  return (
    <SlideOver
      title={isNew ? "Nový článok" : "Úprava článku"}
      subtitle={title.trim() || "Blog"}
      onClose={onClose}
      onSave={save}
      canSave={Boolean(title.trim())}
      onDelete={onDelete}
      deleteLabel="Odstrániť článok"
    >
      <label className="block text-sm font-medium text-[#2f2924]">
        Názov článku
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Napr. Jarné trendy v dekoráciách"
          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
        />
      </label>

      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-[#2f2924]">
          Úvod
          <InfoHint text="Krátky text, ktorý sa zobrazí v zozname článkov." />
        </div>
        <textarea
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          rows={3}
          placeholder="O čom článok je…"
          className="mt-2 w-full resize-y rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
        />
      </div>

      <CoverImageField value={coverImage} onChange={setCoverImage} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-[#2f2924]">Kategória</p>
          <div className="mt-2">
            <SelectField
              value={category}
              options={BLOG_CATEGORIES.map((item) => ({
                value: item,
                label: item,
              }))}
              onChange={(value) => setCategory(value as BlogCategory)}
            />
          </div>
        </div>
        <label className="block text-sm font-medium text-[#2f2924]">
          Dátum
          <input
            type="date"
            value={publishedAt}
            onChange={(event) => setPublishedAt(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none focus:border-[#75825B] focus:bg-white"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-[#2f2924]">
        Autor
        <input
          type="text"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none focus:border-[#75825B] focus:bg-white"
        />
      </label>

      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-[#2f2924]">
          Text článku
          <InfoHint text="Pridávajte odstavce, nadpisy a zoznamy." />
        </div>
        <div className="mt-2 flex gap-1.5">
          {(
            [
              ["paragraph", "Odstavec"],
              ["heading", "Nadpis"],
              ["list", "Zoznam"],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setContent((prev) => [
                  ...prev,
                  type === "list"
                    ? { type, items: [""] }
                    : { type, text: "" },
                ])
              }
              className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-2 text-xs font-medium text-[#75825B] transition-colors hover:bg-[#e8ebe2]/40 sm:flex-none sm:px-3"
            >
              + {label}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-3">
          {content.map((block, index) => (
            <li
              key={index}
              className="rounded-xl border border-black/8 bg-[#faf8f5] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
                  {block.type === "paragraph"
                    ? "Odstavec"
                    : block.type === "heading"
                      ? "Nadpis"
                      : "Zoznam"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setContent((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/40 transition-colors hover:bg-white hover:text-[#c45c4a]"
                  aria-label="Odstrániť blok"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
              {block.type === "list" ? (
                <div className="space-y-2">
                  {block.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(event) =>
                          setContent((prev) =>
                            prev.map((entry, i) => {
                              if (i !== index || entry.type !== "list") {
                                return entry;
                              }
                              const items = [...entry.items];
                              items[itemIndex] = event.target.value;
                              return { ...entry, items };
                            }),
                          )
                        }
                        className="h-10 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm text-[#2f2924] outline-none focus:border-[#75825B]"
                        placeholder={`Položka ${itemIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setContent((prev) =>
                            prev.map((entry, i) => {
                              if (i !== index || entry.type !== "list") {
                                return entry;
                              }
                              const items = entry.items.filter(
                                (_, idx) => idx !== itemIndex,
                              );
                              return {
                                ...entry,
                                items: items.length > 0 ? items : [""],
                              };
                            }),
                          )
                        }
                        disabled={block.items.length <= 1}
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/40 transition-colors hover:bg-white hover:text-[#c45c4a] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#2f2924]/40"
                        aria-label={`Odstrániť položku ${itemIndex + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setContent((prev) =>
                        prev.map((entry, i) =>
                          i === index && entry.type === "list"
                            ? { ...entry, items: [...entry.items, ""] }
                            : entry,
                        ),
                      )
                    }
                    className="text-xs font-medium text-[#75825B]"
                  >
                    + Položka
                  </button>
                </div>
              ) : (
                <textarea
                  value={block.text}
                  onChange={(event) =>
                    setContent((prev) =>
                      prev.map((entry, i) =>
                        i === index && entry.type !== "list"
                          ? { ...entry, text: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  rows={block.type === "heading" ? 2 : 4}
                  placeholder={
                    block.type === "heading"
                      ? "Text nadpisu…"
                      : "Text odstavca…"
                  }
                  className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B]"
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </SlideOver>
  );
}

function uniqueBlogSlug(title: string, existingSlugs: string[]) {
  const base = toSlug(title.trim()) || "clanok";
  if (!existingSlugs.includes(base)) return base;
  let suffix = 2;
  while (existingSlugs.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function CoverImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;

    setUploading(true);
    try {
      const result = await uploadCompressedAdminImage(file);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onChange(result.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#2f2924]">Úvodný obrázok</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              sizes="80px"
              unoptimized={value.startsWith("data:")}
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-[#75825B]/45">
              <ImagePlus className="size-5" aria-hidden />
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelected}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#75825B] transition-colors hover:bg-[#e8ebe2]/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ImagePlus className="size-3.5" aria-hidden />
            {uploading ? "Komprimujem…" : value ? "Vymeniť" : "Nahrať"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#c45c4a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Odstrániť
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.top - 8,
      left: rect.left,
    });
  }

  function show() {
    updatePosition();
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full text-[#2f2924]/40 transition-colors hover:text-[#75825B]"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {open
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[80] w-56 -translate-y-full rounded-lg border border-black/8 bg-white px-2.5 py-2 text-xs font-normal leading-relaxed text-[#2f2924]/75 shadow-[0_8px_24px_rgba(47,41,36,0.12)]"
              style={{ top: coords.top, left: coords.left }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function SelectField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-left text-sm text-[#2f2924] outline-none transition-colors hover:border-[#75825B]/40 focus:border-[#75825B] focus:bg-white ${
          open ? "border-[#75825B] bg-white" : ""
        }`}
      >
        <span className="truncate">{selected?.label ?? "Vybrať"}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#2f2924]/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-black/8 bg-white p-1.5 shadow-[0_12px_32px_rgba(47,41,36,0.12)]"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[#e8ebe2] font-medium text-[#2f2924]"
                      : "text-[#2f2924]/80 hover:bg-[#faf8f5]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive ? (
                    <Check
                      className="size-3.5 shrink-0 text-[#75825B]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function SlideOver({
  title,
  subtitle,
  onClose,
  onSave,
  canSave,
  onDelete,
  deleteLabel,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelOpen = entered && !exiting;

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
    if (exiting) return;
    setDeleteOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => onClose(), 320);
  }

  function confirmDelete() {
    if (!onDelete || exiting) return;
    setDeleteOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => onDelete(), 320);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        panelOpen ? "bg-black/30" : "bg-black/0"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={closePanel}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              {title}
            </p>
            <h2 className="mt-1 truncate font-heading text-lg text-[#2f2924]">
              {subtitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2]"
            aria-label="Zavrieť"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          {children}
        </div>

        <div className="shrink-0 border-t border-black/6 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {onDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={exiting}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#c45c4a]/30 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8 disabled:opacity-40"
              >
                {deleteLabel ?? "Odstrániť"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || exiting}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:px-8"
            >
              Uložiť
            </button>
          </div>
        </div>

        {deleteOpen ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]">
              <h3 className="font-heading text-lg text-[#2f2924]">
                Naozaj odstrániť?
              </h3>
              <p className="mt-2 text-sm text-[#2f2924]/65">
                Túto akciu nie je možné vrátiť späť.
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-sm font-medium"
                >
                  Zrušiť
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] text-sm font-medium text-white"
                >
                  Odstrániť
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
