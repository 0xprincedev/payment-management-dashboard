"use server";

import { redirect } from "next/navigation";
import { isAdmin, isBoss } from "@/lib/access";
import { caseInsensitive, groups, nextId, payments, users, widgets, type PaymentDoc } from "@/lib/db";
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
  if (!isBoss(user.role)) {
    return { error: "Only a boss can create a payment widget." };
  }

  const name = readText(formData, "name");
  if (!name) return { error: "Enter a widget name." };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer." };

  const existing = await (await widgets()).findOne(
    { groupId: user.groupId, name },
    { collation: caseInsensitive },
  );

  if (existing) return { error: "A widget with this name already exists." };

  const id = await nextId("widgets");
  await (await widgets()).insertOne({
    _id: id,
    groupId: user.groupId,
    name,
    createdBy: user.id,
  });

  redirect(`/payments/${id}`);
}

function widgetReturnPath(value: string, widgetId: number) {
  if (value === "/payments" || value === `/payments/${widgetId}`) return value;
  return "/payments";
}

async function loadGroupWidget(groupId: number, widgetId: number) {
  if (!Number.isInteger(widgetId) || widgetId <= 0) return null;
  return (await widgets()).findOne({ _id: widgetId, groupId });
}

export async function renameWidget(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!isBoss(user.role)) return { error: "Only a boss can edit a payment widget." };

  const widgetId = Number(readText(formData, "widgetId"));
  const widget = await loadGroupWidget(user.groupId, widgetId);
  if (!widget) return { error: "That widget is not in your group." };

  const name = readText(formData, "name");
  if (!name) return { error: "Enter a widget name." };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer." };

  const existing = await (await widgets()).findOne(
    { groupId: user.groupId, name, _id: { $ne: widget._id } },
    { collation: caseInsensitive },
  );
  if (existing) return { error: "A widget with this name already exists." };

  await (await widgets()).updateOne({ _id: widget._id, groupId: user.groupId }, { $set: { name } });

  redirect(widgetReturnPath(readText(formData, "returnTo"), widget._id));
}

export async function deleteWidget(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!isBoss(user.role)) return { error: "Only a boss can delete a payment widget." };

  const widgetId = Number(readText(formData, "widgetId"));
  const widget = await loadGroupWidget(user.groupId, widgetId);
  if (!widget) return { error: "That widget is not in your group." };

  try {
    await (await payments()).deleteMany({ widgetId: widget._id });
    const deleted = await (await widgets()).deleteOne({ _id: widget._id, groupId: user.groupId });
    if (deleted.deletedCount !== 1) return { error: "That widget could not be deleted." };
  } catch {
    return { error: "That widget could not be deleted." };
  }

  redirect("/payments");
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

async function loadEditablePayment(user: { id: number; role: string; groupId: number }, paymentId: number) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) return null;

  const payment = await (await payments()).findOne({ _id: paymentId });
  if (!payment) return null;
  const widget = await (await widgets()).findOne({ _id: payment.widgetId, groupId: user.groupId });
  if (!widget) return null;
  if (isAdmin(user.role) || (!isBoss(user.role) && payment.userId !== user.id)) return null;
  return payment;
}

export async function addPayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (isAdmin(user.role)) return { error: "Admins can view payments, not add them." };

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

  const widget = await (await widgets()).findOne({ _id: widgetId, groupId: user.groupId });

  if (!widget) return { error: "That widget is not in your group." };

  if (kind === "bank") {
    const document: PaymentDoc = {
      _id: await nextId("payments"),
      widgetId,
      userId: user.id,
      kind: "bank",
      info,
      account,
      memberId: null,
      paidOn,
      amountCents: amount,
      note,
    };
    await (await payments()).insertOne(document);
  } else {
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return { error: "Select a member." };
    }

    const member = await (await users()).findOne({ _id: memberId, status: "Approved" });
    if (!member) return { error: "Select an approved member." };

    await (await payments()).insertOne({
      _id: await nextId("payments"),
      widgetId,
      userId: user.id,
      kind: "internal",
      info: "",
      account: "",
      memberId,
      paidOn,
      amountCents: amount,
      note: "",
    });
  }

  redirect(`/payments/${widgetId}`);
}

export async function updatePayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const payment = await loadEditablePayment(user, Number(readText(formData, "paymentId")));
  if (!payment) return { error: "That payment could not be found." };

  const amount = parseAmountCents(readText(formData, "amount"));
  const paidOn = readText(formData, "paidOn");
  const info = readText(formData, "info");
  const account = readText(formData, "account");
  const note = readText(formData, "note");
  const memberId = Number(readText(formData, "memberId"));
  const fieldError = paymentFieldError({
    kind: payment.kind,
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
    await (await payments()).updateOne(
      { _id: payment._id },
      { $set: { info, account, memberId: null, paidOn, amountCents: amount, note } },
    );
  } else {
    const member = await (await users()).findOne({ _id: memberId, status: "Approved" });
    if (!member) return { error: "Select an approved member." };

    await (await payments()).updateOne(
      { _id: payment._id },
      { $set: { info: "", account: "", memberId, paidOn, amountCents: amount, note: "" } },
    );
  }

  redirect(`/payments/${payment.widgetId}`);
}

export async function deletePayment(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const payment = await loadEditablePayment(user, Number(readText(formData, "paymentId")));
  if (!payment) return { error: "That payment could not be found." };

  await (await payments()).deleteOne({ _id: payment._id });
  redirect(`/payments/${payment.widgetId}`);
}

export type GroupTransaction = {
  id: number;
  member: string;
  memberSort: number;
  paidOn: string;
  amountCents: number;
  note: string;
};

export type GroupTransactions = {
  groupName: string;
  totalCents: number;
  rows: GroupTransaction[];
};

export async function loadGroupTransactions(
  widgetId: number,
  groupId: number,
): Promise<GroupTransactions | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to view these transactions." };
  if (!isBoss(user.role) && !isAdmin(user.role)) {
    return { error: "Only a boss or an admin can view another group's transactions." };
  }

  const widget = await (await widgets()).findOne({
    _id: widgetId,
    ...(isAdmin(user.role) ? {} : { groupId: user.groupId }),
  });
  if (!widget) return { error: "That widget is not in your group." };
  const ownerGroupId = widget.groupId;
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "That group could not be found." };
  if (groupId === ownerGroupId) return { error: "Your own group does not open here." };

  const group = await (await groups()).findOne({ _id: groupId });
  if (!group) return { error: "That group could not be found." };

  const [ownerDocs, paymentDocs] = await Promise.all([
    users().then((collection) => collection.find({ groupId: ownerGroupId, status: "Approved" }).toArray()),
    payments().then((collection) => collection.find({ widgetId, kind: "internal" }).toArray()),
  ]);
  const owners = new Map(ownerDocs.map((owner) => [owner._id, owner]));
  const counterparties = await (await users()).find({ groupId }).toArray();
  const counterpartyById = new Map(counterparties.map((member) => [member._id, member]));

  const transactions = paymentDocs
    .flatMap((payment) => {
      const owner = owners.get(payment.userId);
      const counterparty = payment.memberId == null ? undefined : counterpartyById.get(payment.memberId);
      if (!owner || !counterparty || counterparty.groupId !== groupId) return [];
      return [
        {
          id: payment._id,
          member: owner.nickname,
          memberSort: owner.sortOrder,
          ownerId: owner._id,
          paidOn: payment.paidOn,
          amountCents: payment.amountCents,
          note: counterparty.nickname,
        },
      ];
    })
    .sort((left, right) => left.paidOn.localeCompare(right.paidOn) || left.id - right.id)
    .map(({ ownerId: _ownerId, ...row }) => row);

  return {
    groupName: String(group.name).trim() || `Group ${groupId}`,
    totalCents: transactions.reduce((sum, row) => sum + row.amountCents, 0),
    rows: transactions,
  };
}
