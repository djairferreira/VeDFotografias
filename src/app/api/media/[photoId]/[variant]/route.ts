import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { photoForUser, safeName, variantKey } from "@/lib/photos";
import { openFile } from "@/lib/storage";

/**
 * Entrega uma foto depois de checar o login.
 * variant: "mini" (miniatura), "tela" (visualização) ou "original" (download).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/media/[photoId]/[variant]">) {
  const { photoId, variant } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Faça login", { status: 401 });
  const found = await photoForUser(photoId, user);
  if (!found) return new Response("Não encontrada", { status: 404 });
  const { photo } = found;

  const key = variant === "mini" || variant === "tela" ? variantKey(photo, variant) : variant === "original" ? photo.original_key : null;
  if (!key) return new Response("Variante inválida", { status: 400 });

  const file = await openFile(key);
  if (!file) return new Response("Arquivo não encontrado", { status: 404 });

  const headers = new Headers({
    "Content-Type": variant === "original" ? photo.content_type : "image/jpeg",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size) headers.set("Content-Length", String(file.size));

  if (variant === "original") {
    const name = safeName(photo.filename);
    headers.set("Content-Disposition", `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(photo.filename)}`);
    headers.set("Cache-Control", "private, no-store");
    if (user.role === "client" && new URL(req.url).searchParams.get("log") !== "0") {
      await query("insert into downloads (user_id, gallery_id, photo_id, kind) values ($1,$2,$3,'photo')", [
        user.id,
        photo.gallery_id,
        photo.id,
      ]);
    }
  }
  return new Response(file.stream, { headers });
}
