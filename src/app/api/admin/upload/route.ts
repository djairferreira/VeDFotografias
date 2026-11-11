import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ACCEPTED_TYPES, MAX_PHOTO_BYTES } from "@/lib/photos";

/**
 * Autoriza o navegador do admin a enviar o original direto para o Vercel Blob (privado),
 * sem passar pelo limite de 4,5 MB das funções.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getUser();
        if (!user || user.role !== "admin") throw new Error("Apenas administradores podem enviar fotos.");
        const galleryId = clientPayload ?? "";
        const exists = await one("select 1 from galleries where id = $1", [galleryId]);
        if (!exists || !pathname.startsWith(`galerias/${galleryId}/originais/`)) throw new Error("Galeria inválida.");
        return {
          allowedContentTypes: ACCEPTED_TYPES,
          maximumSizeInBytes: MAX_PHOTO_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
