import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  Sk,
} from "@/components/admin/AdminSkeleton";

/** Prehľad (`/admin`) — KPI karty + 2 panely + graf/top. */
export default function AdminOverviewLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton titleClassName="h-8 w-28 sm:h-9" />

      <section className="mt-5" aria-hidden>
        <div className="-mx-4 overflow-hidden px-4 lg:mx-0 lg:px-0">
          <div className="flex w-max gap-3 lg:grid lg:w-full lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex w-[min(72vw,17.5rem)] shrink-0 flex-col rounded-2xl border border-black/[0.06] bg-white px-4 py-4 lg:w-auto"
              >
                <div className="flex items-start justify-between gap-2">
                  <Sk className="h-3.5 w-24" />
                  <Sk className="size-4 rounded-md" />
                </div>
                <Sk className="mt-4 h-9 w-20" />
                <Sk className="mt-3 h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <Sk className="h-5 w-56" />
            <Sk className="h-5 w-8 rounded-md" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-36" />
                  <Sk className="h-3 w-24" />
                </div>
                <Sk className="h-6 w-20 rounded-md" />
                <Sk className="h-4 w-14" />
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <Sk className="h-5 w-40" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-4">
                <Sk className="size-5 rounded-md" />
                <Sk className="h-4 flex-1" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <Sk className="h-5 w-48" />
            <Sk className="h-5 w-20" />
          </div>
          <div className="border-t border-black/[0.05] px-3 py-5">
            <Sk className="h-48 w-full rounded-xl" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <Sk className="h-5 w-52" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Sk className="size-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-40" />
                  <Sk className="h-3 w-20" />
                </div>
                <Sk className="h-4 w-14" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminLoadingShell>
  );
}
