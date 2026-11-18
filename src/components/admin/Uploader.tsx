"use client";

import { useRef, useState } from "react";
import { mb, summarize, UpRow, useUploads } from "./UploadQueue";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff";
const keyOf = (name: string, size: number) => `${name.toLowerCase()}|${size}`;

/**
 * Área de envio de uma galeria. Os arquivos entram na fila do painel inteiro (UploadQueue),
 * então o envio continua mesmo trocando de aba. Antes de enviar, avisa sobre fotos repetidas
 * (mesmo nome e mesmo tamanho de uma foto já na galeria, na fila ou no próprio lote).
 */
export function Uploader({
  galleryId,
  galleryTitle,
  categoryId = null,
  existing,
}: {
  galleryId: string;
  galleryTitle: string;
  categoryId?: string | null;
  existing: { name: string; size: number }[];
}) {
  const { items, enqueue } = useUploads();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState<{ fresh: File[]; dups: File[] } | null>(null);

  const mine = items.filter((i) => i.galleryId === galleryId);
  const s = summarize(mine);

  function pick(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif|tif|tiff)$/i.test(f.name));
    if (!files.length) return;
    const known = new Set([
      ...existing.map((e) => keyOf(e.name, e.size)),
      ...mine.filter((i) => i.status !== "erro").map((i) => keyOf(i.name, i.size)),
    ]);
    const fresh: File[] = [];
    const dups: File[] = [];
    for (const f of files) {
      const k = keyOf(f.name, f.size);
      if (known.has(k)) dups.push(f);
      else {
        known.add(k); // repetida dentro do próprio lote também conta
        fresh.push(f);
      }
    }
    if (dups.length) setPending({ fresh, dups });
    else send(fresh);
  }

  function send(files: File[]) {
    setPending(null);
    if (files.length) enqueue({ galleryId, galleryTitle, categoryId, files });
  }

  return (
    <div className="block">
      <div
        className={`drop${over ? " over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files);
        }}
      >
        <strong>Arraste as fotos aqui</strong>
        <p>
          ou clique para escolher · JPG, PNG, WEBP, HEIC ou TIFF, de qualquer tamanho · o envio continua enquanto você mexe em outras abas do painel
        </p>
        <input
          ref={input}
          id="upload-input"
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pending && (
        <div className="dup" role="alertdialog" aria-labelledby="dup-t">
          <p id="dup-t" className="dup-title">
            {pending.dups.length === 1 ? "1 foto já está nesta galeria" : `${pending.dups.length} fotos já estão nesta galeria`}
          </p>
          <p className="dup-text">Mesmo nome e mesmo tamanho de uma foto já enviada (ou repetida na seleção):</p>
          <ul className="dup-list">
            {pending.dups.slice(0, 8).map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
            {pending.dups.length > 8 && <li>e mais {pending.dups.length - 8}</li>}
          </ul>
          <div className="actions">
            <button type="button" className="btn btn-solid" disabled={!pending.fresh.length} onClick={() => send(pending.fresh)}>
              {pending.fresh.length ? `Ignorar duplicadas e enviar ${pending.fresh.length}` : "Nada novo para enviar"}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => send([...pending.fresh, ...pending.dups])}>
              Enviar todas mesmo assim
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div className="progress" aria-live="polite">
          <div className="progress-head">
            <strong>{s.pct}%</strong>
            <span>
              {mb(s.sentBytes)} de {mb(s.totalBytes)}
            </span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct} aria-label="Progresso do envio">
            <i style={{ width: `${s.pct}%` }} className={s.busy ? "is-moving" : s.failed ? "is-warn" : "is-done"} />
          </div>
          <p>
            {s.busy
              ? `${s.finished} de ${s.total} prontas… pode mexer em outras abas; só não feche a página.`
              : `${s.total - s.failed} de ${s.total} fotos enviadas.`}
          </p>
          <ul className="up-list">
            {mine.map((it) => (
              <UpRow key={it.id} it={it} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
