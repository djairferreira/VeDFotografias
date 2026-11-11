import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { formatBytes, formatDate, GALLERY_COLUMNS, type Gallery } from "@/lib/photos";
import { readDesign } from "@/lib/gallery-design";
import { getSiteContent } from "@/lib/site-content";
import { blobEnabled } from "@/lib/storage";
import { deleteGallery } from "@/app/actions/admin";
import { GalleryForm } from "@/components/admin/GalleryForm";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { CoverDesigner } from "@/components/admin/CoverDesigner";
import { LinkSettings } from "@/components/admin/LinkSettings";
import { SelectionReview } from "@/components/admin/SelectionReview";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import "../../../gallery.css";

export const metadata: Metadata = { title: "Galeria" };

const TABS = [
  { key: "fotos", label: "1. Fotos e categorias" },
  { key: "capa", label: "2. Capa e título" },
  { key: "link", label: "3. Link" },
  { key: "selecao", label: "Seleção do cliente", album: true },
  { key: "dados", label: "Dados e cliente" },
] as const;

export default async function GalleryAdminPage({ params, searchParams }: PageProps<"/admin/galerias/[id]">) {
  const { id } = await params;
  const aba = String((await searchParams).aba ?? "fotos");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const gallery = await one<Gallery & { client_name: string | null; public_downloads: number; selection_seen: boolean }>(
    `select ${GALLERY_COLUMNS.replace(/(^|,\s*)(\w+)/g, "$1g.$2")}, g.public_downloads, g.selection_seen, u.name client_name
       from galleries g left join users u on u.id = g.client_id where g.id = $1`,
    [id],
  );
  if (!gallery) notFound();
  const album = gallery.kind === "album";
  const [photos, categories, clients, totals, site, h] = await Promise.all([
    query<{ id: string; filename: string; c: string | null; s: boolean }>(
      "select id, filename, category_id c, selected s from photos where gallery_id = $1 order by position, created_at",
      [id],
    ),
    query<{ id: string; name: string }>("select id, name from categories where gallery_id = $1 order by position, name", [id]),
    query<{ id: string; name: string; email: string }>("select id, name, email from users where role = 'client' order by name"),
    one<{ bytes: string; downloads: string }>(
      `select (select coalesce(sum(size_bytes),0) from photos where gallery_id = $1) bytes,
              (select coalesce(sum(photo_count),0) from downloads where gallery_id = $1) downloads`,
      [id],
    ),
    getSiteContent(),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const publicUrl = gallery.slug ? `${origin}/${album ? "album" : "galeria"}/${gallery.slug}` : null;
  const chosen = photos.filter((p) => p.s);
  const tab = TABS.find((t) => t.key === aba && (!("album" in t) || album))?.key ?? "fotos";

  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/admin/galerias" className="crumb">← Galerias</Link>
          <h1 className="display">{gallery.title}</h1>
          <p>
            {album ? `Álbum para seleção · ${chosen.length}/${gallery.select_limit ?? 0} escolhidas` : "Galeria para entregar"} · {photos.length} fotos ·{" "}
            {formatBytes(totals?.bytes ?? 0)}
            {!album && ` · ${gallery.public_downloads + Number(totals?.downloads ?? 0)} downloads`}
            {gallery.client_id ? (
              <>
                {" "}· de <Link href={`/admin/clientes/${gallery.client_id}`}>{gallery.client_name}</Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="actions">
          {gallery.link_enabled && publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-solid">Abrir link ↗</a>
          ) : (
            <Link href={`?aba=link`} className="btn btn-quiet">Link fechado</Link>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Etapas">
        {TABS.filter((t) => !("album" in t) || album).map((t) => (
          <Link key={t.key} href={`?aba=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
            {t.key === "selecao" && gallery.selection_submitted_at && !gallery.selection_seen && <span className="side-count">nova</span>}
          </Link>
        ))}
      </nav>

      {tab === "fotos" && (
        <PhotoManager
          galleryId={gallery.id}
          blob={blobEnabled()}
          coverId={gallery.cover_photo_id}
          categories={categories}
          photos={photos}
          album={album}
        />
      )}

      {tab === "capa" && (
        <CoverDesigner
          galleryId={gallery.id}
          initialTitle={gallery.title}
          initial={readDesign(gallery.design)}
          dateText={gallery.event_date ? formatDate(gallery.event_date) : ""}
          brand={site.brand.toUpperCase()}
          coverId={gallery.cover_photo_id}
          photos={photos.map((p) => ({ id: p.id }))}
        />
      )}

      {tab === "link" && <LinkSettings gallery={gallery} origin={origin} photoCount={photos.length} />}

      {tab === "selecao" && album && (
        <SelectionReview
          galleryId={gallery.id}
          limit={gallery.select_limit ?? 0}
          submitted={gallery.selection_submitted_at ? new Date(gallery.selection_submitted_at).toISOString() : null}
          name={gallery.selection_name}
          note={gallery.selection_note}
          chosen={chosen}
        />
      )}

      {tab === "dados" && (
        <>
          <section className="block">
            <div className="block-head"><h2>Dados da galeria</h2></div>
            <GalleryForm clients={clients} gallery={gallery} />
          </section>
          <div className="danger-zone">
            <p>Excluir a galeria apaga as {photos.length} fotos do armazenamento. Não dá para desfazer.</p>
            <ConfirmDelete action={deleteGallery} id={gallery.id} label="Excluir galeria" question={`Excluir "${gallery.title}" e todas as fotos?`} />
          </div>
        </>
      )}
    </>
  );
}
