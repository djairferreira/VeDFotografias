"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { generatePassword, hashPassword, requireAdmin } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { deleteFiles, putFile } from "@/lib/storage";
import { isSlug, photoKeys, slugify } from "@/lib/photos";
import { readDesign } from "@/lib/gallery-design";
import { DEFAULT_CONTENT, getSiteContent, IMAGE_SLOTS, saveSiteContent, type ImageSlot, type SiteContent } from "@/lib/site-content";

export type ActionState = { error?: string; ok?: string; password?: string; email?: string };

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/* ---------- Clientes ---------- */

export async function createClient(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = str(form, "name", 160);
  const email = str(form, "email", 200).toLowerCase();
  const phone = str(form, "phone", 40) || null;
  const notes = str(form, "notes") || null;
  const typed = str(form, "password", 200);
  if (!name) return { error: "Informe o nome do cliente." };
  if (!validEmail(email)) return { error: "Informe um e-mail válido." };
  if (typed && typed.length < 8) return { error: "A senha precisa de pelo menos 8 caracteres." };
  if (await one("select 1 from users where lower(email) = $1", [email])) return { error: "Já existe uma conta com este e-mail." };
  const password = typed || generatePassword();
  const row = await one<{ id: string }>(
    `insert into users (name, email, phone, notes, password_hash, role, must_change_password)
     values ($1,$2,$3,$4,$5,'client', true) returning id`,
    [name, email, phone, notes, await hashPassword(password)],
  );
  revalidatePath("/admin/clientes");
  return { ok: row!.id, password, email };
}

export async function updateClient(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name", 160);
  const email = str(form, "email", 200).toLowerCase();
  if (!isUuid(id)) return { error: "Cliente inválido." };
  if (!name) return { error: "Informe o nome." };
  if (!validEmail(email)) return { error: "Informe um e-mail válido." };
  if (await one("select 1 from users where lower(email) = $1 and id <> $2", [email, id]))
    return { error: "Outro cadastro já usa este e-mail." };
  await query(
    "update users set name=$2, email=$3, phone=$4, notes=$5, active=$6 where id=$1 and role='client'",
    [id, name, email, str(form, "phone", 40) || null, str(form, "notes") || null, form.get("active") === "on"],
  );
  if (form.get("active") !== "on") await query("delete from sessions where user_id = $1", [id]);
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: "Dados salvos." };
}

export async function resetClientPassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return { error: "Cliente inválido." };
  const user = await one<{ email: string }>("select email from users where id = $1 and role = 'client'", [id]);
  if (!user) return { error: "Cliente não encontrado." };
  const password = generatePassword();
  await query("update users set password_hash = $2, must_change_password = true where id = $1", [id, await hashPassword(password)]);
  await query("delete from sessions where user_id = $1", [id]);
  return { ok: "Nova senha gerada.", password, email: user.email };
}

export async function deleteClient(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  const keys = await query<{ id: string; gallery_id: string; original_key: string }>(
    `select p.id, p.gallery_id, p.original_key
       from photos p join galleries g on g.id = p.gallery_id where g.client_id = $1`,
    [id],
  );
  await query("delete from users where id = $1 and role = 'client'", [id]);
  await deleteFiles(keys.flatMap(photoKeys));
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

/* ---------- Galerias ---------- */

/** Cliente opcional: vazio = galeria sem cliente (atribuída depois). */
async function clientFromForm(form: FormData): Promise<{ id: string | null } | { error: string }> {
  const clientId = str(form, "client_id");
  if (!clientId) return { id: null };
  if (!isUuid(clientId) || !(await one("select 1 from users where id = $1 and role = 'client'", [clientId])))
    return { error: "Cliente não encontrado." };
  return { id: clientId };
}

export async function createGallery(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const client = await clientFromForm(form);
  if ("error" in client) return { error: client.error };
  const title = str(form, "title", 160);
  if (!title) return { error: "Dê um nome à galeria." };
  const kind = str(form, "kind") === "album" ? "album" : "gallery";
  const limit = Number(str(form, "select_limit"));
  if (kind === "album" && (!Number.isInteger(limit) || limit < 1)) return { error: "Informe quantas fotos o cliente pode escolher." };
  const row = await one<{ id: string }>(
    `insert into galleries (client_id, title, description, event_date, expires_at, published, kind, slug, link_enabled, select_limit)
     values ($1,$2,$3,$4,$5,$6,$7,$8,true,$9) returning id`,
    [
      client.id,
      title,
      str(form, "description") || null,
      str(form, "event_date") || null,
      str(form, "expires_at") || null,
      form.get("published") === "on",
      kind,
      await freeSlug(title),
      kind === "album" ? limit : null,
    ],
  );
  redirect(`/admin/galerias/${row!.id}`);
}

export async function updateGallery(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  const title = str(form, "title", 160);
  if (!isUuid(id)) return { error: "Galeria inválida." };
  const client = await clientFromForm(form);
  if ("error" in client) return { error: client.error };
  if (!title) return { error: "Dê um nome à galeria." };
  await query(
    `update galleries set client_id=$2, title=$3, description=$4, event_date=$5, expires_at=$6, published=$7 where id=$1`,
    [id, client.id, title, str(form, "description") || null, str(form, "event_date") || null, str(form, "expires_at") || null, form.get("published") === "on"],
  );
  revalidatePath("/admin", "layout");
  return { ok: client.id ? "Galeria salva." : "Galeria salva, sem cliente." };
}

/** Pelo cadastro do cliente: atribui uma galeria a ele (tirando de quem tinha). */
export async function assignGallery(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = str(form, "client_id");
  const galleryId = str(form, "gallery_id");
  if (!isUuid(clientId) || !(await one("select 1 from users where id = $1 and role = 'client'", [clientId])))
    return { error: "Cliente inválido." };
  if (!isUuid(galleryId)) return { error: "Escolha a galeria." };
  const row = await one("update galleries set client_id = $2 where id = $1 returning id", [galleryId, clientId]);
  if (!row) return { error: "Galeria não encontrada." };
  revalidatePath("/admin", "layout");
  return { ok: "Galeria atribuída." };
}

/** Pelo cadastro do cliente: tira a galeria dele (ela continua existindo, sem cliente). */
export async function unassignGallery(form: FormData) {
  await requireAdmin();
  const galleryId = str(form, "gallery_id");
  if (!isUuid(galleryId)) return;
  await query("update galleries set client_id = null where id = $1", [galleryId]);
  revalidatePath("/admin", "layout");
}

export async function deleteGallery(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  const keys = await query<{ id: string; gallery_id: string; original_key: string }>(
    "select id, gallery_id, original_key from photos where gallery_id = $1",
    [id],
  );
  await query("delete from galleries where id = $1", [id]);
  await deleteFiles(keys.flatMap(photoKeys));
  revalidatePath("/admin/galerias");
  redirect("/admin/galerias");
}

export async function deletePhotos(galleryId: string, ids: string[]) {
  await requireAdmin();
  const valid = ids.filter(isUuid);
  if (!isUuid(galleryId) || !valid.length) return;
  const rows = await query<{ id: string; gallery_id: string; original_key: string }>(
    `select id, gallery_id, original_key from photos where gallery_id = $1 and id = any($2::uuid[])`,
    [galleryId, valid],
  );
  await query("delete from photos where gallery_id = $1 and id = any($2::uuid[])", [galleryId, valid]);
  await query(
    `update galleries set cover_photo_id = (select id from photos where gallery_id = $1 order by position limit 1)
      where id = $1 and (cover_photo_id is null or cover_photo_id = any($2::uuid[]))`,
    [galleryId, valid],
  );
  await deleteFiles(rows.flatMap(photoKeys));
  revalidatePath(`/admin/galerias/${galleryId}`);
}

export async function setCover(galleryId: string, photoId: string) {
  await requireAdmin();
  if (!isUuid(galleryId) || !isUuid(photoId)) return;
  await query("update galleries set cover_photo_id = $2 where id = $1 and exists (select 1 from photos where id = $2 and gallery_id = $1)", [galleryId, photoId]);
  revalidatePath(`/admin/galerias/${galleryId}`);
}

/* ---------- Mensagens ---------- */

export async function toggleInquiry(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  await query("update inquiries set read = not read where id = $1", [id]);
  revalidatePath("/admin/mensagens");
  revalidatePath("/admin");
}

export async function deleteInquiry(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  await query("delete from inquiries where id = $1", [id]);
  revalidatePath("/admin/mensagens");
}

/* ---------- Site ---------- */

const TEXT_KEYS = (Object.keys(DEFAULT_CONTENT) as (keyof SiteContent)[]).filter(
  (k) => typeof DEFAULT_CONTENT[k] === "string",
);

export async function saveSite(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const current = await getSiteContent();
  const next: SiteContent = { ...current, images: { ...current.images } };
  for (const k of TEXT_KEYS) {
    const v = str(form, k, 3000);
    (next as Record<string, unknown>)[k] = v || DEFAULT_CONTENT[k];
  }

  const testimonials = [];
  for (let i = 0; i < 6; i++) {
    const t = { title: str(form, `t${i}_title`, 200), quote: str(form, `t${i}_quote`, 800), author: str(form, `t${i}_author`, 120) };
    if (t.title || t.quote) testimonials.push(t);
  }
  next.testimonials = testimonials.length ? testimonials : DEFAULT_CONTENT.testimonials;

  const oldKeys: string[] = [];
  for (const slot of Object.keys(IMAGE_SLOTS) as ImageSlot[]) {
    if (form.get(`reset_${slot}`) === "on") {
      if (next.images[slot]) oldKeys.push(next.images[slot]!);
      delete next.images[slot];
      continue;
    }
    const file = form.get(`img_${slot}`);
    if (file instanceof File && file.size > 0) {
      try {
        const buf = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
        const key = `site/${slot}-${Date.now()}.jpg`;
        await putFile(key, buf, "image/jpeg");
        if (next.images[slot]) oldKeys.push(next.images[slot]!);
        next.images[slot] = key;
      } catch {
        return { error: `Não consegui ler a imagem de "${IMAGE_SLOTS[slot].label}".` };
      }
    }
  }
  await saveSiteContent(next);
  await deleteFiles(oldKeys);
  revalidatePath("/", "layout");
  return { ok: "Site atualizado." };
}

/* ---------- Link, visual e categorias da galeria ---------- */

/** Endereço livre a partir de um texto (acrescenta -2, -3… se já existir). */
async function freeSlug(text: string, exceptId?: string) {
  const base = slugify(text) || "galeria";
  for (let n = 1; n < 200; n++) {
    const s = n === 1 ? base : `${base.slice(0, 55)}-${n}`;
    if (!(await one("select 1 from galleries where slug = $1 and id is distinct from $2", [s, exceptId ?? null]))) return s;
  }
  return `${base.slice(0, 50)}-${Date.now().toString(36)}`;
}

export async function saveDesign(galleryId: string, title: string, raw: unknown): Promise<ActionState> {
  await requireAdmin();
  if (!isUuid(galleryId)) return { error: "Galeria inválida." };
  const t = String(title ?? "").trim().slice(0, 160);
  if (!t) return { error: "Dê um título à galeria." };
  await query("update galleries set title = $2, design = $3 where id = $1", [galleryId, t, JSON.stringify(readDesign(raw))]);
  revalidatePath("/admin", "layout");
  return { ok: "Capa salva." };
}

export async function saveLink(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return { error: "Galeria inválida." };
  const slug = slugify(str(form, "slug", 80));
  if (!isSlug(slug)) return { error: "O endereço precisa ter de 3 a 60 letras, números ou hífens." };
  if (await one("select 1 from galleries where slug = $1 and id <> $2", [slug, id]))
    return { error: `O endereço "${slug}" já está em uso. Escolha outro.` };
  const kind = str(form, "kind") === "album" ? "album" : "gallery";
  const limit = Number(str(form, "select_limit"));
  if (kind === "album" && (!Number.isInteger(limit) || limit < 1 || limit > 5000))
    return { error: "Informe quantas fotos o cliente pode escolher." };
  await query("update galleries set slug = $2, kind = $3, link_enabled = $4, select_limit = $5 where id = $1", [
    id,
    slug,
    kind,
    form.get("link_enabled") === "on",
    kind === "album" ? limit : null,
  ]);
  revalidatePath("/admin", "layout");
  return { ok: "Link salvo." };
}

export async function suggestSlug(text: string, galleryId: string) {
  await requireAdmin();
  return freeSlug(text, isUuid(galleryId) ? galleryId : undefined);
}

export async function addCategory(galleryId: string, name: string) {
  await requireAdmin();
  const n = String(name ?? "").trim().slice(0, 60);
  if (!isUuid(galleryId) || !n) return;
  await query(
    `insert into categories (gallery_id, name, position)
     values ($1, $2, coalesce((select max(position) + 1 from categories where gallery_id = $1), 0))`,
    [galleryId, n],
  );
  revalidatePath(`/admin/galerias/${galleryId}`);
}

export async function renameCategory(id: string, name: string) {
  await requireAdmin();
  const n = String(name ?? "").trim().slice(0, 60);
  if (!isUuid(id) || !n) return;
  const row = await one<{ gallery_id: string }>("update categories set name = $2 where id = $1 returning gallery_id", [id, n]);
  if (row) revalidatePath(`/admin/galerias/${row.gallery_id}`);
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  if (!isUuid(id)) return;
  // As fotos continuam na galeria, só ficam sem categoria.
  const row = await one<{ gallery_id: string }>("delete from categories where id = $1 returning gallery_id", [id]);
  if (row) revalidatePath(`/admin/galerias/${row.gallery_id}`);
}

export async function moveCategory(id: string, dir: -1 | 1) {
  await requireAdmin();
  if (!isUuid(id)) return;
  const cat = await one<{ gallery_id: string }>("select gallery_id from categories where id = $1", [id]);
  if (!cat) return;
  const list = await query<{ id: string }>("select id from categories where gallery_id = $1 order by position, name", [cat.gallery_id]);
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await query(
    "update categories c set position = v.pos from unnest($1::uuid[]) with ordinality as v(id, pos) where c.id = v.id",
    [list.map((c) => c.id)],
  );
  revalidatePath(`/admin/galerias/${cat.gallery_id}`);
}

export async function setPhotosCategory(galleryId: string, ids: string[], categoryId: string | null) {
  await requireAdmin();
  const valid = ids.filter(isUuid);
  if (!isUuid(galleryId) || !valid.length) return;
  if (categoryId && !(await one("select 1 from categories where id = $1 and gallery_id = $2", [categoryId, galleryId]))) return;
  await query("update photos set category_id = $3 where gallery_id = $1 and id = any($2::uuid[])", [galleryId, valid, categoryId]);
  revalidatePath(`/admin/galerias/${galleryId}`);
}

/* ---------- Seleção do álbum ---------- */

export async function markSelectionSeen(galleryId: string) {
  await requireAdmin();
  if (!isUuid(galleryId)) return;
  await query("update galleries set selection_seen = true where id = $1 and selection_submitted_at is not null", [galleryId]);
}

export async function reopenSelection(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  await query("update galleries set selection_submitted_at = null, selection_seen = false where id = $1", [id]);
  revalidatePath("/admin", "layout");
}

export async function clearSelection(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (!isUuid(id)) return;
  await query("update photos set selected = false where gallery_id = $1 and selected", [id]);
  await query("update galleries set selection_submitted_at = null, selection_name = null, selection_note = null where id = $1", [id]);
  revalidatePath("/admin", "layout");
}
