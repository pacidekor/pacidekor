import {
  BadgePercent,
  Building2,
  FolderTree,
  LayoutDashboard,
  Newspaper,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Prehľad", icon: LayoutDashboard },
  { href: "/admin/objednavky", label: "Objednávky", icon: ShoppingCart },
  { href: "/admin/produkty", label: "Produkty", icon: Package },
  { href: "/admin/kategorie", label: "Kategórie", icon: FolderTree },
  { href: "/admin/sklad", label: "Sklad", icon: Warehouse },
  { href: "/admin/zakaznici", label: "Zákazníci", icon: Users },
  {
    href: "/admin/velkoobchodne-ucty",
    label: "Veľkoobchodné účty",
    icon: Building2,
  },
  { href: "/admin/zlavy", label: "Zľavy", icon: BadgePercent },
  { href: "/admin/obsah-webu", label: "Obsah webu", icon: Newspaper },
  { href: "/admin/nastavenia", label: "Nastavenia", icon: Settings },
];
