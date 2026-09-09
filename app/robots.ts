import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/settings/", "/messages/"],
    },
    sitemap: "https://xingliu.vercel.app/sitemap.xml",
  };
}
