import "server-only";
import { io } from "next/cache";
import type { AccountRecord } from "@/lib/account-record";
import { db } from "@/lib/db";

function optionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toAccount(row: Record<string, unknown>): AccountRecord {
  return {
    id: Number(row.id),
    account: String(row.account),
    nationality: String(row.nationality),
    status: String(row.status),
    hours: optionalText(row.hours),
    jobs: optionalText(row.jobs),
    bids: optionalText(row.bids),
    interview: optionalText(row.interview),
    workInProgress: optionalText(row.work_in_progress),
    note: String(row.note),
  };
}

export async function listAccounts(userId: number): Promise<AccountRecord[]> {
  await io();

  return db
    .prepare(
      `SELECT id, account, nationality, status, hours, jobs, bids, interview, work_in_progress, note
       FROM accounts
       WHERE user_id = ?
       ORDER BY sort_order, id`,
    )
    .all(userId)
    .map((row) => toAccount(row));
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

  const members = db
    .prepare(
      `SELECT id, name, nickname
       FROM users
       WHERE group_id = ? AND status = 'Approved' AND id != ?
       ORDER BY sort_order, id`,
    )
    .all(groupId, excludeUserId)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      nickname: String(row.nickname),
    }));

  const grouped = await listAccountsByUsers(members.map((member) => member.id));
  return members.map((member) => ({
    ...member,
    accounts: grouped.get(member.id) ?? [],
  }));
}

export async function listAllAccountsByGroup(): Promise<
  { id: number; name: string; members: MemberAccounts[] }[]
> {
  await io();

  const groups = db.prepare("SELECT id, name FROM groups ORDER BY sort_order, id").all();
  const members = db
    .prepare(
      `SELECT id, name, nickname, group_id
       FROM users
       WHERE status = 'Approved'
       ORDER BY group_id, sort_order, id`,
    )
    .all()
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      nickname: String(row.nickname),
      groupId: Number(row.group_id),
    }));

  const grouped = await listAccountsByUsers(members.map((member) => member.id));
  return groups.map((row) => {
    const id = Number(row.id);
    return {
      id,
      name: String(row.name),
      members: members
        .filter((member) => member.groupId === id)
        .map((member) => ({
          id: member.id,
          name: member.name,
          nickname: member.nickname,
          accounts: grouped.get(member.id) ?? [],
        })),
    };
  });
}

export async function listAccountsByUsers(userIds: number[]): Promise<Map<number, AccountRecord[]>> {
  await io();
  const grouped = new Map<number, AccountRecord[]>();
  if (userIds.length === 0) return grouped;

  const placeholders = userIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT user_id, id, account, nationality, status, hours, jobs, bids, interview, work_in_progress, note
       FROM accounts
       WHERE user_id IN (${placeholders})
       ORDER BY sort_order, id`,
    )
    .all(...userIds);

  for (const row of rows) {
    const ownerId = Number(row.user_id);
    const accounts = grouped.get(ownerId) ?? [];
    accounts.push(toAccount(row));
    grouped.set(ownerId, accounts);
  }

  return grouped;
}
