import { Readable, PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { galleryForUser, safeName, type Photo } from "@/lib/photos";
import { openFile } from "@/lib/storage";

export const maxDuration = 300;

/** Baixa a galeria inteira (ou as fotos marcadas, ?ids=a,b,c) num único ZIP. */
export async function GET(req: Request, ctx: RouteContext<"/api/zip/[galleryId]">) {
  const { galleryId } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Faça login", { status: 401 });
  const gallery = await galleryForUser(galleryId, user);
  if (!gallery) return new Response("Não encontrada", { status: 404 });

  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  const photos = ids.length
    ? await query<Photo>("select * from photos where gallery_id = $1 and id = any($2::uuid[]) order by position", [galleryId, ids])
    : await query<Photo>("select * from photos where gallery_id = $1 order by position", [galleryId]);
  if (!photos.length) return new Response("Nenhuma foto", { status: 404 });

  if (user.role === "client") {
    await query("insert into downloads (user_id, gallery_id, kind, photo_count) values ($1,$2,'zip',$3)", [
      user.id,
      galleryId,
      photos.length,
    ]);
  }

  // JPEG já é comprimido: "store" evita gastar CPU à toa.
  const archive = new ZipArchive({ store: true });
  const out = new PassThrough();
  archive.pipe(out);
  archive.on("warning", () => {});
  archive.on("error", (e: Error) => out.destroy(e));

  (async () => {
    const used = new Set<string>();
    for (const p of photos) {
      const file = await openFile(p.original_key);
      if (!file) continue;
      const base = safeName(p.filename);
      let name = base;
      for (let n = 2; used.has(name.toLowerCase()); n++) name = base.replace(/(\.[^.]+)?$/, `-${n}$1`);
      used.add(name.toLowerCase());
      // Espera cada arquivo terminar antes de abrir o próximo (uma conexão por vez).
      await new Promise<void>((resolve, reject) => {
        const src = Readable.fromWeb(file.stream as import("node:stream/web").ReadableStream);
        src.on("error", reject);
        archive.once("entry", () => resolve());
        archive.append(src, { name });
      });
    }
    await archive.finalize();
  })().catch((e) => out.destroy(e));

  const zipName = safeName(gallery.title).replace(/\.+$/, "") || "galeria";
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
