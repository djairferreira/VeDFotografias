import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { galleryBySlug, type Photo } from "@/lib/photos";
import { zipResponse } from "@/lib/zip";

export const maxDuration = 300;

/** Baixa a galeria do link em .zip (toda, ou uma categoria com ?categoria=id). Não vale para álbum. */
export async function GET(req: Request, ctx: RouteContext<"/api/p/[slug]/zip">) {
  const { slug } = await ctx.params;
  const user = await getUser();
  const gallery = await galleryBySlug(slug, user);
  if (!gallery || gallery.kind !== "gallery") return new Response("Não encontrada", { status: 404 });
  const cat = new URL(req.url).searchParams.get("categoria") ?? "";
  const byCat = /^[0-9a-f-]{36}$/i.test(cat);
  const photos = await query<Pick<Photo, "filename" | "original_key">>(
    `select filename, original_key from photos where gallery_id = $1 ${byCat ? "and category_id = $2" : ""} order by position`,
    byCat ? [gallery.id, cat] : [gallery.id],
  );
  if (!photos.length) return new Response("Nenhuma foto", { status: 404 });
  if (user?.role !== "admin")
    await query("update galleries set public_downloads = public_downloads + $2 where id = $1", [gallery.id, photos.length]);
  return zipResponse(photos, gallery.title);
}
