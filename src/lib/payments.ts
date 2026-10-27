import "server-only";
import { io } from "next/cache";
import type { SQLOutputValue } from "node:sqlite";
import { db, type UserRole } from "@/lib/db";

export { formatAmount } from "@/lib/amount";

export type WidgetGroupTotal = {
  groupId: number;
  name: string;
  amountCents: number;
};

export type WidgetSummary = {
  totalCents: number;
  bankCents: number;
  internalByGroup: WidgetGroupTotal[];
};

export type PaymentWidget = {
  id: number;
  name: string;
  paymentCount: number;
  summary: WidgetSummary | null;
};

export type PaymentKind = "bank" | "internal";

export type PaymentRecord = {
  id: number;
  kind: PaymentKind;
  info: string;
  account: string;
  memberNickname: string;
  memberId: number | null;
  memberGroupId: number;
  memberGroupName: string;
  paidOn: string;
  amountCents: number;
  note: string;
};

export type GroupMember = {
  id: number;
  nickname: string;
  groupName: string;
};

type Viewer = {
  id: number;
  role: UserRole;
};

function seesEveryRecord(role: UserRole) {
  return role === "Boss" ? 1 : 0;
}

export async function listWidgets(groupId: number, viewer: Viewer): Promise<PaymentWidget[]> {
  await io();

  const summaries = viewer.role === "Boss" ? widgetSummary(groupId) : null;

  return db
    .prepare(
      `SELECT payment_widgets.id, payment_widgets.name, COUNT(payments.id) AS payment_count,
              COALESCE(SUM(payments.amount_cents), 0) AS total_cents,
              COALESCE(SUM(CASE WHEN payments.kind = 'bank' THEN payments.amount_cents ELSE 0 END), 0) AS bank_cents
       FROM payment_widgets
       LEFT JOIN payments
         ON payments.widget_id = payment_widgets.id
        AND (? = 1 OR payments.user_id = ?)
       WHERE payment_widgets.group_id = ?
       GROUP BY payment_widgets.id
       ORDER BY payment_widgets.id DESC`,
    )
    .all(seesEveryRecord(viewer.role), viewer.id, groupId)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      paymentCount: Number(row.payment_count),
      summary: summaries
        ? summaries.get(Number(row.id)) ?? emptySummary()
        : {
            totalCents: Number(row.total_cents),
            bankCents: Number(row.bank_cents),
            internalByGroup: [],
          },
    }));
}

function emptySummary(): WidgetSummary {
  return { totalCents: 0, bankCents: 0, internalByGroup: [] };
}

function widgetSummary(groupId: number) {
  const summaries = new Map<number, WidgetSummary>();
  const remember = (widgetId: number) => {
    const current = summaries.get(widgetId) ?? emptySummary();
    summaries.set(widgetId, current);
    return current;
  };

  const totals = db
    .prepare(
      `SELECT payments.widget_id AS widget_id,
              COALESCE(SUM(payments.amount_cents), 0) AS total_cents,
              COALESCE(SUM(CASE WHEN payments.kind = 'bank' THEN payments.amount_cents ELSE 0 END), 0) AS bank_cents
       FROM payments
       JOIN users ON users.id = payments.user_id
       WHERE users.group_id = ?
         AND users.status = 'Approved'
         AND payments.widget_id IN (SELECT id FROM payment_widgets WHERE group_id = ?)
       GROUP BY payments.widget_id`,
    )
    .all(groupId, groupId);

  for (const row of totals) {
    const summary = remember(Number(row.widget_id));
    summary.totalCents = Number(row.total_cents);
    summary.bankCents = Number(row.bank_cents);
  }

  const internal = db
    .prepare(
      `SELECT payments.widget_id AS widget_id,
              COALESCE(counterparty.group_id, users.group_id) AS group_id,
              COALESCE(counterparty_group.name, owner_group.name, '') AS group_name,
              SUM(payments.amount_cents) AS cents
       FROM payments
       JOIN users ON users.id = payments.user_id
       LEFT JOIN users AS counterparty ON counterparty.id = payments.member_id
       LEFT JOIN groups AS counterparty_group ON counterparty_group.id = counterparty.group_id
       LEFT JOIN groups AS owner_group ON owner_group.id = users.group_id
       WHERE payments.kind = 'internal'
         AND users.group_id = ?
         AND users.status = 'Approved'
         AND payments.widget_id IN (SELECT id FROM payment_widgets WHERE group_id = ?)
       GROUP BY payments.widget_id, COALESCE(counterparty.group_id, users.group_id)
       ORDER BY COALESCE(counterparty.group_id, users.group_id)`,
    )
    .all(groupId, groupId);

  for (const row of internal) {
    const groupIdValue = Number(row.group_id);
    const name = String(row.group_name).trim();
    remember(Number(row.widget_id)).internalByGroup.push({
      groupId: groupIdValue,
      name: name || `Group ${groupIdValue}`,
      amountCents: Number(row.cents),
    });
  }

  return summaries;
}

export async function getWidget(id: number, groupId: number) {
  await io();

  const row = db
    .prepare("SELECT id, name FROM payment_widgets WHERE id = ? AND group_id = ?")
    .get(id, groupId) as { id: number; name: string } | undefined;

  if (!row) return null;

  return { id: Number(row.id), name: String(row.name) };
}

export async function listMembers(): Promise<GroupMember[]> {
  await io();

  return db
    .prepare(
      `SELECT users.id, users.nickname, groups.name AS group_name
       FROM users
       JOIN groups ON groups.id = users.group_id
       WHERE users.status = 'Approved'
       ORDER BY groups.name COLLATE NOCASE, users.nickname COLLATE NOCASE`,
    )
    .all()
    .map((row) => ({
      id: Number(row.id),
      nickname: String(row.nickname),
      groupName: String(row.group_name),
    }));
}

const paymentSelect = `SELECT payments.id, payments.user_id, payments.kind, payments.info, payments.account,
       payments.member_id, payments.paid_on, payments.amount_cents, payments.note,
       CASE
         WHEN payments.kind = 'internal' THEN COALESCE(counterparty.nickname, users.nickname)
         ELSE users.nickname
       END AS member_nickname,
       CASE
         WHEN payments.kind = 'internal' THEN COALESCE(counterparty.group_id, users.group_id)
         ELSE users.group_id
       END AS member_group_id,
       CASE
         WHEN payments.kind = 'internal' THEN COALESCE(counterparty_group.name, owner_group.name, '')
         ELSE COALESCE(owner_group.name, '')
       END AS member_group_name
FROM payments
JOIN users ON users.id = payments.user_id
LEFT JOIN users AS counterparty ON counterparty.id = payments.member_id
LEFT JOIN groups AS counterparty_group ON counterparty_group.id = counterparty.group_id
LEFT JOIN groups AS owner_group ON owner_group.id = users.group_id`;

const paymentOrder = `ORDER BY
  CASE
    WHEN payments.kind = 'bank' THEN 0
    WHEN COALESCE(counterparty.group_id, users.group_id) = ? THEN 1
    ELSE 2
  END,
  CASE
    WHEN payments.kind = 'internal'
     AND COALESCE(counterparty.group_id, users.group_id) != ?
    THEN COALESCE(counterparty.group_id, users.group_id)
    ELSE 0
  END,
  payments.paid_on,
  payments.id`;

function toPayment(row: Record<string, SQLOutputValue>): PaymentRecord {
  return {
    id: Number(row.id),
    kind: row.kind === "internal" ? "internal" : "bank",
    info: String(row.info),
    account: String(row.account),
    memberNickname: String(row.member_nickname),
    memberId: row.member_id == null ? null : Number(row.member_id),
    memberGroupId: Number(row.member_group_id),
    memberGroupName: String(row.member_group_name),
    paidOn: String(row.paid_on),
    amountCents: Number(row.amount_cents),
    note: String(row.note),
  };
}

export async function listPayments(
  widgetId: number,
  viewer: Viewer & { groupId: number },
): Promise<PaymentRecord[]> {
  await io();

  return db
    .prepare(
      `${paymentSelect}
       WHERE payments.widget_id = ?
         AND payments.user_id = ?
       ${paymentOrder}`,
    )
    .all(widgetId, viewer.id, viewer.groupId, viewer.groupId)
    .map((row) => toPayment(row));
}

export async function listMemberPayments(
  widgetId: number,
  viewer: Viewer & { groupId: number },
): Promise<{ id: number; name: string; nickname: string; payments: PaymentRecord[] }[]> {
  await io();
  if (viewer.role !== "Boss") return [];

  const members = db
    .prepare(
      `SELECT id, name, nickname
       FROM users
       WHERE group_id = ? AND status = 'Approved'
       ORDER BY sort_order, id`,
    )
    .all(viewer.groupId)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      nickname: String(row.nickname),
    }));

  const rows = db
    .prepare(
      `${paymentSelect}
       WHERE payments.widget_id = ?
         AND users.group_id = ?
         AND users.status = 'Approved'
       ORDER BY users.nickname COLLATE NOCASE,
         CASE
           WHEN payments.kind = 'bank' THEN 0
           WHEN COALESCE(counterparty.group_id, users.group_id) = ? THEN 1
           ELSE 2
         END,
         CASE
           WHEN payments.kind = 'internal'
            AND COALESCE(counterparty.group_id, users.group_id) != ?
           THEN COALESCE(counterparty.group_id, users.group_id)
           ELSE 0
         END,
         payments.paid_on,
         payments.id`,
    )
    .all(widgetId, viewer.groupId, viewer.groupId, viewer.groupId);

  const byUser = new Map<number, PaymentRecord[]>();
  for (const row of rows) {
    const ownerId = Number(row.user_id);
    const payments = byUser.get(ownerId) ?? [];
    payments.push(toPayment(row));
    byUser.set(ownerId, payments);
  }

  return members.map((member) => ({
    id: member.id,
    name: member.name,
    nickname: member.nickname,
    payments: byUser.get(member.id) ?? [],
  }));
}
