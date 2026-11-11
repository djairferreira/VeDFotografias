import type { Metadata } from "next";
import { query } from "@/lib/db";
import { deleteInquiry, toggleInquiry } from "@/app/actions/admin";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  const items = await query<{
    id: string; name: string; email: string; phone: string | null; service: string | null;
    event_date: string | null; message: string; read: boolean; created_at: string;
  }>("select * from inquiries order by read, created_at desc");
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Formulário do site</p>
          <h1 className="display"><em>Mensagens</em></h1>
          <p>Pedidos de orçamento enviados pela seção de contato.</p>
        </div>
      </header>
      {items.length ? (
        <div className="block">
          {items.map((m) => (
            <article key={m.id} className="notice" style={{ background: m.read ? "var(--paper)" : undefined }}>
              <div className="block-head">
                <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 400, fontSize: 22, margin: 0 }}>
                  {m.name} {!m.read && <span className="pill pill-on">Nova</span>}
                </h2>
                <span className="card-meta">{new Date(m.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <p className="card-meta">
                {[m.service, m.event_date].filter(Boolean).join(" · ") || "Sem serviço indicado"}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
              <p>
                <span style={{ userSelect: "all" }}>{m.email}</span>
                {m.phone && <> · <span style={{ userSelect: "all" }}>{m.phone}</span></>}
              </p>
              <div className="actions">
                <form action={toggleInquiry}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn btn-quiet btn-sm">{m.read ? "Marcar como nova" : "Marcar como lida"}</button>
                </form>
                <ConfirmDelete action={deleteInquiry} id={m.id} label="Excluir" question="Excluir esta mensagem?" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty"><p>Nenhuma mensagem recebida ainda.</p></div>
      )}
    </>
  );
}
