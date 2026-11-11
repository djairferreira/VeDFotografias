"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createGallery, updateGallery, type ActionState } from "@/app/actions/admin";

type Gallery = {
  id: string; client_id: string | null; title: string; description: string | null;
  event_date: string | null; expires_at: string | null; published: boolean;
};

export function GalleryForm({
  clients,
  gallery,
  defaultClient,
}: {
  clients: { id: string; name: string; email: string }[];
  gallery?: Gallery;
  defaultClient?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(gallery ? updateGallery : createGallery, {});
  const [kind, setKind] = useState<"gallery" | "album">("gallery");
  return (
    <form action={action} className="form">
      {gallery && <input type="hidden" name="id" value={gallery.id} />}
      {!gallery && (
        <div className="field-wide kind-cards">
          <label className={`kind-card${kind === "gallery" ? " is-on" : ""}`}>
            <input type="radio" name="kind" value="gallery" checked={kind === "gallery"} onChange={() => setKind("gallery")} />
            <strong>Galeria para entregar</strong>
            <span>Fotos prontas, por categoria, com download em alta. Link para noivos e convidados.</span>
          </label>
          <label className={`kind-card${kind === "album" ? " is-on" : ""}`}>
            <input type="radio" name="kind" value="album" checked={kind === "album"} onChange={() => setKind("album")} />
            <strong>Álbum para seleção</strong>
            <span>O cliente escolhe as fotos do álbum entre todas, com marca d&apos;água, e envia para vocês.</span>
          </label>
        </div>
      )}
      {!gallery && kind === "album" && (
        <label className="field field-wide" style={{ maxWidth: 420 }}>
          <span>Quantas fotos o cliente pode escolher</span>
          <input id="g-limit" name="select_limit" type="number" min={1} defaultValue={60} required />
          <small>Ex.: 60 fotos contratadas para o álbum.</small>
        </label>
      )}
      <label className="field">
        <span>Cliente</span>
        <select id="g-client" name="client_id" defaultValue={gallery?.client_id ?? defaultClient ?? ""}>
          <option value="">Sem cliente (atribuir depois)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {c.email}</option>
          ))}
        </select>
        <small>Só o cliente escolhido vê a galeria. Dá para trocar ou atribuir depois.</small>
      </label>
      <label className="field">
        <span>Nome da galeria</span>
        <input id="g-title" name="title" defaultValue={gallery?.title} placeholder="Ex.: Casamento Ana & Pedro" required />
      </label>
      <label className="field">
        <span>Data do ensaio ou evento</span>
        <input id="g-date" name="event_date" type="date" defaultValue={gallery?.event_date ?? ""} />
      </label>
      <label className="field">
        <span>Disponível até</span>
        <input id="g-expires" name="expires_at" type="date" defaultValue={gallery?.expires_at ?? ""} />
        <small>Vazio: sem prazo. Depois da data o cliente não vê mais a galeria.</small>
      </label>
      <label className="field field-wide">
        <span>Recado para o cliente</span>
        <textarea id="g-desc" name="description" rows={3} defaultValue={gallery?.description ?? ""} placeholder="Aparece no topo da galeria" />
      </label>
      <label className="check field-wide">
        <input id="g-published" type="checkbox" name="published" defaultChecked={gallery?.published ?? true} />
        Visível para o cliente
      </label>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      {state.ok && <p className="form-ok field-wide">{state.ok}</p>}
      <div className="form-actions">
        <button className="btn btn-solid" disabled={pending}>
          {pending ? "Salvando…" : gallery ? "Salvar galeria" : "Criar e enviar fotos"}
        </button>
        {!gallery && <Link href="/admin/galerias" className="btn btn-quiet">Cancelar</Link>}
      </div>
    </form>
  );
}
