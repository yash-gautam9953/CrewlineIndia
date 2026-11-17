import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://crewline.me";
  const paths = ["", "/about", "/contact", "/internships", "/privacy", "/terms"];
  return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "/internships" ? "daily" : "monthly", priority: path === "" ? 1 : 0.7 }));
}
