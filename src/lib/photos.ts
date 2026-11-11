import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { one, query } from "./db";
import { putFile } from "./storage";
import type { SessionUser } from "./auth";

export type Photo = {
  id: string;
  gallery_id: string;
  filename: string;
  original_key: string;
  content_type: string;
  size_bytes: string;
  width: number | null;
  height: number | null;
  position: number;
  category_id: string | null;
  selected: boolean;
};

/** Caminho das versões menores, calculado pelo id da foto (não fica guardado no banco). */
export function variantKey(photo: { id: string; gallery_id: string }, variant: "tela" | "mini") {
  return `galerias/${photo.gallery_id}/${variant}/${photo.id}.jpg`;
}
export function photoKeys(photo: { id: string; gallery_id: string; original_key: string }) {
  return [photo.original_key, variantKey(photo, "tela"), variantKey(photo, "mini")];
}

export type Gallery = {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  event_date: string | null;
  published: boolean;
  expires_at: string | null;
  cover_photo_id: string | null;
  created_at: string;
  kind: "gallery" | "album";
  slug: string | null;
  link_enabled: boolean;
  design: Record<string, unknown>;
  select_limit: number | null;
  selection_submitted_at: string | null;
  selection_name: string | null;
  selection_note: string | null;
};

export const GALLERY_COLUMNS = `id, client_id, title, description, event_date, published, expires_at, cover_photo_id, created_at,
  kind, slug, link_enabled, design, select_limit, selection_submitted_at, selection_name, selection_note`;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/tiff"];
export const MAX_PHOTO_BYTES = 80 * 1024 * 1024;

export function safeName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) || "foto.jpg";
}

export function originalKeyFor(galleryId: string, filename: string) {
  return `galerias/${galleryId}/originais/${randomUUID()}-${safeName(filename)}`;
}

/** Gera versão de tela e miniatura do original e registra a foto na galeria. */
export async function registerPhoto(opts: {
  galleryId: string;
  originalKey: string;
  original: Buffer;
  filename: string;
  contentType: string;
  categoryId?: string | null;
}) {
  const img = sharp(opts.original, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const [preview, thumb] = await Promise.all([
    img.clone().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    img.clone().resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer(),
  ]);
  const id = randomUUID();
  const previewKey = variantKey({ id, gallery_id: opts.galleryId }, "tela");
  const thumbKey = variantKey({ id, gallery_id: opts.galleryId }, "mini");
  await Promise.all([putFile(previewKey, preview, "image/jpeg"), putFile(thumbKey, thumb, "image/jpeg")]);

  // Orientação EXIF 5–8 troca largura e altura.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  await query(
    `insert into photos (id, gallery_id, filename, original_key, content_type, size_bytes, width, height, position, category_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,
             coalesce((select max(position) + 1 from photos where gallery_id = $2), 0), $9)`,
    [id, opts.galleryId, opts.filename, opts.originalKey, opts.contentType, opts.original.length, width ?? null, height ?? null, opts.categoryId ?? null],
  );
  await query("update galleries set cover_photo_id = coalesce(cover_photo_id, $2) where id = $1", [opts.galleryId, id]);
  return id;
}

/** Galeria visível para este usuário? Admin vê tudo; cliente só as próprias, publicadas e no prazo. */
export async function galleryForUser(galleryId: string, user: SessionUser) {
  if (!/^[0-9a-f-]{36}$/i.test(galleryId)) return null;
  if (user.role === "admin") return one<Gallery>(`select ${GALLERY_COLUMNS} from galleries where id = $1`, [galleryId]);
  return one<Gallery>(
    `select ${GALLERY_COLUMNS} from galleries where id = $1 and client_id = $2 and published
        and (expires_at is null or expires_at >= current_date)`,
    [galleryId, user.id],
  );
}

export async function photoForUser(photoId: string, user: SessionUser) {
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) return null;
  const photo = await one<Photo>(`select ${PHOTO_COLUMNS} from photos where id = $1`, [photoId]);
  if (!photo) return null;
  const gallery = await galleryForUser(photo.gallery_id, user);
  // Fotos de álbum só aparecem para o cliente com marca d'água, pela página do álbum.
  if (gallery && user.role === "client" && gallery.kind === "album") return null;
  return gallery ? { photo, gallery } : null;
}

export const PHOTO_COLUMNS = "id, gallery_id, filename, original_key, content_type, size_bytes, width, height, position, category_id, selected";

export function isSlug(s: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(s);
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Galeria aberta pelo link (/galeria/slug ou /album/slug).
 * Abre quando o link está ligado, ou para o admin, ou para o cliente dono (logado).
 */
export async function galleryBySlug(slug: string, user: SessionUser | null) {
  if (!isSlug(slug)) return null;
  const g = await one<Gallery>(`select ${GALLERY_COLUMNS} from galleries where slug = $1`, [slug]);
  if (!g) return null;
  const owner = !!user && (user.role === "admin" || user.id === g.client_id);
  const expired = !!g.expires_at && g.expires_at < new Date().toISOString().slice(0, 10);
  if (user?.role === "admin") return g;
  if (expired || !g.published) return null;
  return g.link_enabled || owner ? g : null;
}

export function formatBytes(n: number | string) {
  const v = Number(n);
  if (v < 1024 * 1024) return `${Math.max(1, Math.round(v / 1024))} KB`;
  if (v < 1024 ** 3) return `${(v / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${(v / 1024 ** 3).toFixed(2).replace(".", ",")} GB`;
}

export function formatDate(d: string | Date | null) {
  if (!d) return "";
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00") : new Date(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
