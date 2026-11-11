"use server";

import { query } from "@/lib/db";

export type InquiryState = { ok?: boolean; error?: string };

export async function sendInquiry(_: InquiryState, form: FormData): Promise<InquiryState> {
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 2000);
  // Campo invisível: robôs costumam preencher.
  if (get("site")) return { ok: true };
  const name = get("name");
  const email = get("email");
  const message = get("message");
  if (!name || !email || !message) return { error: "Preencha nome, e-mail e mensagem." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Confira o e-mail digitado." };
  await query(
    "insert into inquiries (name, email, phone, service, event_date, message) values ($1,$2,$3,$4,$5,$6)",
    [name, email, get("phone") || null, get("service") || null, get("event_date") || null, message],
  );
  return { ok: true };
}
