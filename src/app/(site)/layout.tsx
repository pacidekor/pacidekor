import { ChatFab } from "@/components/ChatFab";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NavBar } from "@/components/NavBar";
import { ScrollToTop } from "@/components/ScrollToTop";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ScrollToTop />
      <div className="sticky top-0 z-50">
        <Header />
        <NavBar />
      </div>
      <div className="mx-auto flex w-[var(--content-width)] flex-1 flex-col">
        {children}
      </div>
      <Footer />
      <ChatFab />
    </>
  );
}
