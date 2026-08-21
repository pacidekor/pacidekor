import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/ucet",
          "/ucet/",
          "/kosik",
          "/pokladna",
          "/oblubene",
          "/vyhladavanie",
          "/prihlasenie",
          "/prihlasenie/",
          "/registracia",
          "/registracia/",
          "/zabudnute-heslo",
          "/obnova-hesla",
          "/odhlasenie-newsletter",
          "/dev",
          "/dev/",
          "/emails",
          "/emails/",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
