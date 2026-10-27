"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type FormState = {
  error?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseAmountCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.slice(negative ? 1 : 0).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  const signed = negative ? -cents : cents;
  if (!Number.isSafeInteger(signed) || signed === 0 || Math.abs(signed) > 100_000_000) {
    return null;
  }

  return signed;
}

export async function createWidget(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "Boss") {
    return { error: "Only a boss can create a payment widget." };
  }

  const name = readText(formData, "name");
  if (!name) return { error: "Enter a widget name." };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer." };

  const existing = db
    .prepare(
      "SELECT id FROM payment_widgets WHERE group_id = ? AND name = ? COLLATE NOCASE",
    )
    .get(user.groupId, name);

  if (existing) return { error: "A widget with this name already exists." };

  const result = db
    .prepare(
      "INSERT INTO payment_widgets (group_id, name, created_by) VALUES (?, ?, ?)",
    )
    .run(user.groupId, name, user.id);

  redirect(`/payments/${Number(result.lastInsertRowid)}`);
}

function invalidDate(paidOn: string) {
  const parsedDate = new Date(`${paidOn}T00:00:00Z`);
  return (
    !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== paidOn
  );
}

function paymentFieldError(fields: {
  kind: string;
  amount: number | null;
  paidOn: string;
  info: string;
  account: string;
  note: string;
  memberId: number;
}) {
  if (fields.kind !== "bank" && fields.kind !== "internal") {
    return "Select a payment type.";
  }
  if (fields.amount === null) {
    return "Enter a positive or negative amount, with up to 2 decimal places.";
  }
  if (invalidDate(fields.paidOn)) return "Enter a valid date.";
  if (fields.kind === "bank") {
    if (!fields.info) return "Enter the transaction info.";
    if (fields.info.length > 120) return "Info must be 120 characters or fewer.";
    if (!fields.account) return "Enter the account.";
    if (fields.account.length > 80) return "Account must be 80 characters or fewer.";
    if (fields.note.length > 200) return "Note must be 200 characters or fewer.";
  } else if (!Number.isInteger(fields.memberId) || fields.memberId <= 0) {
    return "Select a member.";
  }
  return null;
}

function loadEditablePayment(user: { id: number; role: string; groupId: number }, paymentId: number) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) return null;

  const payment = db
    .prepare(
      `SELECT payments.id, payments.widget_id, payments.user_id, payments.kind
       FROM payments
       JOIN payment_widgets ON payment_widgets.id = payments.widget_id
       WHERE payments.id = ? AND payment_widgets.group_id = ?`,
    )
    .get(paymentId, user.groupId) as
    | { id: number; widget_id: number; user_id: number; kind: string }
    | undefined;

  if (!payment) return null;
  if (user.role !== "Boss" && Number(payment.user_id) !== user.id) return null;
  return payment;
}

export async function addPayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const widgetId = Number(readText(formData, "widgetId"));
  const kind = readText(formData, "kind");
  const amount = parseAmountCents(readText(formData, "amount"));
  const paidOn = readText(formData, "paidOn");
  const info = readText(formData, "info");
  const account = readText(formData, "account");
  const note = readText(formData, "note");
  const memberId = Number(readText(formData, "memberId"));

  if (!Number.isInteger(widgetId) || widgetId <= 0) {
    return { error: "Select a payment widget." };
  }
  const fieldError = paymentFieldError({ kind, amount, paidOn, info, account, note, memberId });
  if (fieldError || amount === null) {
    return { error: fieldError ?? "Enter a positive or negative amount, with up to 2 decimal places." };
  }

  const widget = db
    .prepare("SELECT id FROM payment_widgets WHERE id = ? AND group_id = ?")
    .get(widgetId, user.groupId);

  if (!widget) return { error: "That widget is not in your group." };

  if (kind === "bank") {
    db.prepare(
      `INSERT INTO payments (
         widget_id, user_id, kind, info, account, member_id, paid_on, amount_cents, note
       ) VALUES (?, ?, 'bank', ?, ?, NULL, ?, ?, ?)`,
    ).run(widgetId, user.id, info, account, paidOn, amount, note);
  } else {
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return { error: "Select a member." };
    }

    const member = db
      .prepare("SELECT id FROM users WHERE id = ? AND status = 'Approved'")
      .get(memberId);

    if (!member) return { error: "Select an approved member." };

    db.prepare(
      `INSERT INTO payments (
         widget_id, user_id, kind, info, account, member_id, paid_on, amount_cents, note
       ) VALUES (?, ?, 'internal', '', '', ?, ?, ?, '')`,
    ).run(widgetId, user.id, memberId, paidOn, amount);
  }

  redirect(`/payments/${widgetId}`);
}

export async function updatePayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const payment = loadEditablePayment(user, Number(readText(formData, "paymentId")));
  if (!payment) return { error: "That payment could not be found." };

  const amount = parseAmountCents(readText(formData, "amount"));
  const paidOn = readText(formData, "paidOn");
  const info = readText(formData, "info");
  const account = readText(formData, "account");
  const note = readText(formData, "note");
  const memberId = Number(readText(formData, "memberId"));
  const fieldError = paymentFieldError({
    kind: String(payment.kind),
    amount,
    paidOn,
    info,
    account,
    note,
    memberId,
  });
  if (fieldError || amount === null) {
    return { error: fieldError ?? "Enter a positive or negative amount, with up to 2 decimal places." };
  }

  if (payment.kind === "bank") {
    db.prepare(
      `UPDATE payments
       SET info = ?, account = ?, member_id = NULL, paid_on = ?, amount_cents = ?, note = ?
       WHERE id = ?`,
    ).run(info, account, paidOn, amount, note, payment.id);
  } else {
    const member = db
      .prepare("SELECT id FROM users WHERE id = ? AND status = 'Approved'")
      .get(memberId);
    if (!member) return { error: "Select an approved member." };

    db.prepare(
      `UPDATE payments
       SET info = '', account = '', member_id = ?, paid_on = ?, amount_cents = ?, note = ''
       WHERE id = ?`,
    ).run(memberId, paidOn, amount, payment.id);
  }

  redirect(`/payments/${Number(payment.widget_id)}`);
}

export async function deletePayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const payment = loadEditablePayment(user, Number(readText(formData, "paymentId")));
  if (!payment) return { error: "That payment could not be found." };

  db.prepare("DELETE FROM payments WHERE id = ?").run(payment.id);
  redirect(`/payments/${Number(payment.widget_id)}`);
}
