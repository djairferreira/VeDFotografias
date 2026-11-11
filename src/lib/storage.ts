import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, put } from "@vercel/blob";

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
