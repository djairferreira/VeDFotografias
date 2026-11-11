import type { Metadata } from "next";
import { requireClient } from "@/lib/auth";
import { PasswordForm } from "@/components/PasswordForm";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ClientAccount() {
  const user = await requireClient();
  return (
    <>
      <section className="client-hero">
        <p className="eyebrow">{user.email}</p>
        <h1 className="display"><em>Minha</em> conta</h1>
        <span className="rule" aria-hidden="true" />
        <p>Troque a senha que você recebeu por uma que só você sabe.</p>
      </section>
      <main className="client-main" style={{ maxWidth: 760 }}>
        <PasswordForm />
      </main>
    </>
  );
}
