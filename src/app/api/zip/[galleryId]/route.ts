import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { galleryForUser, PHOTO_COLUMNS, type Photo } from "@/lib/photos";
import { zipResponse } from "@/lib/zip";

export const maxDuration = 300;

/** Baixa a galeria inteira (ou as fotos marcadas, ?ids=a,b,c) num único ZIP. */
export async function GET(req: Request, ctx: RouteContext<"/api/zip/[galleryId]">) {
  const { galleryId } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Faça login", { status: 401 });
  const gallery = await galleryForUser(galleryId, user);
  if (!gallery) return new Response("Não encontrada", { status: 404 });

  // Álbum: o cliente não baixa originais; o admin baixa tudo ou só as escolhidas (?escolhidas=1).
  if (gallery.kind === "album" && user.role !== "admin") return new Response("Não disponível", { status: 403 });
  const params = new URL(req.url).searchParams;
  const ids = (params.get("ids") ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  const onlySelected = params.get("escolhidas") === "1";
  const photos = ids.length
    ? await query<Photo>(`select ${PHOTO_COLUMNS} from photos where gallery_id = $1 and id = any($2::uuid[]) order by position`, [galleryId, ids])
    : await query<Photo>(
        `select ${PHOTO_COLUMNS} from photos where gallery_id = $1 ${onlySelected ? "and selected" : ""} order by position`,
        [galleryId],
      );
  if (!photos.length) return new Response("Nenhuma foto", { status: 404 });

  if (user.role === "client") {
    await query("insert into downloads (user_id, gallery_id, kind, photo_count) values ($1,$2,'zip',$3)", [
      user.id,
      galleryId,
      photos.length,
    ]);
  }

  return zipResponse(photos, gallery.title);
}
