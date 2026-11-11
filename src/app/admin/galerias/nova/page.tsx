import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { GalleryForm } from "@/components/admin/GalleryForm";

export const metadata: Metadata = { title: "Nova galeria" };

export default async function NewGalleryPage({ searchParams }: PageProps<"/admin/galerias/nova">) {
  const cliente = String((await searchParams).cliente ?? "");
  const clients = await query<{ id: string; name: string; email: string }>(
    "select id, name, email from users where role = 'client' order by name",
  );
  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/admin/galerias" className="crumb">← Galerias</Link>
          <h1 className="display"><em>Nova</em> galeria</h1>
          <p>Crie a galeria e, na tela seguinte, arraste as fotos.</p>
        </div>
      </header>
      {clients.length ? (
        <GalleryForm clients={clients} defaultClient={cliente} />
      ) : (
        <div className="empty">
          <p>Cadastre um cliente antes de criar a galeria.</p>
          <Link href="/admin/clientes/novo" className="btn btn-solid">Novo cliente</Link>
        </div>
      )}
    </>
  );
}
