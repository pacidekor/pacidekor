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
  birth_date: string | null;
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
  birth_date?: string | null;
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
  druh_id: string | null;
  color_ids: string[];
  color_image_map: Record<string, number[]>;
  packaging: PackagingJson[];
  details: ProductDetailJson[];
  images: string[];
  in_stock: boolean;
  stock_quantity: number | null;
  is_new: boolean;
  new_until: string | null;
  in_vypredaj: boolean;
  is_bestseller: boolean;
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
  druh_id?: string | null;
  color_ids?: string[];
  color_image_map?: Record<string, number[]>;
  packaging?: PackagingJson[];
  details?: ProductDetailJson[];
  images?: string[];
  in_stock?: boolean;
  stock_quantity?: number | null;
  is_new?: boolean;
  new_until?: string | null;
  in_vypredaj?: boolean;
  is_bestseller?: boolean;
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

export type DruhRow = {
  id: string;
  category_id: string;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DruhInsert = {
  id: string;
  category_id: string;
  label: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type DruhUpdate = Partial<Omit<DruhInsert, "id">>;

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

export type PromoCodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_order_eur: number | null;
  max_uses: number | null;
  used_count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  customer_ico: string | null;
  customer_dic: string | null;
  customer_street: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
  note: string | null;
  shipping_method: string;
  payment_method: string;
  packeta_point_id: string | null;
  packeta_point_name: string | null;
  packeta_packet_id: string | null;
  gopay_payment_id: string | null;
  subtotal_eur: number;
  discount_eur: number;
  promo_code: string | null;
  shipping_cost_eur: number;
  total_eur: number;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  color_id: string | null;
  created_at: string;
};

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
      druhy: {
        Row: DruhRow;
        Insert: DruhInsert;
        Update: DruhUpdate;
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
      promo_codes: {
        Row: PromoCodeRow;
        Insert: Partial<PromoCodeRow> & { code: string; discount_percent: number };
        Update: Partial<PromoCodeRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & {
          order_number: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          customer_street: string;
          customer_city: string;
          customer_zip: string;
          shipping_method: string;
          payment_method: string;
          subtotal_eur: number;
          total_eur: number;
        };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Partial<OrderItemRow> & {
          order_id: string;
          product_id: string;
          product_name: string;
          unit_price: string;
          quantity: number;
        };
        Update: Partial<OrderItemRow>;
        Relationships: [];
      };
      email_verification_codes: {
        Row: {
          email: string;
          code_hash: string;
          purpose: "retail_register" | "wholesale_register";
          customer_name: string | null;
          company_name: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          email: string;
          code_hash: string;
          purpose: "retail_register" | "wholesale_register";
          customer_name?: string | null;
          company_name?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<{
          email: string;
          code_hash: string;
          purpose: "retail_register" | "wholesale_register";
          customer_name: string | null;
          company_name: string | null;
          expires_at: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          email: string;
          name: string | null;
          unsubscribe_token: string;
          active: boolean;
          subscribed_at: string;
          unsubscribed_at: string | null;
        };
        Insert: {
          email: string;
          name?: string | null;
          unsubscribe_token: string;
          active?: boolean;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
        };
        Update: Partial<{
          email: string;
          name: string | null;
          unsubscribe_token: string;
          active: boolean;
          subscribed_at: string;
          unsubscribed_at: string | null;
        }>;
        Relationships: [];
      };
      birthday_emails_sent: {
        Row: {
          profile_id: string;
          year: number;
          promo_code: string;
          sent_at: string;
        };
        Insert: {
          profile_id: string;
          year: number;
          promo_code: string;
          sent_at?: string;
        };
        Update: Partial<{
          profile_id: string;
          year: number;
          promo_code: string;
          sent_at: string;
        }>;
        Relationships: [];
      };
      invoice_sequences: {
        Row: {
          year: number;
          last_number: number;
        };
        Insert: {
          year: number;
          last_number?: number;
        };
        Update: Partial<{
          year: number;
          last_number: number;
        }>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          order_id: string;
          invoice_number: string;
          variable_symbol: string;
          issued_at: string;
          due_at: string;
          currency: string;
          subtotal_ex_vat: number;
          vat_amount: number;
          total_inc_vat: number;
          payment_method: string;
          paid: boolean;
          customer: {
            name: string;
            address: string;
            ico?: string;
            dic?: string;
            email?: string;
          };
          items: Array<{
            description: string;
            quantity: number;
            unitPriceExVat: number;
            lineTotalExVat: number;
          }>;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          invoice_number: string;
          variable_symbol: string;
          issued_at: string;
          due_at: string;
          currency?: string;
          subtotal_ex_vat: number;
          vat_amount: number;
          total_inc_vat: number;
          payment_method: string;
          paid?: boolean;
          customer: {
            name: string;
            address: string;
            ico?: string;
            dic?: string;
            email?: string;
          };
          items: Array<{
            description: string;
            quantity: number;
            unitPriceExVat: number;
            lineTotalExVat: number;
          }>;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          order_id: string;
          invoice_number: string;
          variable_symbol: string;
          issued_at: string;
          due_at: string;
          currency: string;
          subtotal_ex_vat: number;
          vat_amount: number;
          total_inc_vat: number;
          payment_method: string;
          paid: boolean;
          customer: {
            name: string;
            address: string;
            ico?: string;
            dic?: string;
            email?: string;
          };
          items: Array<{
            description: string;
            quantity: number;
            unitPriceExVat: number;
            lineTotalExVat: number;
          }>;
          created_at: string;
        }>;
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
      next_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      next_invoice_number: {
        Args: Record<string, never>;
        Returns: string;
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
