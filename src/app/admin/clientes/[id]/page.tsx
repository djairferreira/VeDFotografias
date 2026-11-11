/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { formatDate } from "@/lib/photos";
import { deleteClient } from "@/app/actions/admin";
import { EditClientForm, ResetPassword } from "@/components/admin/ClientForms";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = await one<{
    id: string; name: string; email: string; phone: string | null; notes: string | null;
    active: boolean; created_at: string; last_login_at: string | null;
  }>("select * from users where id = $1 and role = 'client'", [id]);
  if (!client) notFound();
  const galleries = await query<{ id: string; title: string; event_date: string | null; published: boolean; cover_photo_id: string | null; photos: string; downloads: string }>(
    `select g.id, g.title, g.event_date, g.published, g.cover_photo_id,
            (select count(*) from photos p where p.gallery_id = g.id) photos,
            (select coalesce(sum(photo_count), 0) from downloads d where d.gallery_id = g.id) downloads
       from galleries g where g.client_id = $1 order by g.created_at desc`,
    [id],
  );

  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/admin/clientes" className="crumb">← Clientes</Link>
          <h1 className="display">{client.name}</h1>
          <p>
            Cliente desde {formatDate(client.created_at)} ·{" "}
            {client.last_login_at ? `último acesso em ${formatDate(client.last_login_at)}` : "ainda não entrou"}
          </p>
        </div>
        <div className="actions">
          <Link href={`/admin/galerias/nova?cliente=${client.id}`} className="btn btn-solid">Nova galeria</Link>
        </div>
      </header>

      <section className="block">
        <div className="block-head"><h2>Galerias</h2></div>
        {galleries.length ? (
          <div className="cards">
            {galleries.map((g) => (
              <Link key={g.id} href={`/admin/galerias/${g.id}`} className="card">
                <div className="card-img">
                  {g.cover_photo_id && <img src={`/api/media/${g.cover_photo_id}/mini`} alt="" loading="lazy" />}
                  {!g.published && <span className="pill pill-off">Oculta</span>}
                </div>
                <span className="card-meta">{g.photos} fotos · {g.downloads} baixadas</span>
                <h3>{g.title}</h3>
                {g.event_date && <p>{formatDate(g.event_date)}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty"><p>Nenhuma galeria para este cliente.</p></div>
        )}
      </section>

      <section className="block">
        <div className="block-head"><h2>Dados e acesso</h2></div>
        <EditClientForm client={client} />
      </section>

      <section className="block">
        <div className="block-head"><h2>Senha</h2></div>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
          Gere uma nova senha se o cliente esqueceu a dele. A anterior deixa de funcionar na hora.
        </p>
        <ResetPassword id={client.id} />
      </section>

      <div className="danger-zone">
        <p>Excluir o cliente apaga também as galerias e todas as fotos dele. Não dá para desfazer.</p>
        <ConfirmDelete action={deleteClient} id={client.id} label="Excluir cliente" question={`Excluir ${client.name} e ${galleries.length} galeria(s)?`} />
      </div>
    </>
  );
}
