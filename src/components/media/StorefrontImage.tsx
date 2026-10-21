"use client";

import { useState } from "react";
import { toPublicMediaUrlWithFallback } from "@/lib/media-url";

type Props = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "onError"
> & {
  src: string;
};

/**
 * Prefer R2/media CDN; on 404 fall back to the original Supabase URL
 * (dual-read during sync).
 */
export function StorefrontImage({ src, alt = "", ...rest }: Props) {
  const { primary, fallback } = toPublicMediaUrlWithFallback(src);
  const [current, setCurrent] = useState(primary);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- unoptimized storefront photos
    <img
      {...rest}
      alt={alt}
      src={current}
      onError={() => {
        if (fallback && current !== fallback) {
          setCurrent(fallback);
        }
      }}
    />
  );
}
