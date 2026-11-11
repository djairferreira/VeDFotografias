"use client";

import { useActionState } from "react";
import { sendInquiry, type InquiryState } from "@/app/actions/inquiry";

export function InquiryForm({ services }: { services: string[] }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, {});
  if (state.ok)
    return (
      <div className="inquiry-done">
        <p className="eyebrow">Mensagem recebida</p>
        <p>Obrigada! Respondemos em até dois dias úteis no e-mail que você informou.</p>
      </div>
    );
  return (
    <form action={action} className="inquiry">
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <label className="field">
        <span>Nome</span>
        <input id="inq-name" name="name" required autoComplete="name" />
      </label>
      <label className="field">
        <span>E-mail</span>
        <input id="inq-email" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>Telefone</span>
        <input id="inq-phone" name="phone" autoComplete="tel" />
      </label>
      <label className="field">
        <span>Serviço</span>
        <select id="inq-service" name="service" defaultValue="">
          <option value="">Escolha</option>
          {services.map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option>Outro</option>
        </select>
      </label>
      <label className="field">
        <span>Data do evento</span>
        <input id="inq-date" name="event_date" placeholder="dd/mm/aaaa ou mês" />
      </label>
      <label className="field field-wide">
        <span>Mensagem</span>
        <textarea id="inq-msg" name="message" rows={4} required />
      </label>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      <div className="field-wide">
        <button className="btn btn-solid" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensagem"}
          <svg viewBox="0 0 34 10" aria-hidden="true"><path d="M1 5h31M28 1l4 4-4 4" /></svg>
        </button>
      </div>
    </form>
  );
}
