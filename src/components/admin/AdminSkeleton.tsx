/** Shared pulse blocks + section-accurate skeletons for admin `loading.tsx`. */

export function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#e8ebe2] ${className}`}
      aria-hidden
    />
  );
}

export function AdminLoadingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6"
      aria-busy="true"
      aria-label="Načítavam sekciu"
    >
      {children}
    </main>
  );
}

export function AdminHeaderSkeleton({
  titleClassName = "h-8 w-40 sm:h-9",
  descriptionClassName = "mt-3 h-4 w-full max-w-md",
  action = false,
  actionClassName = "h-11 w-full sm:w-40",
}: {
  titleClassName?: string;
  descriptionClassName?: string;
  action?: boolean;
  actionClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <Sk className={titleClassName} />
        <Sk className={descriptionClassName} />
      </div>
      {action ? <Sk className={actionClassName} /> : null}
    </div>
  );
}

export function AdminSearchFilterSkeleton({
  filter = true,
}: {
  filter?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5 sm:gap-3">
      <Sk
        className={
          filter
            ? "h-11 min-w-0 flex-[7] sm:max-w-md sm:flex-1"
            : "h-11 w-full max-w-md"
        }
      />
      {filter ? (
        <Sk className="h-11 min-w-0 flex-[3] sm:w-28 sm:flex-none" />
      ) : null}
    </div>
  );
}

/* ─── Prehľad ─── */

export function AdminOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-28 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-lg"
      />

      <section className="mt-5" aria-hidden>
        <div className="-mx-4 overflow-hidden px-4 lg:mx-0 lg:px-0">
          <div className="flex w-max gap-3 lg:grid lg:w-full lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex w-[min(72vw,17.5rem)] shrink-0 flex-col rounded-2xl border border-black/[0.06] bg-white px-4 py-4 sm:py-5 lg:w-auto"
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
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <Sk className="h-5 w-56" />
            <Sk className="h-5 w-8 rounded-md" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-36" />
                  <Sk className="h-3 w-20" />
                  <Sk className="h-3 w-24" />
                </div>
                <Sk className="h-6 w-20 rounded-md" />
                <Sk className="h-4 w-14" />
              </li>
            ))}
          </ul>
          <div className="border-t border-black/[0.05] px-4 py-3">
            <Sk className="h-4 w-44" />
          </div>
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
                <Sk className="size-3.5 rounded-md" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
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
                <Sk className="h-3 w-3" />
                <Sk className="size-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-3.5 w-36 max-w-full" />
                  <Sk className="h-3 w-20" />
                </div>
                <Sk className="h-4 w-12" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <Sk className="h-5 w-44" />
          <Sk className="h-4 w-28" />
        </div>
        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1 space-y-2">
                <Sk className="h-4 w-36" />
                <Sk className="h-3 w-20" />
                <Sk className="h-3 w-24" />
              </div>
              <Sk className="h-6 w-20 rounded-md" />
              <Sk className="h-4 w-14" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ─── Produkty / Sklad (desktop tabuľka + mobilné karty) ─── */

function ProductsDesktopRow() {
  return (
    <tr className="border-b border-black/5 last:border-b-0">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Sk className="size-11 shrink-0 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Sk className="h-4 w-40 max-w-full" />
            <Sk className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-4 w-24" />
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-4 w-28" />
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-4 w-16" />
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-6 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <Sk className="h-7 w-28 rounded-lg" />
          <Sk className="h-7 w-20 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function ProductsMobileCard() {
  return (
    <li className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Sk className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Sk className="h-4 w-40 max-w-full" />
          <Sk className="h-3 w-24" />
          <Sk className="h-3 w-32" />
          <Sk className="h-4 w-20" />
          <Sk className="h-6 w-24 rounded-md" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Sk className="h-10 flex-1 rounded-xl" />
        <Sk className="h-10 flex-1 rounded-xl" />
      </div>
    </li>
  );
}

export function AdminProductsListSkeleton({
  rows = 8,
}: {
  rows?: number;
}) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-36 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-lg"
        action
        actionClassName="h-11 w-full sm:w-36"
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />

        <div className="overflow-hidden rounded-2xl border border-black/6 bg-white lg:hidden">
          <ul className="divide-y divide-black/5">
            {Array.from({ length: Math.min(rows, 5) }, (_, i) => (
              <ProductsMobileCard key={i} />
            ))}
          </ul>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-black/6 bg-white lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-black/6">
                <tr>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-16" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-20" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-24" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-24" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-12" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="ml-auto h-3 w-12" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => (
                  <ProductsDesktopRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkladDesktopRow() {
  return (
    <tr className="border-b border-black/5 last:border-b-0">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Sk className="size-11 shrink-0 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Sk className="h-4 w-40 max-w-full" />
            <Sk className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-4 w-28" />
      </td>
      <td className="px-4 py-3.5">
        <Sk className="h-6 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <Sk className="h-7 w-28 rounded-lg" />
          <Sk className="h-7 w-24 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function AdminSkladListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-24 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-lg"
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />

        <div className="overflow-hidden rounded-2xl border border-black/6 bg-white lg:hidden">
          <ul className="divide-y divide-black/5">
            {Array.from({ length: Math.min(rows, 5) }, (_, i) => (
              <ProductsMobileCard key={i} />
            ))}
          </ul>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-black/6 bg-white lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-black/6">
                <tr>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-16" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-14" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="h-3 w-12" />
                  </th>
                  <th className="px-4 py-3">
                    <Sk className="ml-auto h-3 w-12" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => (
                  <SkladDesktopRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Kategórie ─── */

export function AdminCategoriesListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-36 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
        action
        actionClassName="h-11 w-full sm:w-40"
      />
      <div className="mt-5 space-y-4">
        <Sk className="h-11 w-full max-w-md" />
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 sm:flex">
            <Sk className="h-3 w-20" />
            <Sk className="ml-auto h-3 w-10" />
            <Sk className="h-3 w-12" />
            <Sk className="h-3 w-16" />
            <span className="w-4 shrink-0" aria-hidden />
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {Array.from({ length: rows }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <Sk className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-40 max-w-full" />
                  <Sk className="h-3 w-56 max-w-full" />
                </div>
                <Sk className="hidden h-4 w-8 sm:block" />
                <Sk className="hidden h-4 w-8 sm:block" />
                <Sk className="hidden h-4 w-8 sm:block" />
                <Sk className="size-4 shrink-0 rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Zľavy ─── */

export function AdminDiscountsListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-24 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
        action
        actionClassName="h-11 w-full sm:w-32"
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 lg:flex">
            <Sk className="h-3 w-16" />
            <Sk className="ml-auto h-3 w-14" />
            <Sk className="h-3 w-14" />
            <Sk className="h-3 w-10" />
            <Sk className="h-3 w-20" />
            <Sk className="h-3 w-10" />
            <Sk className="h-3 w-14" />
            <span className="w-20 shrink-0" aria-hidden />
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {Array.from({ length: rows }, (_, i) => (
              <li
                key={i}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Sk className="size-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Sk className="h-4 w-44 max-w-full" />
                    <Sk className="h-3 w-28 max-w-full" />
                  </div>
                </div>
                <Sk className="hidden h-4 w-[6.5rem] lg:block" />
                <Sk className="hidden h-4 w-[6.5rem] lg:block" />
                <Sk className="hidden h-4 w-14 lg:block" />
                <Sk className="hidden h-4 w-[9.5rem] lg:block" />
                <Sk className="hidden h-4 w-16 lg:block" />
                <Sk className="hidden h-6 w-[7.5rem] rounded-md lg:block" />
                <Sk className="hidden h-8 w-20 rounded-lg lg:block" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Blog (iba search, bez filtra, veľké náhľady) ─── */

export function AdminBlogListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-20 sm:h-9"
        descriptionClassName="mt-3 h-4 w-56"
        action
        actionClassName="h-11 w-full sm:w-36"
      />
      <div className="mt-5">
        <div className="mb-4">
          <Sk className="h-11 w-full max-w-md" />
        </div>
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <ul className="divide-y divide-black/[0.05]">
            {Array.from({ length: rows }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <Sk className="size-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-52 max-w-full" />
                  <Sk className="h-3 w-40 max-w-full" />
                </div>
                <Sk className="size-4 shrink-0 rounded-md" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ─── Objednávky ─── */

export function AdminOrdersListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName="h-8 w-40 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 sm:flex">
            <Sk className="h-3 w-[9.25rem]" />
            <Sk className="h-3 w-20 flex-1" />
            <Sk className="h-3 w-16" />
            <Sk className="h-3 w-[10.5rem]" />
            <Sk className="h-3 w-[4.75rem]" />
            <span className="w-4 shrink-0" aria-hidden />
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {Array.from({ length: rows }, (_, i) => (
              <li
                key={i}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 space-y-2 sm:w-[9.25rem] sm:shrink-0">
                  <Sk className="h-4 w-24" />
                  <Sk className="h-3 w-20" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-3.5 w-40 max-w-full" />
                  <Sk className="h-3 w-28 max-w-full" />
                </div>
                <Sk className="hidden h-4 w-16 sm:block" />
                <Sk className="h-6 w-24 rounded-md sm:w-[10.5rem]" />
                <Sk className="h-4 w-14 sm:w-[4.75rem]" />
                <Sk className="hidden size-4 shrink-0 rounded-md sm:block" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ─── Zákazníci / Veľkoobchod ─── */

export function AdminCustomersListSkeleton({
  rows = 8,
  titleClassName = "h-8 w-36 sm:h-9",
  descriptionClassName = "mt-3 h-4 w-full max-w-lg",
}: {
  rows?: number;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <AdminHeaderSkeleton
        titleClassName={titleClassName}
        descriptionClassName={descriptionClassName}
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 sm:flex">
            <Sk className="h-3 w-20 flex-1" />
            <Sk className="h-3 w-[7.5rem]" />
            <Sk className="h-3 w-[9.5rem]" />
            <span className="w-4 shrink-0" aria-hidden />
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {Array.from({ length: rows }, (_, i) => (
              <li
                key={i}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-44 max-w-full" />
                  <Sk className="h-3 w-52 max-w-full" />
                </div>
                <Sk className="h-6 w-24 rounded-md sm:w-[7.5rem]" />
                <Sk className="h-6 w-28 rounded-md sm:w-[9.5rem]" />
                <Sk className="hidden size-4 shrink-0 rounded-md sm:block" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ─── Analytika ─── */

export function AdminAnalyticsListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Načítavam sekciu">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Sk className="h-8 w-32 sm:h-9" />
          <Sk className="mt-3 h-4 w-full max-w-md" />
        </div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Sk className="h-11 w-20 rounded-xl" />
          <Sk className="h-11 w-24 rounded-xl" />
          <Sk className="h-11 w-28 rounded-xl" />
          <Sk className="h-11 w-24 rounded-xl" />
        </div>
      </div>

      <section className="mt-5" aria-hidden>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-black/[0.06] bg-white px-4 py-4 sm:py-5"
            >
              <div className="flex items-start justify-between gap-2">
                <Sk className="h-3.5 w-20" />
                <Sk className="size-4 rounded-md" />
              </div>
              <Sk className="mt-4 h-9 w-28" />
              <Sk className="mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white sm:col-span-2 xl:col-span-3">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <Sk className="h-5 w-40" />
            <Sk className="h-5 w-24" />
          </div>
          <div className="border-t border-black/[0.05] px-3 py-4">
            <Sk className="h-[280px] w-full rounded-xl sm:h-[320px]" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white sm:col-span-2 xl:col-span-1">
          <div className="px-4 pt-4 pb-3">
            <Sk className="h-5 w-44" />
            <Sk className="mt-2 h-3 w-28" />
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Sk className="h-4 w-3" />
                <Sk className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-3.5 w-28 max-w-full" />
                  <Sk className="h-3 w-12" />
                </div>
                <Sk className="h-4 w-12" />
              </li>
            ))}
          </ul>
          <div className="border-t border-black/[0.05] px-4 py-3">
            <Sk className="h-4 w-40" />
          </div>
        </section>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <section
            key={i}
            className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white"
          >
            <div className="px-4 pt-4 pb-3">
              <Sk className="h-5 w-36" />
              <Sk className="mt-2 h-3 w-40" />
            </div>
            <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
              {Array.from({ length: 4 }, (_, j) => (
                <li
                  key={j}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Sk className="h-3.5 w-28 max-w-full" />
                    <Sk className="h-3 w-20" />
                  </div>
                  <Sk className="h-4 w-10" />
                </li>
              ))}
            </ul>
            <div className="border-t border-black/[0.05] px-4 py-3">
              <Sk className="h-4 w-36" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use section-specific skeletons. Kept for any leftover imports. */
export function AdminTableSkeleton({
  rows = 8,
  withThumb = false,
}: {
  rows?: number;
  withThumb?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/6 bg-white">
      <ul className="divide-y divide-black/5">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5">
            {withThumb ? <Sk className="size-11 shrink-0 rounded-lg" /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Sk className="h-4 w-2/3 max-w-xs" />
              <Sk className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
