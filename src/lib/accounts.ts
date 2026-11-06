import "server-only";
import { io } from "next/cache";
import type { AccountRecord } from "@/lib/account-record";
import { accounts, groups, users, type AccountDoc } from "@/lib/db";

function toAccount(row: AccountDoc): AccountRecord {
  return {
    id: row._id,
    platform: row.platform,
    account: row.account,
    nationality: row.nationality,
    status: row.status,
    createdAt: row.createdAt,
    machine: row.machine,
    project: row.project,
    availableCents: row.availableCents,
    pendingCents: row.pendingCents,
    note: row.note,
  };
}

export async function listAccounts(userId: number): Promise<AccountRecord[]> {
  await io();

  const rows = await (await accounts()).find({ userId }).sort({ sortOrder: 1, _id: 1 }).toArray();
  return rows.map(toAccount);
}

export type MemberAccounts = {
  id: number;
  name: string;
  nickname: string;
  accounts: AccountRecord[];
};

export async function listGroupMemberAccounts(
  groupId: number,
  excludeUserId: number,
): Promise<MemberAccounts[]> {
  await io();

  const members = (await (await users()).find({ groupId, status: "Approved", _id: { $ne: excludeUserId } }).toArray()).sort(
    (left, right) => left.sortOrder - right.sortOrder || left._id - right._id,
  );
  const grouped = await listAccountsByUsers(members.map((member) => member._id));
  return members.map((member) => ({
    id: member._id,
    name: member.name,
    nickname: member.nickname,
    accounts: grouped.get(member._id) ?? [],
  }));
}

export async function listAllAccountsByGroup(): Promise<
  { id: number; name: string; members: MemberAccounts[] }[]
> {
  await io();

  const [groupDocs, memberDocs] = await Promise.all([
    groups().then((collection) => collection.find().sort({ sortOrder: 1, _id: 1 }).toArray()),
    users().then((collection) => collection.find({ status: "Approved" }).toArray()),
  ]);
  const members = [...memberDocs].sort(
    (left, right) => left.groupId - right.groupId || left.sortOrder - right.sortOrder || left._id - right._id,
  );
  const grouped = await listAccountsByUsers(members.map((member) => member._id));

  return groupDocs.map((group) => ({
    id: group._id,
    name: group.name,
    members: members
      .filter((member) => member.groupId === group._id)
      .map((member) => ({
        id: member._id,
        name: member.name,
        nickname: member.nickname,
        accounts: grouped.get(member._id) ?? [],
      })),
  }));
}

export async function listAccountsByUsers(userIds: number[]): Promise<Map<number, AccountRecord[]>> {
  await io();
  const grouped = new Map<number, AccountRecord[]>();
  if (userIds.length === 0) return grouped;

  const rows = await (await accounts()).find({ userId: { $in: userIds } }).sort({ sortOrder: 1, _id: 1 }).toArray();
  for (const row of rows) {
    const owned = grouped.get(row.userId) ?? [];
    owned.push(toAccount(row));
    grouped.set(row.userId, owned);
  }

  return grouped;
}
