"use client";

import { useEffect, useState } from "react";
import {
  SITE_CONTENT_EVENT,
  readSiteContent,
  seedSiteContent,
  type SiteContentStore,
} from "@/lib/site-content";

export function useSiteContent() {
  const [content, setContent] = useState<SiteContentStore>(seedSiteContent);

  useEffect(() => {
    function sync() {
      setContent(readSiteContent());
    }

    sync();
    window.addEventListener(SITE_CONTENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SITE_CONTENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return content;
}
