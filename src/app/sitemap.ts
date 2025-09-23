import { getCompanies } from "@/data/queries";
import type { MetadataRoute } from "next";

const BASE_URL = "https://bounty.directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },


    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];



  // Add routes for each company
  const { data: companyData } = await getCompanies();

  if (companyData) {
    for (const company of companyData) {
      routes.push({
        url: `${BASE_URL}/companies/${company.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return routes;
}
