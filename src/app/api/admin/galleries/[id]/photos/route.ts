import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ACCEPTED_TYPES, MAX_PHOTO_BYTES, originalKeyFor, registerPhoto } from "@/lib/photos";
import { deleteFiles, putFile, readFileBuffer, blobEnabled } from "@/lib/storage";

export const maxDuration = 60;

/**
 * Registra uma foto na galeria e gera as versões menores.
 * - Com Vercel Blob: recebe JSON { key, filename, contentType } de um arquivo já enviado.
 * - Sem Blob (desenvolvimento local): recebe o arquivo em FormData ("file").
 */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/galleries/[id]/photos">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Sem permissão" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await one("select 1 from galleries where id = $1", [id])))
    return Response.json({ error: "Galeria não encontrada" }, { status: 404 });

  let key: string;
  let original: Buffer | null;
  let filename: string;
  let contentType: string;

  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = (await req.json()) as { key?: string; filename?: string; contentType?: string };
    if (!body.key?.startsWith(`galerias/${id}/originais/`)) return Response.json({ error: "Chave inválida" }, { status: 400 });
    key = body.key;
    filename = (body.filename || "foto.jpg").slice(0, 200);
    contentType = body.contentType || "image/jpeg";
    original = await readFileBuffer(key);
    if (!original) return Response.json({ error: "Arquivo não encontrado no armazenamento" }, { status: 404 });
  } else {
    if (blobEnabled()) return Response.json({ error: "Envie pelo Blob" }, { status: 400 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Arquivo ausente" }, { status: 400 });
    if (file.size > MAX_PHOTO_BYTES) return Response.json({ error: "Arquivo acima de 80 MB" }, { status: 413 });
    filename = file.name.slice(0, 200);
    contentType = file.type || "image/jpeg";
    if (!ACCEPTED_TYPES.includes(contentType)) return Response.json({ error: "Formato não aceito" }, { status: 415 });
    original = Buffer.from(await file.arrayBuffer());
    key = originalKeyFor(id, filename);
    await putFile(key, original, contentType);
  }

  try {
    const photoId = await registerPhoto({ galleryId: id, originalKey: key, original, filename, contentType });
    return Response.json({ id: photoId });
  } catch {
    await deleteFiles([key]);
    return Response.json({ error: `Não foi possível ler a imagem ${filename}` }, { status: 422 });
  }
}
