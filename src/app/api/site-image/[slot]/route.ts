import { getSiteContent, IMAGE_SLOTS, type ImageSlot } from "@/lib/site-content";
import { openFile } from "@/lib/storage";

/** Fotos do site trocadas pelo admin (ficam no armazenamento privado; são públicas por esta rota). */
export async function GET(req: Request, ctx: RouteContext<"/api/site-image/[slot]">) {
  const { slot } = await ctx.params;
  if (!(slot in IMAGE_SLOTS)) return new Response("Não encontrada", { status: 404 });
  const c = await getSiteContent();
  const key = c.images[slot as ImageSlot];
  if (!key) return Response.redirect(new URL(IMAGE_SLOTS[slot as ImageSlot].fallback, req.url), 302);
  const file = await openFile(key);
  if (!file) return Response.redirect(new URL(IMAGE_SLOTS[slot as ImageSlot].fallback, req.url), 302);
  return new Response(file.stream, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
