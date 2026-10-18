/** Shared axis caption on PDP (Farba / Veľkosť / custom admin label). */
export function ProductAxisLabel({ children }: { children: string }) {
  return (
    <p className="font-sans text-sm font-semibold text-[#2f2924]">{children}</p>
  );
}
