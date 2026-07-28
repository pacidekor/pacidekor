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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
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
