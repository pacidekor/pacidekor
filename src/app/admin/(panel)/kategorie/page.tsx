import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { categories } from "@/lib/navigation";
import { getSubcategoriesForCategory } from "@/lib/taxonomy";

export default function AdminKategoriePage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Kategórie"
        description="Prehľad hlavných kategórií a ich subkategórií (číselník)."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((label) => {
          const subs = getSubcategoriesForCategory(label);

          return (
            <article
              key={label}
              className="rounded-2xl border border-black/6 bg-white px-5 py-5"
            >
              <h2 className="font-heading text-lg text-[#2f2924]">{label}</h2>
              {subs.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {subs.map((sub) => (
                    <li
                      key={sub.id}
                      className="rounded-md bg-[#e8ebe2] px-2 py-1 text-xs text-[#2f2924]/75"
                    >
                      {sub.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#2f2924]/45">
                  Zatiaľ bez subkategórií
                </p>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
