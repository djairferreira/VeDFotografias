"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="form" key={state.ok ? "done" : "form"}>
      <label className="field field-wide">
        <span>Senha atual</span>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>Nova senha</span>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={8} required />
        <small>Pelo menos 8 caracteres.</small>
      </label>
      <label className="field">
        <span>Repita a nova senha</span>
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      {state.ok && <p className="form-ok field-wide">{state.ok}</p>}
      <div className="form-actions">
        <button className="btn btn-solid" disabled={pending}>{pending ? "Salvando…" : "Trocar senha"}</button>
      </div>
    </form>
  );
}
