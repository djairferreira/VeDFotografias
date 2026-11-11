import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ACCEPTED_TYPES, originalKeyFor, registerPhoto } from "@/lib/photos";
import { blobEnabled, deleteFiles, openFile, putFile } from "@/lib/storage";

// Fotos muito grandes levam mais tempo para gerar as versões menores.
export const maxDuration = 300;

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
  let source: Buffer | ReadableStream<Uint8Array>;
  let size = 0;
  let filename: string;
  let contentType: string;
  let categoryId: string | null = null;

  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = (await req.json()) as { key?: string; filename?: string; contentType?: string; categoryId?: string | null };
    categoryId = body.categoryId ?? null;
    if (!body.key?.startsWith(`galerias/${id}/originais/`)) return Response.json({ error: "Chave inválida" }, { status: 400 });
    key = body.key;
    filename = (body.filename || "foto.jpg").slice(0, 200);
    contentType = body.contentType || "image/jpeg";
    const file = await openFile(key);
    if (!file) return Response.json({ error: "Arquivo não encontrado no armazenamento" }, { status: 404 });
    source = file.stream;
    size = file.size ?? 0;
  } else {
    if (blobEnabled()) return Response.json({ error: "Envie pelo Blob" }, { status: 400 });
    const form = await req.formData();
    const file = form.get("file");
    categoryId = (form.get("categoryId") as string | null) || null;
    if (!(file instanceof File)) return Response.json({ error: "Arquivo ausente" }, { status: 400 });
    filename = file.name.slice(0, 200);
    contentType = file.type || "image/jpeg";
    if (!ACCEPTED_TYPES.includes(contentType)) return Response.json({ error: "Formato não aceito" }, { status: 415 });
    const buf = Buffer.from(await file.arrayBuffer());
    key = originalKeyFor(id, filename);
    await putFile(key, buf, contentType);
    source = buf;
    size = buf.length;
  }

  // A categoria precisa ser desta galeria.
  if (categoryId && !(/^[0-9a-f-]{36}$/i.test(categoryId) && (await one("select 1 from categories where id = $1 and gallery_id = $2", [categoryId, id]))))
    categoryId = null;
  try {
    const photoId = await registerPhoto({ galleryId: id, originalKey: key, source, size, filename, contentType, categoryId });
    return Response.json({ id: photoId });
  } catch {
    await deleteFiles([key]);
    return Response.json({ error: `Não foi possível ler a imagem ${filename}` }, { status: 422 });
  }
}
