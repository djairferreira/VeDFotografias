import type { Metadata } from "next";
import Link from "next/link";
import { NewClientForm } from "@/components/admin/ClientForms";

export const metadata: Metadata = { title: "Novo cliente" };

export default function NewClientPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <Link href="/admin/clientes" className="crumb">← Clientes</Link>
          <h1 className="display"><em>Novo</em> cliente</h1>
          <p>O e-mail vira o login. Depois do cadastro você cria a galeria e envia as fotos.</p>
        </div>
      </header>
      <NewClientForm />
    </>
  );
}
