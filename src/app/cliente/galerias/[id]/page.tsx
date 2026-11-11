import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { formatDate, galleryForUser } from "@/lib/photos";
import { PhotoGrid } from "@/components/PhotoGrid";

export async function generateMetadata({ params }: PageProps<"/cliente/galerias/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireClient();
  const g = await galleryForUser(id, user);
  return { title: g?.title ?? "Galeria" };
}

export default async function ClientGallery({ params }: PageProps<"/cliente/galerias/[id]">) {
  const { id } = await params;
  const user = await requireClient();
  const gallery = await galleryForUser(id, user);
  if (!gallery) notFound();
  // A galeria com link abre na página bonita; o álbum, sempre com marca d'água.
  if (gallery.slug) redirect(`/${gallery.kind === "album" ? "album" : "galeria"}/${gallery.slug}`);
  const [photos, count] = await Promise.all([
    query<{ id: string; filename: string }>("select id, filename from photos where gallery_id = $1 order by position, created_at", [id]),
    one<{ n: string }>(
      `select count(*) n from galleries where client_id = $1 and published and (expires_at is null or expires_at >= current_date)`,
      [user.id],
    ),
  ]);

  return (
    <>
      <section className="client-hero">
        {Number(count?.n) > 1 && <Link href="/cliente" className="crumb">← Todas as galerias</Link>}
        <p className="eyebrow">{gallery.event_date ? formatDate(gallery.event_date) : `${photos.length} fotos`}</p>
        <h1 className="display">{gallery.title}</h1>
        <span className="rule" aria-hidden="true" />
        {gallery.description && <p style={{ whiteSpace: "pre-wrap" }}>{gallery.description}</p>}
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Toque numa foto para ampliar. Marque as preferidas e baixe só elas, ou baixe tudo num arquivo .zip.
          {gallery.expires_at && ` Disponível até ${formatDate(gallery.expires_at)}.`}
        </p>
      </section>
      <main className="client-main">
        {user.must_change_password && (
          <div className="notice">
            <p>Você está usando a senha que recebeu da gente. <Link href="/cliente/conta">Crie uma senha sua</Link> quando puder.</p>
          </div>
        )}
        <PhotoGrid photos={photos} galleryId={gallery.id} mode="client" />
      </main>
    </>
  );
}
