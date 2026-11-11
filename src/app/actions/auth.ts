"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, getUser, hashPassword, verifyLogin } from "@/lib/auth";
import { query } from "@/lib/db";

export type FormState = { error?: string; ok?: string; email?: string };

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha.", email };
  const res = await verifyLogin(email, password);
  if ("error" in res) return { error: res.error, email };
  await createSession(res.user.id);
  redirect(res.user.role === "admin" ? "/admin" : "/cliente");
}

export async function logout() {
  await destroySession();
  redirect("/entrar");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/entrar");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!(await checkPassword(user.id, current))) return { error: "A senha atual não confere." };
  if (next.length < 8) return { error: "A nova senha precisa de pelo menos 8 caracteres." };
  if (next !== confirm) return { error: "A confirmação é diferente da nova senha." };
  await query("update users set password_hash = $2, must_change_password = false where id = $1", [
    user.id,
    await hashPassword(next),
  ]);
  return { ok: "Senha alterada." };
}
