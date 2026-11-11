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
  preview_key: string;
  thumb_key: string;
  content_type: string;
  size_bytes: string;
  width: number | null;
  height: number | null;
  position: number;
};

export type Gallery = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  published: boolean;
  expires_at: string | null;
  cover_photo_id: string | null;
  created_at: string;
};

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
}) {
  const img = sharp(opts.original, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const [preview, thumb] = await Promise.all([
    img.clone().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    img.clone().resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer(),
  ]);
  const id = randomUUID();
  const previewKey = `galerias/${opts.galleryId}/tela/${id}.jpg`;
  const thumbKey = `galerias/${opts.galleryId}/mini/${id}.jpg`;
  await Promise.all([putFile(previewKey, preview, "image/jpeg"), putFile(thumbKey, thumb, "image/jpeg")]);

  // Orientação EXIF 5–8 troca largura e altura.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  await query(
    `insert into photos (id, gallery_id, filename, original_key, preview_key, thumb_key, content_type, size_bytes, width, height, position)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
             coalesce((select max(position) + 1 from photos where gallery_id = $2), 0))`,
    [id, opts.galleryId, opts.filename, opts.originalKey, previewKey, thumbKey, opts.contentType, opts.original.length, width ?? null, height ?? null],
  );
  await query("update galleries set cover_photo_id = coalesce(cover_photo_id, $2) where id = $1", [opts.galleryId, id]);
  return id;
}

/** Galeria visível para este usuário? Admin vê tudo; cliente só as próprias, publicadas e no prazo. */
export async function galleryForUser(galleryId: string, user: SessionUser) {
  if (!/^[0-9a-f-]{36}$/i.test(galleryId)) return null;
  if (user.role === "admin") return one<Gallery>("select * from galleries where id = $1", [galleryId]);
  return one<Gallery>(
    `select * from galleries where id = $1 and client_id = $2 and published
        and (expires_at is null or expires_at >= current_date)`,
    [galleryId, user.id],
  );
}

export async function photoForUser(photoId: string, user: SessionUser) {
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) return null;
  const photo = await one<Photo>("select * from photos where id = $1", [photoId]);
  if (!photo) return null;
  const gallery = await galleryForUser(photo.gallery_id, user);
  return gallery ? { photo, gallery } : null;
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
