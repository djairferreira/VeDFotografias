"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff";

function safe(name: string) {
  return (
    name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) ||
    "foto.jpg"
  );
}

function mb(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`;
  return `${(bytes / 1024 ** 2).toLocaleString("pt-BR", { maximumFractionDigits: bytes < 10 * 1024 ** 2 ? 1 : 0 })} MB`;
}

type Status = "fila" | "enviando" | "processando" | "pronta" | "erro";
type Item = { name: string; size: number; loaded: number; status: Status; error?: string };

const STATUS_LABEL: Record<Status, string> = {
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

export function Uploader({ galleryId, blob, categoryId = null }: { galleryId: string; blob: boolean; categoryId?: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const busy = items.some((i) => i.status === "fila" || i.status === "enviando" || i.status === "processando");

  // Relógio para estimar o tempo que falta (atualiza 1x por segundo durante o envio).
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // Avisa antes de sair da página no meio do envio.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const patch = (i: number, p: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...p } : it)));

  async function sendOne(file: File, i: number) {
    patch(i, { status: "enviando" });
    let res: Response;
    if (blob) {
      const key = `galerias/${galleryId}/originais/${crypto.randomUUID()}-${safe(file.name)}`;
      await upload(key, file, {
        access: "private",
        handleUploadUrl: "/api/admin/upload",
        clientPayload: galleryId,
        multipart: file.size > 8 * 1024 * 1024,
        contentType: file.type || "image/jpeg",
        onUploadProgress: ({ loaded }) => patch(i, { loaded }),
      });
      patch(i, { loaded: file.size, status: "processando" });
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
        patch(i, loaded >= file.size ? { loaded: file.size, status: "processando" } : { loaded }),
      );
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "falha no envio");
    }
    patch(i, { status: "pronta", loaded: file.size });
  }

  async function start(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif|tif|tiff)$/i.test(f.name));
    if (!files.length || busy) return;
    setItems(files.map((f) => ({ name: f.name, size: f.size, loaded: 0, status: "fila" })));
    const t0 = Date.now();
    setStartedAt(t0);
    setNow(t0);
    const queue = files.map((f, i) => [f, i] as const);
    // Três envios ao mesmo tempo.
    await Promise.all(
      Array.from({ length: Math.min(3, files.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const [f, i] = next;
          try {
            await sendOne(f, i);
          } catch (e) {
            patch(i, { status: "erro", error: (e as Error).message });
          }
        }
      }),
    );
    router.refresh();
  }

  const total = items.length;
  const totalBytes = items.reduce((s, i) => s + i.size, 0) || 1;
  const sentBytes = items.reduce((s, i) => s + Math.min(i.loaded, i.size), 0);
  const finished = items.filter((i) => i.status === "pronta" || i.status === "erro").length;
  const failed = items.filter((i) => i.status === "erro");
  // 92% da barra é o envio dos bytes; o resto, o preparo de cada foto no servidor.
  const pct = total ? Math.min(100, Math.round((sentBytes / totalBytes) * 92 + (finished / total) * 8)) : 0;
  const elapsed = now > startedAt ? (now - startedAt) / 1000 : 0;
  const rate = elapsed > 2 ? sentBytes / elapsed : 0;
  const left = rate && sentBytes < totalBytes ? Math.round((totalBytes - sentBytes) / rate) : 0;
  const leftText = left > 90 ? `cerca de ${Math.round(left / 60)} min` : left > 0 ? `cerca de ${left} s` : "";

  return (
    <div className="block">
      <div
        className={`drop${over ? " over" : ""}${busy ? " is-busy" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => !busy && (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          start(e.dataTransfer.files);
        }}
      >
        <strong>{busy ? "Enviando as fotos…" : "Arraste as fotos aqui"}</strong>
        <p>
          {busy
            ? "Pode continuar usando o painel nesta aba; só não feche nem recarregue a página."
            : "ou clique para escolher · JPG, PNG, WEBP, HEIC ou TIFF, de qualquer tamanho · o original fica guardado sem perda para download"}
        </p>
        <input
          ref={input}
          id="upload-input"
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) start(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {total > 0 && (
        <div className="progress" aria-live="polite">
          <div className="progress-head">
            <strong>{pct}%</strong>
            <span>
              {mb(sentBytes)} de {mb(totalBytes)}
              {busy && leftText ? ` · falta ${leftText}` : ""}
            </span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso do envio">
            <i style={{ width: `${pct}%` }} className={busy ? "is-moving" : failed.length ? "is-warn" : "is-done"} />
          </div>
          <p>
            {busy
              ? `${finished} de ${total} prontas… não feche esta página.`
              : `${total - failed.length} de ${total} fotos enviadas.`}
          </p>

          <ul className="up-list">
            {items.map((it, i) => {
              const p = it.size ? Math.round((Math.min(it.loaded, it.size) / it.size) * 100) : 0;
              return (
                <li key={i} className={`up-item is-${it.status}`}>
                  <span className="up-name" title={it.name}>{it.name}</span>
                  <span className="up-state">
                    {it.status === "enviando" ? `${p}% · ${mb(it.loaded)} de ${mb(it.size)}` : it.status === "erro" ? it.error : STATUS_LABEL[it.status]}
                  </span>
                  <span className="up-bar">
                    <i style={{ width: `${it.status === "fila" ? 0 : it.status === "enviando" ? p : 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
          {failed.length > 0 && !busy && (
            <ul className="upload-errors">
              {failed.map((e, i) => (
                <li key={i}>
                  {e.name}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
