"use client";

import { useState } from "react";

/** Botão de exclusão em dois passos (o navegador do painel não usa confirm()). */
export function ConfirmDelete({
  action,
  id,
  label,
  question,
}: {
  action: (form: FormData) => Promise<void>;
  id: string;
  label: string;
  question: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="btn btn-danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <form action={action} className="confirm">
      <input type="hidden" name="id" value={id} />
      <p className="form-error">{question}</p>
      <button className="btn btn-danger">Sim, excluir</button>
      <button type="button" className="btn btn-quiet" onClick={() => setAsking(false)}>
        Cancelar
      </button>
    </form>
  );
}
