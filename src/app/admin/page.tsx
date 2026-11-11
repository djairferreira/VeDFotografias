import Link from "next/link";
import { query, one } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/photos";
import { getUsage, usd } from "@/lib/usage";

export default async function AdminHome() {
  const [stats, recentDownloads, messages, usage] = await Promise.all([
    one<{ clients: string; galleries: string; photos: string; bytes: string; downloads: string }>(
      `select (select count(*) from users where role = 'client') clients,
              (select count(*) from galleries) galleries,
              (select count(*) from photos) photos,
              (select coalesce(sum(size_bytes), 0) from photos) bytes,
              (select coalesce(sum(photo_count), 0) from downloads where created_at > now() - interval '30 days') downloads`,
    ),
    query<{ name: string; title: string; gallery_id: string; kind: string; photo_count: number; created_at: string }>(
      `select u.name, g.title, d.gallery_id, d.kind, d.photo_count, d.created_at
         from downloads d join users u on u.id = d.user_id join galleries g on g.id = d.gallery_id
        order by d.created_at desc limit 8`,
    ),
    query<{ id: string; name: string; service: string | null; created_at: string; read: boolean }>(
      "select id, name, service, created_at, read from inquiries order by created_at desc limit 6",
    ),
    getUsage(1),
  ]);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="display">
            <em>Bom</em> trabalho
          </h1>
          <p>
            {formatBytes(stats?.bytes ?? 0)} em originais guardados · Neon estimado em{" "}
            <Link href="/admin/armazenamento">{usd(usage.neonTotal)} por mês</Link>
          </p>
        </div>
        <div className="actions">
          <Link href="/admin/clientes/novo" className="btn btn-quiet">Novo cliente</Link>
          <Link href="/admin/galerias/nova" className="btn btn-solid">Nova galeria</Link>
        </div>
      </header>

      <section className="stats" aria-label="Números">
        <Link href="/admin/clientes" className="stat"><b>{stats?.clients}</b><span>Clientes</span></Link>
        <Link href="/admin/galerias" className="stat"><b>{stats?.galleries}</b><span>Galerias</span></Link>
        <div className="stat"><b>{stats?.photos}</b><span>Fotos</span></div>
        <div className="stat"><b>{stats?.downloads}</b><span>Downloads em 30 dias</span></div>
      </section>

      <div className="two-col">
        <section className="block">
          <div className="block-head">
            <h2>Últimos downloads</h2>
          </div>
          {recentDownloads.length ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {recentDownloads.map((d, i) => (
                    <tr key={i}>
                      <td>
                        {d.name}
                        <span className="sub">
                          <Link href={`/admin/galerias/${d.gallery_id}`}>{d.title}</Link>
                        </span>
                      </td>
                      <td>{d.kind === "zip" ? `ZIP · ${d.photo_count} fotos` : "1 foto"}</td>
                      <td className="num">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><p>Os downloads dos clientes aparecem aqui.</p></div>
          )}
        </section>

        <section className="block">
          <div className="block-head">
            <h2>Mensagens do site</h2>
            <Link href="/admin/mensagens">Ver todas</Link>
          </div>
          {messages.length ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id} className={m.read ? "" : "unread"}>
                      <td>
                        <Link href="/admin/mensagens">{m.name}</Link>
                        <span className="sub">{m.service ?? "Sem serviço indicado"}</span>
                      </td>
                      <td className="num">{formatDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><p>Pedidos de orçamento do site aparecem aqui.</p></div>
          )}
        </section>
      </div>
    </>
  );
}
