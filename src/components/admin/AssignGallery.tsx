"use client";

import { useActionState, useState } from "react";
import { assignGallery, unassignGallery, type ActionState } from "@/app/actions/admin";

type Option = { id: string; title: string; owner: string | null; photos: string };

/** No cadastro do cliente: escolhe uma galeria existente e atribui a ele. */
export function AssignGallery({ clientId, options }: { clientId: string; options: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(assignGallery, {});
  const free = options.filter((o) => !o.owner);
  const taken = options.filter((o) => o.owner);
  if (!options.length)
    return (
      <div className="field">
        {state.ok && <p className="form-ok">{state.ok}</p>}
        <small>Não há outras galerias para atribuir. Crie uma em Nova galeria.</small>
      </div>
    );
  return (
    <form action={action} className="form" key={state.ok ?? "form"}>
      <input type="hidden" name="client_id" value={clientId} />
      <label className="field">
        <span>Galeria existente</span>
        <select id="assign-gallery" name="gallery_id" defaultValue="" required>
          <option value="" disabled>Escolha a galeria</option>
          {free.length > 0 && (
            <optgroup label="Sem cliente">
              {free.map((o) => (
                <option key={o.id} value={o.id}>{o.title} · {o.photos} fotos</option>
              ))}
            </optgroup>
          )}
          {taken.length > 0 && (
            <optgroup label="De outro cliente (será transferida)">
              {taken.map((o) => (
                <option key={o.id} value={o.id}>{o.title} · hoje de {o.owner}</option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <div className="form-actions" style={{ gridColumn: "auto", alignSelf: "end" }}>
        <button className="btn btn-solid" disabled={pending}>{pending ? "Atribuindo…" : "Atribuir a este cliente"}</button>
      </div>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      {state.ok && <p className="form-ok field-wide">{state.ok}</p>}
    </form>
  );
}

/** Tira a galeria do cliente, em dois passos. A galeria continua existindo, sem cliente. */
export function UnassignGallery({ galleryId }: { galleryId: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="linklike" onClick={() => setAsking(true)}>
        Remover deste cliente
      </button>
    );
  return (
    <form action={unassignGallery} className="confirm">
      <input type="hidden" name="gallery_id" value={galleryId} />
      <button className="btn btn-danger btn-sm">Remover</button>
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAsking(false)}>Cancelar</button>
    </form>
  );
}
