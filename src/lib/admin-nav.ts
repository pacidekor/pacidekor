import {
  BadgePercent,
  ChartLine,
  FolderTree,
  LayoutDashboard,
  Newspaper,
  Package,
  ShoppingCart,
  Users,
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
  { href: "/admin/zakaznici", label: "Zákazníci", icon: Users },
  { href: "/admin/zlavy", label: "Zľavy", icon: BadgePercent },
  { href: "/admin/analytika", label: "Analytika", icon: ChartLine },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
];
