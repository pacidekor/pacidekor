import { Bell } from "lucide-react";

type BellIconProps = {
  className?: string;
  title?: string;
};

/** Lucide bell — matches the rest of the storefront icons. */
export function BellIcon({ className, title }: BellIconProps) {
  return (
    <Bell
      className={className}
      strokeWidth={1.75}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    />
  );
}
