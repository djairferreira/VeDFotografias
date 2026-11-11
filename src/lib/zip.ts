import "server-only";
import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { safeName } from "./photos";
import { openFile } from "./storage";

/** ZIP em fluxo com os originais (qualidade máxima), sem carregar tudo na memória. */
export function zipResponse(photos: { filename: string; original_key: string }[], title: string) {
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
      // Um arquivo por vez: espera terminar antes de abrir o próximo.
      await new Promise<void>((resolve, reject) => {
        const src = Readable.fromWeb(file.stream as import("node:stream/web").ReadableStream);
        src.on("error", reject);
        archive.once("entry", () => resolve());
        archive.append(src, { name });
      });
    }
    await archive.finalize();
  })().catch((e) => out.destroy(e));

  const zipName = safeName(title).replace(/\.+$/, "") || "galeria";
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
