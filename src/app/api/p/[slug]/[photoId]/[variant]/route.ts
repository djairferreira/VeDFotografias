import { getUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { galleryBySlug, PHOTO_COLUMNS, safeName, variantKey, type Photo } from "@/lib/photos";
import { openFile, readFileBuffer } from "@/lib/storage";
import { watermarked } from "@/lib/watermark";

export const maxDuration = 60;

/**
 * Fotos abertas pelo link da galeria ou do álbum.
 * - Galeria: miniatura, tela e original (download em qualidade máxima).
 * - Álbum: só miniatura e tela, sempre com marca d'água; original bloqueado.
 */
export async function GET(_: Request, ctx: RouteContext<"/api/p/[slug]/[photoId]/[variant]">) {
  const { slug, photoId, variant } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(photoId) || !["mini", "tela", "original"].includes(variant))
    return new Response("Não encontrada", { status: 404 });
  const user = await getUser();
  const gallery = await galleryBySlug(slug, user);
  if (!gallery) return new Response("Não encontrada", { status: 404 });
  const photo = await one<Photo>(`select ${PHOTO_COLUMNS} from photos where id = $1 and gallery_id = $2`, [photoId, gallery.id]);
  if (!photo) return new Response("Não encontrada", { status: 404 });

  // Só guarda no cache da Vercel quando o link está aberto a todos.
  const cache = (seconds: number) =>
    gallery.link_enabled ? `public, max-age=${seconds}, s-maxage=${seconds}` : "private, max-age=3600";

  if (gallery.kind === "album") {
    if (variant === "original") return new Response("Download indisponível no álbum de seleção", { status: 403 });
    const source = await readFileBuffer(variantKey(photo, variant as "mini" | "tela"));
    if (!source) return new Response("Arquivo não encontrado", { status: 404 });
    const body = await watermarked(source, variant === "mini" ? 720 : 1400);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": cache(31536000), "X-Content-Type-Options": "nosniff" },
    });
  }

  const key = variant === "original" ? photo.original_key : variantKey(photo, variant as "mini" | "tela");
  const file = await openFile(key);
  if (!file) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers({
    "Content-Type": variant === "original" ? photo.content_type : "image/jpeg",
    "Cache-Control": variant === "original" ? "private, no-store" : cache(86400),
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size) headers.set("Content-Length", String(file.size));
  if (variant === "original") {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeName(photo.filename)}"; filename*=UTF-8''${encodeURIComponent(photo.filename)}`,
    );
    if (user?.role !== "admin") await query("update galleries set public_downloads = public_downloads + 1 where id = $1", [gallery.id]);
  }
  return new Response(file.stream, { headers });
}
