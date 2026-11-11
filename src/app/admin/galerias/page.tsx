/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/photos";

export const metadata: Metadata = { title: "Galerias" };

export default async function GalleriesPage() {
  const galleries = await query<{
    id: string; title: string; event_date: string | null; published: boolean; expires_at: string | null;
    cover_photo_id: string | null; client: string; photos: string; expired: boolean;
  }>(
    `select g.id, g.title, g.event_date, g.published, g.expires_at, g.cover_photo_id, u.name client,
            (select count(*) from photos p where p.gallery_id = g.id) photos,
            (g.expires_at is not null and g.expires_at < current_date) expired
       from galleries g join users u on u.id = g.client_id
      order by g.created_at desc`,
  );
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Entregas</p>
          <h1 className="display"><em>Galerias</em></h1>
          <p>Cada galeria pertence a um cliente.</p>
        </div>
        <Link href="/admin/galerias/nova" className="btn btn-solid">Nova galeria</Link>
      </header>
      {galleries.length ? (
        <div className="cards">
          {galleries.map((g) => (
            <Link key={g.id} href={`/admin/galerias/${g.id}`} className="card">
              <div className="card-img">
                {g.cover_photo_id && <img src={`/api/media/${g.cover_photo_id}/mini`} alt="" loading="lazy" />}
                {!g.published ? (
                  <span className="pill pill-off">Oculta</span>
                ) : g.expired ? (
                  <span className="pill pill-warn">Expirada</span>
                ) : null}
              </div>
              <span className="card-meta">{g.client} · {g.photos} fotos</span>
              <h3>{g.title}</h3>
              {g.event_date && <p>{formatDate(g.event_date)}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>Nenhuma galeria criada ainda.</p>
          <Link href="/admin/galerias/nova" className="btn btn-solid">Criar a primeira</Link>
        </div>
      )}
    </>
  );
}
