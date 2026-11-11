"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { clearSelection, markSelectionSeen, reopenSelection } from "@/app/actions/admin";

export function SelectionReview({
  galleryId,
  limit,
  submitted,
  name,
  note,
  chosen,
}: {
  galleryId: string;
  limit: number;
  submitted: string | null;
  name: string | null;
  note: string | null;
  chosen: { id: string; filename: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (submitted) markSelectionSeen(galleryId);
  }, [galleryId, submitted]);

  // Nomes sem extensão, separados por vírgula: colar no filtro do Lightroom encontra as fotos.
  const names = chosen.map((p) => p.filename.replace(/\.[^.]+$/, "")).join(", ");

  return (
    <div className="block" style={{ gap: 26 }}>
      <div className={`notice${submitted ? " notice-ok" : ""}`}>
        {submitted ? (
          <>
            <p className="eyebrow">Seleção recebida</p>
            <p>
              <strong>{name ?? "Cliente"}</strong> enviou {chosen.length} de {limit} fotos em{" "}
              {new Date(submitted).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}.
            </p>
            {note && <p style={{ whiteSpace: "pre-wrap" }}>Recado: “{note}”</p>}
          </>
        ) : (
          <>
            <p className="eyebrow">Aguardando o cliente</p>
            <p>
              {chosen.length} de {limit} fotos escolhidas até agora. Quando o cliente tocar em Enviar seleção, ela aparece aqui e no Início.
            </p>
          </>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="actions">
          <a className="btn btn-solid" href={`/api/zip/${galleryId}?escolhidas=1`}>Baixar as escolhidas (.zip)</a>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => navigator.clipboard?.writeText(names).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000))).catch(() => {})}
          >
            {copied ? "Copiado" : "Copiar nomes dos arquivos"}
          </button>
          {submitted && (
            <form action={reopenSelection}>
              <input type="hidden" name="id" value={galleryId} />
              <button className="btn btn-quiet">Reabrir para o cliente trocar</button>
            </form>
          )}
          {confirm ? (
            <form action={clearSelection} className="confirm">
              <input type="hidden" name="id" value={galleryId} />
              <span className="form-error">Desmarcar todas as {chosen.length}?</span>
              <button className="btn btn-danger btn-sm">Sim, limpar</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirm(false)}>Cancelar</button>
            </form>
          ) : (
            <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>Limpar seleção</button>
          )}
        </div>
      )}

      {chosen.length > 0 && (
        <>
          <p className="dc-hint" style={{ margin: 0 }}>
            Dica: cole os nomes copiados no filtro de texto do Lightroom para achar as {chosen.length} fotos de uma vez.
          </p>
          <div className="grid">
            {chosen.map((p) => (
              <div key={p.id} className="tile">
                <img src={`/api/media/${p.id}/mini`} alt={p.filename} loading="lazy" />
                <span className="tile-badge">{p.filename}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
