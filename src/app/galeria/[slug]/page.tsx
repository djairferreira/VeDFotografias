import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import { loadPublic, publicMetadata } from "@/lib/public-gallery";
import { PublicGallery } from "@/components/gallery/PublicGallery";
import "../../gallery.css";

export async function generateMetadata({ params }: PageProps<"/galeria/[slug]">) {
  return publicMetadata((await params).slug, "galeria");
}

export default async function GalleryPage({ params }: PageProps<"/galeria/[slug]">) {
  const { slug } = await params;
  const d = await loadPublic(slug);
  if (!d) notFound();
  if (d.g.kind === "album") redirect(`/album/${slug}`);
  const photos = await query<{ id: string; w: number | null; h: number | null; c: string | null; f: string }>(
    "select id, width w, height h, category_id c, filename f from photos where gallery_id = $1 order by position, created_at",
    [d.g.id],
  );
  return (
    <PublicGallery
      slug={slug}
      title={d.g.title}
      subtitle={d.subtitle}
      brand={d.brand}
      design={d.design}
      coverId={d.g.cover_photo_id}
      photos={photos}
      categories={d.categories}
    />
  );
}
