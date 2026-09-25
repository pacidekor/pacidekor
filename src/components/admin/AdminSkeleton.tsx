/** Shared pulse blocks for admin route `loading.tsx` skeletons. */

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
}: {
  titleClassName?: string;
  descriptionClassName?: string;
  action?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <Sk className={titleClassName} />
        <Sk className={descriptionClassName} />
      </div>
      {action ? <Sk className="h-11 w-full sm:w-36" /> : null}
    </div>
  );
}

export function AdminSearchFilterSkeleton() {
  return (
    <div className="mb-4 flex items-center gap-2.5 sm:gap-3">
      <Sk className="h-11 min-w-0 flex-[7] sm:max-w-md sm:flex-1" />
      <Sk className="h-11 min-w-0 flex-[3] sm:w-28 sm:flex-none" />
    </div>
  );
}

export function AdminTableSkeleton({
  rows = 8,
  withThumb = false,
}: {
  rows?: number;
  withThumb?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/6 bg-white">
      <div className="hidden border-b border-black/5 px-4 py-3 sm:block">
        <div className="flex gap-4">
          <Sk className="h-3 w-24" />
          <Sk className="h-3 w-20" />
          <Sk className="h-3 w-28" />
          <Sk className="ml-auto h-3 w-16" />
        </div>
      </div>
      <ul className="divide-y divide-black/5">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5">
            {withThumb ? <Sk className="size-11 shrink-0 rounded-lg" /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Sk className="h-4 w-2/3 max-w-xs" />
              <Sk className="h-3 w-24" />
            </div>
            <Sk className="hidden h-4 w-16 sm:block" />
            <Sk className="hidden h-6 w-20 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}
