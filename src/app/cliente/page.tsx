/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/photos";

export default async function ClientHome() {
  const user = await requireClient();
  const galleries = await query<{
    id: string; title: string; event_date: string | null; expires_at: string | null; cover_photo_id: string | null; photos: string;
    kind: string; slug: string | null;
  }>(
    `select g.id, g.title, g.event_date, g.expires_at, g.cover_photo_id, g.kind, g.slug,
            (select count(*) from photos p where p.gallery_id = g.id) photos
       from galleries g
      where g.client_id = $1 and g.published and (g.expires_at is null or g.expires_at >= current_date)
      order by coalesce(g.event_date, g.created_at::date) desc`,
    [user.id],
  );
  const hrefOf = (g: (typeof galleries)[number]) => (g.kind === "album" && g.slug ? `/album/${g.slug}` : g.slug ? `/galeria/${g.slug}` : `/cliente/galerias/${g.id}`);
  if (galleries.length === 1) redirect(hrefOf(galleries[0]));

  return (
    <>
      <section className="client-hero">
        <p className="eyebrow">Olá, {user.name.split(" ")[0]}</p>
        <h1 className="display"><em>Suas</em> galerias</h1>
        <span className="rule" aria-hidden="true" />
        <p>Abra uma galeria para ver as fotos em tela cheia e baixar os originais em alta resolução.</p>
      </section>
      <main className="client-main">
        {user.must_change_password && (
          <div className="notice">
            <p>Você está usando a senha que recebeu da gente. <Link href="/cliente/conta">Crie uma senha sua</Link> quando puder.</p>
          </div>
        )}
        {galleries.length ? (
          <div className="cards">
            {galleries.map((g) => (
              <Link key={g.id} href={hrefOf(g)} className="card">
                <div className="card-img">
                  {g.cover_photo_id && <img src={g.slug ? `/api/p/${g.slug}/${g.cover_photo_id}/mini` : `/api/media/${g.cover_photo_id}/mini`} alt="" loading="lazy" />}
                </div>
                <span className="card-meta">{g.kind === "album" ? "Escolha do álbum · " : ""}{g.photos} fotos{g.expires_at ? ` · disponível até ${formatDate(g.expires_at)}` : ""}</span>
                <h3>{g.title}</h3>
                {g.event_date && <p>{formatDate(g.event_date)}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>Sua galeria ainda não foi publicada. Avisaremos assim que as fotos estiverem prontas.</p>
          </div>
        )}
      </main>
    </>
  );
}
