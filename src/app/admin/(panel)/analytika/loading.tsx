import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  Sk,
} from "@/components/admin/AdminSkeleton";

export default function AdminAnalytikaLoading() {
  return (
    <AdminLoadingShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminHeaderSkeleton
          titleClassName="h-8 w-32 sm:h-9"
          descriptionClassName="mt-3 h-4 w-full max-w-md"
        />
        <div className="flex gap-2">
          <Sk className="h-9 w-20 rounded-full" />
          <Sk className="h-9 w-24 rounded-full" />
          <Sk className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4"
          >
            <Sk className="h-3.5 w-24" />
            <Sk className="mt-4 h-8 w-28" />
            <Sk className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4"
          >
            <Sk className="h-3.5 w-28" />
            <Sk className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white xl:col-span-2">
          <div className="px-4 pt-4 pb-3">
            <Sk className="h-5 w-40" />
          </div>
          <div className="border-t border-black/[0.05] px-3 py-5">
            <Sk className="h-56 w-full rounded-xl" />
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <Sk className="h-5 w-36" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Sk className="size-9 rounded-lg" />
                <Sk className="h-4 flex-1" />
                <Sk className="h-4 w-12" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminLoadingShell>
  );
}
