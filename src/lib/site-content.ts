import {
  blogPosts as seedBlogPosts,
  type BlogPost,
} from "@/lib/blog";

export const SITE_CONTENT_STORAGE_KEY = "pacidekor.admin.site-content";
export const SITE_CONTENT_EVENT = "pacidekor:site-content-changed";

export type ContactStore = {
  id: string;
  name: string;
  address: string;
  mapsQuery?: string;
  phone?: string;
  hours?: string;
};

export type SiteContactContent = {
  company: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  stores: ContactStore[];
};

export type SiteContentStore = {
  blogPosts: BlogPost[];
  contact: SiteContactContent;
};

export function seedSiteContent(): SiteContentStore {
  return {
    blogPosts: seedBlogPosts.map((post) => ({
      ...post,
      content: post.content.map((block) =>
        block.type === "list"
          ? { ...block, items: [...block.items] }
          : { ...block },
      ),
    })),
    contact: {
      company: "PACIDEKOR s.r.o.",
      phone: "0900 123 456",
      phoneHref: "tel:+421900123456",
      email: "info@pacidekor.sk",
      address: "Kráľová nad Váhom 283",
      stores: [
        {
          id: "store-mia-1",
          name: "Kvetinárstvo Mia I.",
          address: "SNP 43, Šaľa (budova Billa)",
          mapsQuery: "SNP 43, Šaľa Billa",
          phone: "+421 911 571 255",
        },
        {
          id: "store-mia-2",
          name: "Kvetinárstvo Mia II.",
          address: "Kráľovská 779/9, Šaľa",
          mapsQuery: "Kráľovská 779/9, Šaľa",
          phone: "+421 918 911 474",
        },
        {
          id: "store-warehouse",
          name: "Veľkosklad",
          address: "Kráľová nad Váhom 283",
          mapsQuery: "Kráľová nad Váhom 283",
        },
      ],
    },
  };
}

function isBlogPost(value: unknown): value is BlogPost {
  if (!value || typeof value !== "object") return false;
  const item = value as BlogPost;
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.excerpt === "string" &&
    typeof item.coverImage === "string" &&
    typeof item.category === "string" &&
    typeof item.author === "string" &&
    typeof item.publishedAt === "string" &&
    Array.isArray(item.content)
  );
}

function isContactStore(value: unknown): value is ContactStore {
  if (!value || typeof value !== "object") return false;
  const item = value as ContactStore;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.address === "string"
  );
}

function normalizeStore(parsed: Partial<SiteContentStore>): SiteContentStore {
  const seed = seedSiteContent();
  return {
    blogPosts: Array.isArray(parsed.blogPosts)
      ? parsed.blogPosts.filter(isBlogPost)
      : seed.blogPosts,
    contact: {
      company: parsed.contact?.company ?? seed.contact.company,
      phone: parsed.contact?.phone ?? seed.contact.phone,
      phoneHref: parsed.contact?.phoneHref ?? seed.contact.phoneHref,
      email: parsed.contact?.email ?? seed.contact.email,
      address: parsed.contact?.address ?? seed.contact.address,
      stores: Array.isArray(parsed.contact?.stores)
        ? parsed.contact.stores.filter(isContactStore)
        : seed.contact.stores,
    },
  };
}

export function readSiteContent(): SiteContentStore {
  if (typeof window === "undefined") return seedSiteContent();
  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!raw) return seedSiteContent();
    const parsed = JSON.parse(raw) as Partial<SiteContentStore>;
    return normalizeStore(parsed);
  } catch {
    return seedSiteContent();
  }
}

export function writeSiteContent(store: SiteContentStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(SITE_CONTENT_EVENT));
}

export function getManagedBlogPosts(store: SiteContentStore = seedSiteContent()) {
  return [...store.blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function getManagedBlogPostBySlug(
  slug: string,
  store: SiteContentStore = seedSiteContent(),
) {
  return store.blogPosts.find((post) => post.slug === slug);
}

export function createStoreId() {
  return `store-${Date.now()}`;
}
