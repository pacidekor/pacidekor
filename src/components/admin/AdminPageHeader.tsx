export function AdminPageHeader({
  title,
  description = "Táto sekcia pribudne čoskoro.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
        {description}
      </p>
    </>
  );
}
