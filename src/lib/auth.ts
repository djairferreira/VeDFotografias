import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { one, query } from "./db";

export const SESSION_COOKIE = "capture_sessao";
const SESSION_DAYS = 30;

export type Role = "admin" | "client";
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  must_change_password: boolean;
};

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
    hashToken(token),
    userId,
    expires,
  ]);
  await query("update users set last_login_at = now() where id = $1", [userId]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Usuário logado (uma consulta por requisição). */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return one<SessionUser>(
    `select u.id, u.name, u.email, u.role, u.must_change_password
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.active`,
    [hashToken(token)],
  );
});

export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/entrar");
  if (user.role !== "admin") redirect("/cliente");
  return user;
}

export async function requireClient() {
  const user = await getUser();
  if (!user) redirect("/entrar");
  if (user.role === "admin") redirect("/admin");
  return user;
}

/** Verifica e-mail e senha, com limite de 6 tentativas erradas a cada 15 minutos. */
export async function verifyLogin(email: string, password: string) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const recent = await one<{ n: string }>(
    `select count(*) n from login_attempts
      where lower(email) = lower($1) and not success and created_at > now() - interval '15 minutes'`,
    [email],
  );
  if (Number(recent?.n ?? 0) >= 6) return { error: "Muitas tentativas. Aguarde 15 minutos e tente de novo." } as const;

  const user = await one<{ id: string; password_hash: string; role: Role; active: boolean }>(
    "select id, password_hash, role, active from users where lower(email) = lower($1)",
    [email],
  );
  const ok = !!user && user.active && (await bcrypt.compare(password, user.password_hash));
  await query("insert into login_attempts (email, ip, success) values ($1, $2, $3)", [email, ip, ok]);
  if (!ok || !user) return { error: "E-mail ou senha incorretos." } as const;
  return { user } as const;
}

export async function checkPassword(userId: string, password: string) {
  const row = await one<{ password_hash: string }>("select password_hash from users where id = $1", [userId]);
  return !!row && bcrypt.compare(password, row.password_hash);
}

export function generatePassword() {
  // Sem caracteres que se confundem (0/O, 1/l/I).
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
