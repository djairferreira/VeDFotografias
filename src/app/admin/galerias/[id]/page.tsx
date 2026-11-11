import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { formatBytes, type Gallery } from "@/lib/photos";
import { blobEnabled } from "@/lib/storage";
import { deleteGallery } from "@/app/actions/admin";
import { GalleryForm } from "@/components/admin/GalleryForm";
import { Uploader } from "@/components/admin/Uploader";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

export const metadata: Metadata = { title: "Galeria" };

export default async function GalleryAdminPage({ params }: PageProps<"/admin/galerias/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const gallery = await one<Gallery & { client_name: string }>(
    "select g.*, u.name client_name from galleries g join users u on u.id = g.client_id where g.id = $1",
    [id],
  );
  if (!gallery) notFound();
  const [photos, clients, totals] = await Promise.all([
    query<{ id: string; filename: string }>("select id, filename from photos where gallery_id = $1 order by position, created_at", [id]),
    query<{ id: string; name: string; email: string }>("select id, name, email from users where role = 'client' order by name"),
    one<{ bytes: string; downloads: string }>(
      `select (select coalesce(sum(size_bytes),0) from photos where gallery_id = $1) bytes,
              (select coalesce(sum(photo_count),0) from downloads where gallery_id = $1) downloads`,
      [id],
    ),
  ]);

  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/admin/galerias" className="crumb">← Galerias</Link>
          <h1 className="display">{gallery.title}</h1>
          <p>
            De <Link href={`/admin/clientes/${gallery.client_id}`}>{gallery.client_name}</Link> · {photos.length} fotos ·{" "}
            {formatBytes(totals?.bytes ?? 0)} · {totals?.downloads ?? 0} downloads pelo cliente
          </p>
        </div>
        <div className="actions">
          {gallery.published ? <span className="pill pill-on">Visível ao cliente</span> : <span className="pill pill-off">Oculta</span>}
        </div>
      </header>

      <Uploader galleryId={gallery.id} blob={blobEnabled()} />

      <section className="block">
        <PhotoGrid photos={photos} galleryId={gallery.id} mode="admin" coverId={gallery.cover_photo_id} />
      </section>

      <section className="block">
        <div className="block-head"><h2>Dados da galeria</h2></div>
        <GalleryForm clients={clients} gallery={gallery} />
      </section>

      <div className="danger-zone">
        <p>Excluir a galeria apaga as {photos.length} fotos do armazenamento. Não dá para desfazer.</p>
        <ConfirmDelete action={deleteGallery} id={gallery.id} label="Excluir galeria" question={`Excluir "${gallery.title}" e todas as fotos?`} />
      </div>
    </>
  );
}
