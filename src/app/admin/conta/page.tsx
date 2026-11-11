import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PasswordForm } from "@/components/PasswordForm";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AdminAccount() {
  const user = await requireAdmin();
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{user.email}</p>
          <h1 className="display"><em>Minha</em> conta</h1>
        </div>
      </header>
      <PasswordForm />
    </>
  );
}
