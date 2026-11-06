import "server-only";
import { io } from "next/cache";
import { isBoss } from "@/lib/access";
import {
  groups,
  payments,
  users,
  widgets,
  type GroupDoc,
  type PaymentDoc,
  type UserDoc,
  type UserRole,
} from "@/lib/db";

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
  groupId: number;
  groupName: string;
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

type SortedPayment = PaymentRecord & {
  userId: number;
  ownerNickname: string;
  otherGroupSort: number;
  counterpartySort: number;
  counterpartyId: number;
};

function emptySummary(): WidgetSummary {
  return { totalCents: 0, bankCents: 0, internalByGroup: [] };
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "accent" });
}

function toSortedPayment(
  payment: PaymentDoc,
  owner: UserDoc,
  usersById: Map<number, UserDoc>,
  groupsById: Map<number, GroupDoc>,
  ownGroupId: number,
): SortedPayment {
  const counterparty = payment.memberId == null ? undefined : usersById.get(payment.memberId);
  const internal = payment.kind === "internal";
  const memberGroupId = internal ? (counterparty?.groupId ?? owner.groupId) : owner.groupId;
  const memberGroup = groupsById.get(memberGroupId);
  const ownerGroup = groupsById.get(owner.groupId);
  return {
    id: payment._id,
    userId: payment.userId,
    kind: payment.kind,
    info: payment.info,
    account: payment.account,
    memberNickname: internal ? (counterparty?.nickname ?? owner.nickname) : owner.nickname,
    memberId: payment.memberId,
    memberGroupId,
    memberGroupName: (internal ? memberGroup?.name : ownerGroup?.name) ?? "",
    paidOn: payment.paidOn,
    amountCents: payment.amountCents,
    note: payment.note,
    ownerNickname: owner.nickname,
    otherGroupSort: internal && memberGroupId !== ownGroupId ? (memberGroup?.sortOrder ?? 1_000_000) : 0,
    counterpartySort: internal ? (counterparty?.sortOrder ?? 1_000_000) : 0,
    counterpartyId: internal ? (counterparty?._id ?? 0) : 0,
  };
}

function paymentRank(payment: SortedPayment, ownGroupId: number) {
  if (payment.kind === "bank") return 0;
  return payment.memberGroupId === ownGroupId ? 1 : 2;
}

function comparePayments(left: SortedPayment, right: SortedPayment, ownGroupId: number) {
  return (
    paymentRank(left, ownGroupId) - paymentRank(right, ownGroupId) ||
    left.otherGroupSort - right.otherGroupSort ||
    left.counterpartySort - right.counterpartySort ||
    left.counterpartyId - right.counterpartyId ||
    left.paidOn.localeCompare(right.paidOn) ||
    left.id - right.id
  );
}

async function loadDirectory() {
  const [userDocs, groupDocs] = await Promise.all([users().then((collection) => collection.find().toArray()), groups().then((collection) => collection.find().toArray())]);
  return {
    usersById: new Map(userDocs.map((user) => [user._id, user])),
    groupsById: new Map(groupDocs.map((group) => [group._id, group])),
  };
}

async function widgetSummary(groupId: number | null) {
  const summaries = new Map<number, WidgetSummary>();
  const remember = (widgetId: number) => {
    const current = summaries.get(widgetId) ?? emptySummary();
    summaries.set(widgetId, current);
    return current;
  };
  const { usersById, groupsById } = await loadDirectory();
  const widgetDocs = await (await widgets()).find(groupId == null ? {} : { groupId }).toArray();
  const widgetGroup = new Map(widgetDocs.map((widget) => [widget._id, widget.groupId]));
  const paymentDocs = await (await payments())
    .find(groupId == null ? {} : { widgetId: { $in: widgetDocs.map((widget) => widget._id) } })
    .toArray();

  const internalBuckets = new Map<string, WidgetGroupTotal & { sortOrder: number }>();
  for (const payment of paymentDocs) {
    const ownerGroupId = widgetGroup.get(payment.widgetId);
    const owner = usersById.get(payment.userId);
    if (ownerGroupId == null || !owner || owner.status !== "Approved" || owner.groupId !== ownerGroupId) continue;

    const summary = remember(payment.widgetId);
    summary.totalCents += payment.amountCents;
    if (payment.kind === "bank") summary.bankCents += payment.amountCents;
    if (payment.kind !== "internal") continue;

    const counterparty = payment.memberId == null ? undefined : usersById.get(payment.memberId);
    const targetGroupId = counterparty?.groupId ?? owner.groupId;
    const targetGroup = groupsById.get(targetGroupId);
    const key = `${payment.widgetId}:${targetGroupId}`;
    const bucket = internalBuckets.get(key);
    if (bucket) {
      bucket.amountCents += payment.amountCents;
      continue;
    }
    internalBuckets.set(key, {
      groupId: targetGroupId,
      name: targetGroup?.name.trim() || `Group ${targetGroupId}`,
      amountCents: payment.amountCents,
      sortOrder: targetGroup?.sortOrder ?? 1_000_000,
    });
  }

  for (const [key, bucket] of internalBuckets) {
    const widgetId = Number(key.split(":")[0]);
    remember(widgetId).internalByGroup.push({
      groupId: bucket.groupId,
      name: bucket.name,
      amountCents: bucket.amountCents,
    });
  }

  for (const summary of summaries.values()) {
    summary.internalByGroup.sort((left, right) => {
      const leftSort = groupsById.get(left.groupId)?.sortOrder ?? 1_000_000;
      const rightSort = groupsById.get(right.groupId)?.sortOrder ?? 1_000_000;
      return leftSort - rightSort || left.groupId - right.groupId;
    });
  }

  return summaries;
}

export async function listWidgets(groupId: number, viewer: Viewer): Promise<PaymentWidget[]> {
  await io();

  const group = await (await groups()).findOne({ _id: groupId });
  const widgetDocs = await (await widgets()).find({ groupId }).sort({ _id: -1 }).toArray();
  const paymentDocs = await (await payments())
    .find({ widgetId: { $in: widgetDocs.map((widget) => widget._id) } })
    .toArray();
  const summaries = isBoss(viewer.role) ? await widgetSummary(groupId) : null;

  return widgetDocs.map((widget) => {
    const rows = paymentDocs.filter(
      (payment) => payment.widgetId === widget._id && (isBoss(viewer.role) || payment.userId === viewer.id),
    );
    return {
      id: widget._id,
      name: widget.name,
      groupId: widget.groupId,
      groupName: group?.name ?? "",
      paymentCount: rows.length,
      summary: summaries
        ? summaries.get(widget._id) ?? emptySummary()
        : {
            totalCents: rows.reduce((sum, payment) => sum + payment.amountCents, 0),
            bankCents: rows.reduce((sum, payment) => sum + (payment.kind === "bank" ? payment.amountCents : 0), 0),
            internalByGroup: [],
          },
    };
  });
}

export async function listAllWidgets(): Promise<PaymentWidget[]> {
  await io();

  const [groupDocs, widgetDocs, summaries] = await Promise.all([
    groups().then((collection) => collection.find().sort({ sortOrder: 1, _id: 1 }).toArray()),
    widgets().then((collection) => collection.find().toArray()),
    widgetSummary(null),
  ]);
  const groupsById = new Map(groupDocs.map((group) => [group._id, group]));
  const ordered = [...widgetDocs].sort((left, right) => {
    const leftGroup = groupsById.get(left.groupId);
    const rightGroup = groupsById.get(right.groupId);
    return (
      (leftGroup?.sortOrder ?? 0) - (rightGroup?.sortOrder ?? 0) ||
      left.groupId - right.groupId ||
      right._id - left._id
    );
  });

  return ordered.map((widget) => ({
    id: widget._id,
    name: widget.name,
    groupId: widget.groupId,
    groupName: groupsById.get(widget.groupId)?.name ?? "",
    paymentCount: 0,
    summary: summaries.get(widget._id) ?? emptySummary(),
  }));
}

export async function getWidget(id: number, groupId: number | null) {
  await io();

  const widget = await (await widgets()).findOne({
    _id: id,
    ...(groupId == null ? {} : { groupId }),
  });
  if (!widget) return null;
  const group = await (await groups()).findOne({ _id: widget.groupId });
  if (!group) return null;

  return {
    id: widget._id,
    name: widget.name,
    groupId: widget.groupId,
    groupName: group.name,
  };
}

export async function listMembers(): Promise<GroupMember[]> {
  await io();

  const [userDocs, groupDocs] = await Promise.all([
    users().then((collection) => collection.find({ status: "Approved" }).toArray()),
    groups().then((collection) => collection.find().toArray()),
  ]);
  const groupsById = new Map(groupDocs.map((group) => [group._id, group]));

  return userDocs
    .map((user) => ({
      id: user._id,
      nickname: user.nickname,
      groupName: groupsById.get(user.groupId)?.name ?? "",
    }))
    .sort((left, right) => compareText(left.groupName, right.groupName) || compareText(left.nickname, right.nickname));
}

async function sortedPayments(filter: { widgetId: number; userId?: number }, ownGroupId: number) {
  const { usersById, groupsById } = await loadDirectory();
  const paymentDocs = await (await payments()).find(filter).toArray();
  return paymentDocs
    .flatMap((payment) => {
      const owner = usersById.get(payment.userId);
      if (!owner) return [];
      return [toSortedPayment(payment, owner, usersById, groupsById, ownGroupId)];
    })
    .sort((left, right) => comparePayments(left, right, ownGroupId));
}

export async function listPayments(
  widgetId: number,
  viewer: Viewer & { groupId: number },
): Promise<PaymentRecord[]> {
  await io();
  return sortedPayments({ widgetId, userId: viewer.id }, viewer.groupId);
}

export async function listMemberPayments(
  widgetId: number,
  groupId: number,
): Promise<{ id: number; name: string; nickname: string; payments: PaymentRecord[] }[]> {
  await io();

  const members = (await (await users()).find({ groupId, status: "Approved" }).toArray()).sort(
    (left, right) => left.sortOrder - right.sortOrder || left._id - right._id,
  );
  const rows = (await sortedPayments({ widgetId }, groupId)).filter((payment) => {
    const owner = members.find((member) => member._id === payment.userId);
    return owner?.status === "Approved" && owner.groupId === groupId;
  });
  rows.sort(
    (left, right) => compareText(left.ownerNickname, right.ownerNickname) || comparePayments(left, right, groupId),
  );

  const byUser = new Map<number, PaymentRecord[]>();
  for (const row of rows) {
    const paymentsForUser = byUser.get(row.userId) ?? [];
    paymentsForUser.push(row);
    byUser.set(row.userId, paymentsForUser);
  }

  return members.map((member) => ({
    id: member._id,
    name: member.name,
    nickname: member.nickname,
    payments: byUser.get(member._id) ?? [],
  }));
}
