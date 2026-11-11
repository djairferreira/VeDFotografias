import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { getUser } from "./auth";
import { query } from "./db";
import { formatDate, galleryBySlug } from "./photos";
import { readDesign } from "./gallery-design";
import { getSiteContent } from "./site-content";

/** Dados da página pública (uma leitura por requisição, compartilhada entre página e metadados). */
export const loadPublic = cache(async (slug: string) => {
  const user = await getUser();
  const g = await galleryBySlug(slug, user);
  if (!g) return null;
  const [site, categories] = await Promise.all([
    getSiteContent(),
    query<{ id: string; name: string }>("select id, name from categories where gallery_id = $1 order by position, name", [g.id]),
  ]);
  const design = readDesign(g.design);
  return {
    g,
    site,
    categories,
    design,
    subtitle: design.subtitle || (g.event_date ? formatDate(g.event_date) : ""),
    brand: site.brand.toUpperCase(),
  };
});

export async function publicMetadata(slug: string, path: "galeria" | "album"): Promise<Metadata> {
  const d = await loadPublic(slug);
  if (!d) return { title: "Galeria não encontrada", robots: { index: false } };
  const image = d.g.cover_photo_id && d.g.link_enabled ? `/api/p/${slug}/${d.g.cover_photo_id}/tela` : undefined;
  return {
    title: d.g.title,
    description: d.subtitle || d.site.brand,
    robots: { index: false, follow: false },
    openGraph: { title: d.g.title, description: d.subtitle || d.site.brand, url: `/${path}/${slug}`, images: image ? [image] : undefined },
  };
}
