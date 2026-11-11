import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clientes">) {
  const q = String((await searchParams).q ?? "").trim();
  const clients = await query<{
    id: string; name: string; email: string; phone: string | null; active: boolean;
    last_login_at: string | null; galleries: string; photos: string;
  }>(
    `select u.id, u.name, u.email, u.phone, u.active, u.last_login_at,
            (select count(*) from galleries g where g.client_id = u.id) galleries,
            (select count(*) from photos p join galleries g on g.id = p.gallery_id where g.client_id = u.id) photos
       from users u
      where u.role = 'client' and ($1 = '' or u.name ilike '%' || $1 || '%' or u.email ilike '%' || $1 || '%')
      order by u.created_at desc`,
    [q],
  );

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="display"><em>Clientes</em></h1>
          <p>Cada cliente entra com o próprio e-mail e vê só as galerias dele.</p>
        </div>
        <div className="actions">
          <form className="field" role="search">
            <input id="busca-clientes" name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" aria-label="Buscar" />
          </form>
          <Link href="/admin/clientes/novo" className="btn btn-solid">Novo cliente</Link>
        </div>
      </header>

      {clients.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th className="num">Galerias</th>
                <th className="num">Fotos</th>
                <th>Último acesso</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/clientes/${c.id}`}>{c.name}</Link>
                    <span className="sub">{c.email}</span>
                  </td>
                  <td>{c.phone ?? "—"}</td>
                  <td className="num">{c.galleries}</td>
                  <td className="num">{c.photos}</td>
                  <td>{c.last_login_at ? new Date(c.last_login_at).toLocaleDateString("pt-BR") : "Nunca entrou"}</td>
                  <td>{c.active ? <span className="pill pill-on">Ativo</span> : <span className="pill pill-off">Bloqueado</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <p>{q ? `Nenhum cliente encontrado para "${q}".` : "Nenhum cliente cadastrado ainda."}</p>
          <Link href="/admin/clientes/novo" className="btn btn-solid">Cadastrar o primeiro</Link>
        </div>
      )}
    </>
  );
}
