export type AuthArea = "customer" | "admin";

function projectRefFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split(".")[0] ?? "local";
  } catch {
    return "local";
  }
}

export function getAuthCookieName(area: AuthArea, supabaseUrl?: string) {
  const ref = projectRefFromUrl(
    supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  return area === "admin"
    ? `sb-${ref}-admin-auth-token`
    : `sb-${ref}-customer-auth-token`;
}

export function authAreaFromPathname(pathname: string): AuthArea {
  return pathname.startsWith("/admin") ? "admin" : "customer";
}

export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};
