import type { MetadataRoute } from "next";
import { getActiveCircles } from "@/lib/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://meekmeet.com";

  // Static routes. lastModified is only set where the content has a real,
  // known revision date (the policy pages carry their own "last updated").
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl },
    { url: `${baseUrl}/about` },
    { url: `${baseUrl}/circles` },
    { url: `${baseUrl}/login` },
    { url: `${baseUrl}/shepherd` },
    { url: `${baseUrl}/shepherd/apply` },
    { url: `${baseUrl}/voice` },
    { url: `${baseUrl}/media` },
    { url: `${baseUrl}/code-of-love`, lastModified: new Date("2026-11-25") },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-11-25"),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-11-25"),
    },
    {
      url: `${baseUrl}/child-safety`,
      lastModified: new Date("2026-10-16"),
    },
    {
      url: `${baseUrl}/delete-account`,
      lastModified: new Date("2026-06-16"),
    },
  ];

  // Every active circle is a joinable page and belongs in the sitemap.
  // If the circle lookup fails (e.g. during a DB outage), ship the static
  // routes alone rather than failing the whole sitemap.
  let circleRoutes: MetadataRoute.Sitemap = [];
  try {
    const circles = await getActiveCircles();
    circleRoutes = circles
      .filter((c) => c.slug)
      .map((c) => ({ url: `${baseUrl}/circles/${c.slug}` }));
  } catch {
    circleRoutes = [];
  }

  return [...staticRoutes, ...circleRoutes];
}
