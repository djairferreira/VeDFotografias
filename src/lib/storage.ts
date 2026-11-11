import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, list, put } from "@vercel/blob";
import { readdir } from "node:fs/promises";

/**
 * Armazenamento das fotos.
 * - Na Vercel (BLOB_READ_WRITE_TOKEN ou BLOB_STORE_ID presentes): Vercel Blob privado.
 * - Localmente, sem Blob configurado: pasta ./storage.
 * Todas as chaves são privadas; quem entrega o arquivo é a nossa rota, depois de checar o login.
 */
export const blobEnabled = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

const LOCAL_ROOT = path.join(process.cwd(), "storage");
const localPath = (key: string) => {
  const p = path.join(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("chave inválida");
  return p;
};

export async function putFile(key: string, body: Buffer, contentType: string) {
  if (blobEnabled()) {
    await put(key, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  const p = localPath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, body);
}

export async function readFileBuffer(key: string): Promise<Buffer | null> {
  if (blobEnabled()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

/** Stream do arquivo (Web ReadableStream) e tamanho, ou null se não existir. */
export async function openFile(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number | null } | null> {
  if (blobEnabled()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { stream: res.stream, size: res.blob.size };
  }
  try {
    const p = localPath(key);
    const s = await stat(p);
    return { stream: Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>, size: s.size };
  } catch {
    return null;
  }
}

export async function deleteFiles(keys: string[]) {
  if (!keys.length) return;
  if (blobEnabled()) {
    for (let i = 0; i < keys.length; i += 500) await del(keys.slice(i, i + 500));
    return;
  }
  await Promise.all(keys.map((k) => rm(localPath(k), { force: true })));
}

/** Espaço ocupado no armazenamento de fotos, separado por pasta de primeiro e terceiro nível. */
export async function storageUsage(): Promise<{ total: number; files: number; byKind: Record<string, number>; partial: boolean }> {
  const byKind: Record<string, number> = {};
  let total = 0;
  let files = 0;
  const add = (key: string, size: number) => {
    // galerias/<id>/<originais|tela|mini>/arquivo  ·  site/arquivo
    const parts = key.split("/");
    const kind = parts[0] === "galerias" ? parts[2] ?? "outros" : parts[0];
    byKind[kind] = (byKind[kind] ?? 0) + size;
    total += size;
    files++;
  };
  if (blobEnabled()) {
    let cursor: string | undefined;
    let pages = 0;
    do {
      const res = await list({ cursor, limit: 1000 });
      res.blobs.forEach((b) => add(b.pathname, b.size));
      cursor = res.hasMore ? res.cursor : undefined;
      pages++;
    } while (cursor && pages < 50);
    return { total, files, byKind, partial: !!cursor };
  }
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else add(path.relative(LOCAL_ROOT, full), (await stat(full)).size);
    }
  };
  await walk(LOCAL_ROOT);
  return { total, files, byKind, partial: false };
}
