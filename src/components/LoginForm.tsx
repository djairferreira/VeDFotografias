"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="login-form">
      <label className="field">
        <span>E-mail</span>
        <input id="login-email" name="email" type="email" autoComplete="username" defaultValue={state.email} required />
      </label>
      <label className="field">
        <span>Senha</span>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <button className="btn btn-solid" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
