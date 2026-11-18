"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { applyPhotoOrder } from "@/app/actions/admin";

/**
 * Fila de envio do painel inteiro. Fica no layout do admin, então o envio continua
 * enquanto se navega por outras abas e páginas do painel (só fechar ou recarregar a página interrompe).
 */

export type UpStatus = "fila" | "enviando" | "processando" | "pronta" | "erro";
export type UpItem = {
  id: number;
  galleryId: string;
  galleryTitle: string;
  categoryId: string | null;
  file: File;
  name: string;
  size: number;
  loaded: number;
  status: UpStatus;
  error?: string;
};

type Ctx = {
  items: UpItem[];
  enqueue: (opts: { galleryId: string; galleryTitle: string; categoryId: string | null; files: File[] }) => void;
  clearFinished: () => void;
  blob: boolean;
};

const UploadCtx = createContext<Ctx | null>(null);
export const useUploads = () => {
  const c = useContext(UploadCtx);
  if (!c) throw new Error("UploadProvider ausente");
  return c;
};

const CONCURRENCY = 3;

function safe(name: string) {
  return (
    name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) ||
    "foto.jpg"
  );
}

export function mb(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`;
  return `${(bytes / 1024 ** 2).toLocaleString("pt-BR", { maximumFractionDigits: bytes < 10 * 1024 ** 2 ? 1 : 0 })} MB`;
}

export const STATUS_LABEL: Record<UpStatus, string> = {
  fila: "Na fila",
  enviando: "Enviando",
  processando: "Preparando as versões menores…",
  pronta: "Pronta",
  erro: "Erro",
};

/** Envio local (sem Blob) com progresso, via XMLHttpRequest. */
function postWithProgress(url: string, body: FormData, onProgress: (loaded: number) => void) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, headers: { "content-type": "application/json" } }));
    xhr.onerror = () => reject(new Error("falha de conexão"));
    xhr.send(body);
  });
}

/** Resumo de um conjunto de itens: porcentagem pelos bytes + preparo no servidor. */
export function summarize(list: UpItem[]) {
  const total = list.length;
  const totalBytes = list.reduce((s, i) => s + i.size, 0) || 1;
  const sentBytes = list.reduce((s, i) => s + Math.min(i.loaded, i.size), 0);
  const finished = list.filter((i) => i.status === "pronta" || i.status === "erro").length;
  const failed = list.filter((i) => i.status === "erro").length;
  const busy = finished < total;
  const pct = total ? Math.min(100, Math.round((sentBytes / totalBytes) * 92 + (finished / total) * 8)) : 0;
  return { total, totalBytes, sentBytes, finished, failed, busy, pct };
}

export function UploadProvider({ blob, children }: { blob: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<UpItem[]>([]);
  const itemsRef = useRef<UpItem[]>([]);
  const running = useRef(0);
  const nextId = useRef(1);
  const lastRefresh = useRef(0);
  const pathRef = useRef(pathname);
  const pumpRef = useRef<() => void>(() => {});
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const commit = useCallback((fn: (list: UpItem[]) => UpItem[]) => {
    itemsRef.current = fn(itemsRef.current);
    setItems(itemsRef.current);
  }, []);
  const patch = useCallback((id: number, p: Partial<UpItem>) => commit((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i))), [commit]);

  // Atualiza a grade da galeria aberta enquanto as fotos ficam prontas (no máximo a cada 2,5 s).
  const refreshIfViewing = useCallback(
    (galleryId: string, force = false) => {
      if (!pathRef.current.includes(galleryId)) return;
      const now = Date.now();
      if (!force && now - lastRefresh.current < 2500) return;
      lastRefresh.current = now;
      router.refresh();
    },
    [router],
  );

  const sendOne = useCallback(
    async (it: UpItem) => {
      patch(it.id, { status: "enviando" });
      const { file, galleryId, categoryId } = it;
      let res: Response;
      if (blob) {
        const key = `galerias/${galleryId}/originais/${crypto.randomUUID()}-${safe(file.name)}`;
        await upload(key, file, {
          access: "private",
          handleUploadUrl: "/api/admin/upload",
          clientPayload: galleryId,
          multipart: file.size > 8 * 1024 * 1024,
          contentType: file.type || "image/jpeg",
          onUploadProgress: ({ loaded }) => patch(it.id, { loaded }),
        });
        patch(it.id, { loaded: file.size, status: "processando" });
        res = await fetch(`/api/admin/galleries/${galleryId}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, filename: file.name, contentType: file.type || "image/jpeg", categoryId }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        if (categoryId) fd.append("categoryId", categoryId);
        res = await postWithProgress(`/api/admin/galleries/${galleryId}/photos`, fd, (loaded) =>
          patch(it.id, loaded >= file.size ? { loaded: file.size, status: "processando" } : { loaded }),
        );
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "falha no envio");
      }
      patch(it.id, { status: "pronta", loaded: file.size });
    },
    [blob, patch],
  );

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY) {
      const next = itemsRef.current.find((i) => i.status === "fila");
      if (!next) break;
      running.current++;
      patch(next.id, { status: "enviando" });
      sendOne(next)
        .catch((e) => patch(next.id, { status: "erro", error: (e as Error).message }))
        .finally(async () => {
          running.current--;
          const g = next.galleryId;
          const pending = itemsRef.current.some((i) => i.galleryId === g && (i.status === "fila" || i.status === "enviando" || i.status === "processando"));
          if (!pending) {
            // Lote desta galeria terminou: aplica a ordem escolhida (por nome) e atualiza a tela.
            await applyPhotoOrder(g).catch(() => {});
            refreshIfViewing(g, true);
          } else refreshIfViewing(g);
          pumpRef.current();
        });
    }
  }, [patch, refreshIfViewing, sendOne]);
  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const enqueue: Ctx["enqueue"] = useCallback(
    ({ galleryId, galleryTitle, categoryId, files }) => {
      const add = files.map<UpItem>((file) => ({
        id: nextId.current++,
        galleryId,
        galleryTitle,
        categoryId,
        file,
        name: file.name,
        size: file.size,
        loaded: 0,
        status: "fila",
      }));
      commit((l) => [...l, ...add]);
      pump();
    },
    [commit, pump],
  );

  const clearFinished = useCallback(() => commit((l) => l.filter((i) => i.status !== "pronta" && i.status !== "erro")), [commit]);

  const busy = items.some((i) => i.status === "fila" || i.status === "enviando" || i.status === "processando");
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  return (
    <UploadCtx.Provider value={{ items, enqueue, clearFinished, blob }}>
      {children}
      <UploadDock items={items} pathname={pathname} clearFinished={clearFinished} />
    </UploadCtx.Provider>
  );
}

/** Painel flutuante com o progresso, visível em qualquer página do admin. */
function UploadDock({ items, pathname, clearFinished }: { items: UpItem[]; pathname: string; clearFinished: () => void }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const s = summarize(items);
  const galleries = [...new Map(items.map((i) => [i.galleryId, i.galleryTitle])).entries()];
  return (
    <aside className={`dock${open ? " is-open" : ""}${s.busy ? "" : s.failed ? " is-warn" : " is-done"}`} aria-live="polite">
      <button type="button" className="dock-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="dock-title">
          {s.busy ? `Enviando fotos · ${s.finished} de ${s.total} prontas` : s.failed ? `${s.total - s.failed} enviadas · ${s.failed} com erro` : `${s.total} fotos enviadas`}
        </span>
        <strong>{s.pct}%</strong>
        <span className="dock-chevron" aria-hidden="true">{open ? "▾" : "▴"}</span>
      </button>
      <div className="bar dock-bar">
        <i style={{ width: `${s.pct}%` }} className={s.busy ? "is-moving" : s.failed ? "is-warn" : "is-done"} />
      </div>
      {open && (
        <div className="dock-body">
          <p className="dock-sub">
            {mb(s.sentBytes)} de {mb(s.totalBytes)}
            {s.busy ? " · pode navegar pelo painel; não feche nem recarregue a página" : ""}
          </p>
          {galleries.map(([gid, title]) => (
            <div key={gid} className="dock-group">
              {!pathname.includes(gid) ? (
                <Link href={`/admin/galerias/${gid}`} className="dock-gallery">{title} →</Link>
              ) : (
                <span className="dock-gallery">{title}</span>
              )}
              <ul className="up-list">
                {items
                  .filter((i) => i.galleryId === gid)
                  .map((it) => (
                    <UpRow key={it.id} it={it} />
                  ))}
              </ul>
            </div>
          ))}
          {!s.busy && (
            <button type="button" className="linklike" onClick={clearFinished}>
              Limpar lista
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

export function UpRow({ it }: { it: UpItem }) {
  const p = it.size ? Math.round((Math.min(it.loaded, it.size) / it.size) * 100) : 0;
  return (
    <li className={`up-item is-${it.status}`}>
      <span className="up-name" title={it.name}>{it.name}</span>
      <span className="up-state">
        {it.status === "enviando" ? `${p}% · ${mb(it.loaded)} de ${mb(it.size)}` : it.status === "erro" ? it.error : STATUS_LABEL[it.status]}
      </span>
      <span className="up-bar">
        <i style={{ width: `${it.status === "fila" ? 0 : it.status === "enviando" ? p : 100}%` }} />
      </span>
    </li>
  );
}
