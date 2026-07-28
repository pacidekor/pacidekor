export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-dvh bg-[#faf8f5]">{children}</div>;
}
