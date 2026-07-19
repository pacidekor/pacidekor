import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Administrácia | PACIDEKOR",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#faf8f5]">{children}</div>
  );
}
