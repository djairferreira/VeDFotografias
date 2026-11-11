import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import { loadPublic, publicMetadata } from "@/lib/public-gallery";
import { AlbumPicker } from "@/components/gallery/AlbumPicker";
import "../../gallery.css";

export async function generateMetadata({ params }: PageProps<"/album/[slug]">) {
  return publicMetadata((await params).slug, "album");
}

export default async function AlbumPage({ params }: PageProps<"/album/[slug]">) {
  const { slug } = await params;
  const d = await loadPublic(slug);
  if (!d) notFound();
  if (d.g.kind !== "album") redirect(`/galeria/${slug}`);
  const photos = await query<{ id: string; w: number | null; h: number | null; c: string | null; s: boolean }>(
    "select id, width w, height h, category_id c, selected s from photos where gallery_id = $1 order by position, created_at",
    [d.g.id],
  );
  return (
    <AlbumPicker
      slug={slug}
      title={d.g.title}
      subtitle={d.subtitle}
      brand={d.brand}
      design={d.design}
      coverId={d.g.cover_photo_id}
      limit={d.g.select_limit ?? 0}
      photos={photos}
      categories={d.categories}
      submitted={d.g.selection_submitted_at ? { at: d.g.selection_submitted_at, name: d.g.selection_name } : null}
    />
  );
}
