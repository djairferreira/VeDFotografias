/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSiteContent, imageUrl } from "@/lib/site-content";
import { LoginForm } from "@/components/LoginForm";
import "../panel.css";

export const metadata: Metadata = { title: "Área do cliente" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/cliente");
  const c = await getSiteContent();
  return (
    <main className="login">
      <img src={imageUrl(c, "login")} alt="" className="login-bg" />
      <div className="login-card">
        <Link href="/" className="login-brand">{c.brand}</Link>
        <p className="eyebrow">Área do cliente</p>
        <h1 className="display">
          <em>Suas</em> fotos
        </h1>
        <p className="login-lead">Entre com o e-mail e a senha que você recebeu para ver e baixar a sua galeria.</p>
        <LoginForm />
        <p className="login-help">Esqueceu a senha? Fale com a gente em {c.email}.</p>
      </div>
    </main>
  );
}
