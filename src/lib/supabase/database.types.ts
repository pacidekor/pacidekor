export type CustomerType = "maloobchod" | "velkoobchod";
export type CustomerStatus =
  | "aktivny"
  | "ziada_registraciu"
  | "zamietnuty"
  | "zablokovany";
export type AppRole = "customer" | "admin";

export type ProfileRow = {
  id: string;
  role: AppRole;
  type: CustomerType;
  status: CustomerStatus;
  name: string;
  email: string;
  username: string | null;
  phone: string;
  company: string | null;
  ico: string | null;
  dic: string | null;
  street: string;
  city: string;
  zip: string;
  country: string;
  note: string | null;
  created_at: string;
  registered_at: string | null;
};

export type ProfileInsert = {
  id: string;
  role?: AppRole;
  type: CustomerType;
  status: CustomerStatus;
  name: string;
  email: string;
  username?: string | null;
  phone?: string;
  company?: string | null;
  ico?: string | null;
  dic?: string | null;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  note?: string | null;
  created_at?: string;
  registered_at?: string | null;
};

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export type PackagingJson = {
  id: string;
  pieces: number;
  label?: string;
};

export type ProductDetailJson = {
  title: string;
  content: string;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sku: string | null;
  price: string;
  original_price: string | null;
  discount: number | null;
  category: string;
  subcategory_id: string | null;
  color_ids: string[];
  color_image_map: Record<string, number[]>;
  packaging: PackagingJson[];
  details: ProductDetailJson[];
  images: string[];
  in_stock: boolean;
  stock_quantity: number | null;
  is_new: boolean;
  new_until: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  sku?: string | null;
  price?: string;
  original_price?: string | null;
  discount?: number | null;
  category: string;
  subcategory_id?: string | null;
  color_ids?: string[];
  color_image_map?: Record<string, number[]>;
  packaging?: PackagingJson[];
  details?: ProductDetailJson[];
  images?: string[];
  in_stock?: boolean;
  stock_quantity?: number | null;
  is_new?: boolean;
  new_until?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductUpdate = Partial<Omit<ProductInsert, "id">>;

export type ProductDiscountRow = {
  id: string;
  product_id: string;
  original_price: string;
  sale_price: string;
  discount_percent: number;
  show_on_akcia_page: boolean;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductDiscountInsert = {
  id?: string;
  product_id: string;
  original_price: string;
  sale_price: string;
  discount_percent: number;
  show_on_akcia_page?: boolean;
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductDiscountUpdate = Partial<
  Omit<ProductDiscountInsert, "id">
>;

export type CategoryRow = {
  id: string;
  label: string;
  image: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryInsert = {
  id: string;
  label: string;
  image?: string | null;
  description?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type CategoryUpdate = Partial<Omit<CategoryInsert, "id">>;

export type SubcategoryRow = {
  id: string;
  category_id: string;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SubcategoryInsert = {
  id: string;
  category_id: string;
  label: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type SubcategoryUpdate = Partial<Omit<SubcategoryInsert, "id">>;

export type FavoriteRow = {
  user_id: string;
  product_id: string;
  created_at: string;
};

export type FavoriteInsert = {
  user_id: string;
  product_id: string;
  created_at?: string;
};

export type CartItemRow = {
  user_id: string;
  product_id: string;
  quantity: number;
  color_id: string | null;
  updated_at: string;
  created_at: string;
};

export type CartItemInsert = {
  user_id: string;
  product_id: string;
  quantity: number;
  color_id?: string | null;
  updated_at?: string;
  created_at?: string;
};

export type CartItemUpdate = Partial<
  Omit<CartItemInsert, "user_id" | "product_id">
>;

export type BlogBlockJson =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string;
  category: string;
  author: string;
  published_at: string;
  content: BlogBlockJson[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogPostInsert = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image?: string;
  category?: string;
  author?: string;
  published_at?: string;
  content?: BlogBlockJson[];
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type BlogPostUpdate = Partial<Omit<BlogPostInsert, "id">>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      product_discounts: {
        Row: ProductDiscountRow;
        Insert: ProductDiscountInsert;
        Update: ProductDiscountUpdate;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [];
      };
      subcategories: {
        Row: SubcategoryRow;
        Insert: SubcategoryInsert;
        Update: SubcategoryUpdate;
        Relationships: [];
      };
      favorites: {
        Row: FavoriteRow;
        Insert: FavoriteInsert;
        Update: Partial<FavoriteInsert>;
        Relationships: [];
      };
      cart_items: {
        Row: CartItemRow;
        Insert: CartItemInsert;
        Update: CartItemUpdate;
        Relationships: [];
      };
      blog_posts: {
        Row: BlogPostRow;
        Insert: BlogPostInsert;
        Update: BlogPostUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      adjust_product_stock: {
        Args: { p_product_id: string; p_delta: number };
        Returns: {
          out_in_stock: boolean;
          out_stock_quantity: number | null;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      customer_type: CustomerType;
      customer_status: CustomerStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
