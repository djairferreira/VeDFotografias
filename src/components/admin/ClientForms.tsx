"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createClient, resetClientPassword, updateClient, type ActionState } from "@/app/actions/admin";

function Credentials({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Acesse ${typeof window !== "undefined" ? window.location.origin : ""}/entrar\nE-mail: ${email}\nSenha: ${password}`;
  return (
    <div className="notice">
      <p className="eyebrow">Envie estes dados ao cliente</p>
      <p>A senha aparece só agora. No primeiro acesso o cliente pode trocá-la em Minha conta.</p>
      <pre className="secret">{text}</pre>
      <div className="actions">
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false))}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function NewClientForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createClient, {});
  if (state.ok && state.password)
    return (
      <>
        <Credentials email={state.email!} password={state.password} />
        <div className="actions">
          <Link href={`/admin/galerias/nova?cliente=${state.ok}`} className="btn btn-solid">Criar galeria para este cliente</Link>
          <Link href={`/admin/clientes/${state.ok}`} className="btn btn-quiet">Abrir cadastro</Link>
        </div>
      </>
    );
  return (
    <form action={action} className="form">
      <label className="field">
        <span>Nome</span>
        <input id="c-name" name="name" required />
      </label>
      <label className="field">
        <span>E-mail (login)</span>
        <input id="c-email" name="email" type="email" required />
      </label>
      <label className="field">
        <span>Telefone</span>
        <input id="c-phone" name="phone" />
      </label>
      <label className="field">
        <span>Senha</span>
        <input id="c-password" name="password" placeholder="Deixe vazio para gerar" autoComplete="new-password" />
        <small>Vazio: o sistema cria uma senha segura.</small>
      </label>
      <label className="field field-wide">
        <span>Observações internas</span>
        <textarea id="c-notes" name="notes" rows={3} />
      </label>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      <div className="form-actions">
        <button className="btn btn-solid" disabled={pending}>{pending ? "Salvando…" : "Cadastrar cliente"}</button>
        <Link href="/admin/clientes" className="btn btn-quiet">Cancelar</Link>
      </div>
    </form>
  );
}

type Client = { id: string; name: string; email: string; phone: string | null; notes: string | null; active: boolean };

export function EditClientForm({ client }: { client: Client }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateClient, {});
  return (
    <form action={action} className="form">
      <input type="hidden" name="id" value={client.id} />
      <label className="field">
        <span>Nome</span>
        <input id="e-name" name="name" defaultValue={client.name} required />
      </label>
      <label className="field">
        <span>E-mail (login)</span>
        <input id="e-email" name="email" type="email" defaultValue={client.email} required />
      </label>
      <label className="field">
        <span>Telefone</span>
        <input id="e-phone" name="phone" defaultValue={client.phone ?? ""} />
      </label>
      <label className="check" style={{ alignSelf: "end" }}>
        <input id="e-active" type="checkbox" name="active" defaultChecked={client.active} />
        Acesso liberado
      </label>
      <label className="field field-wide">
        <span>Observações internas</span>
        <textarea id="e-notes" name="notes" rows={3} defaultValue={client.notes ?? ""} />
      </label>
      {state.error && <p className="form-error field-wide">{state.error}</p>}
      {state.ok && <p className="form-ok field-wide">{state.ok}</p>}
      <div className="form-actions">
        <button className="btn btn-solid" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

export function ResetPassword({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetClientPassword, {});
  if (state.password) return <Credentials email={state.email!} password={state.password} />;
  return (
    <form action={action} className="confirm">
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-quiet" disabled={pending}>{pending ? "Gerando…" : "Gerar nova senha"}</button>
      {state.error && <p className="form-error">{state.error}</p>}
    </form>
  );
}
