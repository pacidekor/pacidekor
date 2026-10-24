import { notFound } from "next/navigation";
import { SalesUnitPreview } from "@/components/admin/SalesUnitPreview";

export const metadata = { title: "Lokálna ukážka: kus / sada", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV !== "development" || process.env.PACIDEKOR_SALES_PREVIEW !== "1") notFound();
  return <SalesUnitPreview />;
}
