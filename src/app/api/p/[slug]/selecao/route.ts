import { getUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { galleryBySlug } from "@/lib/photos";

/**
 * Seleção do álbum.
 * POST { photoId, selected }      marca ou desmarca uma foto
 * POST { enviar: true, name, note } envia a seleção para os fotógrafos (trava a escolha)
 */
export async function POST(req: Request, ctx: RouteContext<"/api/p/[slug]/selecao">) {
  const { slug } = await ctx.params;
  const user = await getUser();
  const gallery = await galleryBySlug(slug, user);
  if (!gallery || gallery.kind !== "album") return Response.json({ error: "Álbum não encontrado." }, { status: 404 });
  if (gallery.selection_submitted_at)
    return Response.json({ error: "A seleção já foi enviada. Fale com os fotógrafos para reabrir." }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { photoId?: string; selected?: boolean; enviar?: boolean; name?: string; note?: string };
  const limit = gallery.select_limit ?? 0;

  if (body.enviar) {
    const name = String(body.name ?? "").trim().slice(0, 120);
    if (!name) return Response.json({ error: "Informe seu nome." }, { status: 400 });
    const c = await one<{ n: string }>("select count(*) n from photos where gallery_id = $1 and selected", [gallery.id]);
    const n = Number(c?.n ?? 0);
    if (!n) return Response.json({ error: "Escolha ao menos uma foto." }, { status: 400 });
    if (limit && n > limit) return Response.json({ error: `Você marcou ${n}; o álbum tem ${limit} fotos.` }, { status: 400 });
    await query(
      `update galleries set selection_submitted_at = now(), selection_name = $2, selection_note = $3, selection_seen = false
        where id = $1 and selection_submitted_at is null`,
      [gallery.id, name, String(body.note ?? "").trim().slice(0, 2000) || null],
    );
    return Response.json({ ok: true, count: n });
  }

  if (!/^[0-9a-f-]{36}$/i.test(body.photoId ?? "")) return Response.json({ error: "Foto inválida." }, { status: 400 });
  if (body.selected) {
    // Marca só se ainda couber no limite (uma consulta, sem corrida).
    const row = await one<{ id: string }>(
      `update photos set selected = true
        where id = $1 and gallery_id = $2 and not selected
          and ($3 = 0 or (select count(*) from photos where gallery_id = $2 and selected) < $3)
        returning id`,
      [body.photoId, gallery.id, limit],
    );
    if (!row) {
      const already = await one("select 1 from photos where id = $1 and gallery_id = $2 and selected", [body.photoId, gallery.id]);
      if (!already) return Response.json({ error: `Você já escolheu as ${limit} fotos do álbum. Desmarque uma para trocar.` }, { status: 409 });
    }
  } else {
    await query("update photos set selected = false where id = $1 and gallery_id = $2", [body.photoId, gallery.id]);
  }
  const c = await one<{ n: string }>("select count(*) n from photos where gallery_id = $1 and selected", [gallery.id]);
  return Response.json({ ok: true, count: Number(c?.n ?? 0) });
}
