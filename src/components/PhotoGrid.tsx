"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState, useTransition } from "react";
import { deletePhotos, setCover } from "@/app/actions/admin";

export type GridPhoto = { id: string; filename: string };

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" /></svg>
);
const Down = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v9M4 7.5 8 11.5 12 7.5M2.5 14h11" /></svg>
);
const ArrowL = () => <svg viewBox="0 0 34 10" aria-hidden="true"><path d="M33 5H2M6 1 2 5l4 4" /></svg>;
const ArrowR = () => <svg viewBox="0 0 34 10" aria-hidden="true"><path d="M1 5h31M28 1l4 4-4 4" /></svg>;

export function PhotoGrid({
  photos,
  galleryId,
  mode,
  coverId,
}: {
  photos: GridPhoto[];
  galleryId: string;
  mode: "admin" | "client";
  coverId?: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const admin = mode === "admin";

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  // Pré-carrega a próxima foto do visualizador.
  useEffect(() => {
    if (open === null || photos.length < 2) return;
    const next = photos[(open + 1) % photos.length];
    const img = new Image();
    img.src = `/api/media/${next.id}/tela`;
  }, [open, photos]);

  const ids = [...selected];
  const zipHref = (list?: string[]) => `/api/zip/${galleryId}${list?.length ? `?ids=${list.join(",")}` : ""}`;
  const logParam = admin ? "?log=0" : "";

  if (!photos.length)
    return (
      <div className="empty">
        <p>{admin ? "Nenhuma foto nesta galeria. Envie acima." : "As fotos desta galeria ainda estão sendo preparadas."}</p>
      </div>
    );

  const current = open !== null ? photos[open] : null;

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-info">
          {selected.size ? `${selected.size} de ${photos.length} selecionadas` : `${photos.length} fotos`}
        </span>
        <div className="actions">
          {selected.size > 0 ? (
            <>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSelected(new Set())}>Limpar</button>
              <a className="btn btn-solid btn-sm" href={zipHref(ids)}>
                Baixar {selected.size} {selected.size === 1 ? "foto" : "fotos"}
              </a>
              {admin &&
                (confirming ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deletePhotos(galleryId, ids);
                          setSelected(new Set());
                          setConfirming(false);
                        })
                      }
                    >
                      {pending ? "Excluindo…" : `Confirmar exclusão de ${selected.size}`}
                    </button>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirming(false)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>Excluir</button>
                ))}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSelected(new Set(photos.map((p) => p.id)))}>
                Selecionar todas
              </button>
              <a className="btn btn-solid btn-sm" href={zipHref()}>Baixar todas (.zip)</a>
            </>
          )}
        </div>
      </div>

      <div className="grid">
        {photos.map((p, i) => (
          <div key={p.id} className={`tile${selected.has(p.id) ? " selected" : ""}`}>
            <button type="button" className="open" onClick={() => setOpen(i)} aria-label={`Ver ${p.filename}`}>
              <img src={`/api/media/${p.id}/mini`} alt={p.filename} loading="lazy" decoding="async" />
            </button>
            <button
              type="button"
              className="tile-check"
              aria-pressed={selected.has(p.id)}
              aria-label={selected.has(p.id) ? "Desmarcar" : "Selecionar"}
              onClick={() => toggle(p.id)}
            >
              <Check />
            </button>
            <a className="tile-dl" href={`/api/media/${p.id}/original${logParam}`} aria-label={`Baixar ${p.filename}`}>
              <Down />
            </a>
            {admin && coverId === p.id && <span className="tile-badge">Capa</span>}
          </div>
        ))}
      </div>

      {current && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={current.filename}>
          <div className="viewer-top">
            <span>{open! + 1} / {photos.length} · {current.filename}</span>
            <button type="button" className="viewer-close" onClick={() => setOpen(null)}>Fechar ✕</button>
          </div>
          <div className="viewer-stage" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            <img key={current.id} src={`/api/media/${current.id}/tela`} alt={current.filename} />
            <button type="button" className="viewer-nav prev" onClick={() => step(-1)} aria-label="Anterior"><ArrowL /></button>
            <button type="button" className="viewer-nav next" onClick={() => step(1)} aria-label="Próxima"><ArrowR /></button>
          </div>
          <div className="viewer-bottom">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(current.id)}>
              {selected.has(current.id) ? "Desmarcar" : "Selecionar"}
            </button>
            <a className="btn btn-solid btn-sm" href={`/api/media/${current.id}/original${logParam}`}>Baixar original</a>
            {admin && coverId !== current.id && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => startTransition(() => setCover(galleryId, current.id))}
              >
                Usar como capa
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
