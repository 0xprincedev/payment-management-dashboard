import "server-only";
import { io } from "next/cache";
import { db, type UserRole, type UserStatus } from "@/lib/db";

export type GroupProfile = {
  id: number;
  name: string;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export async function listGroupsWithProfiles(): Promise<{ id: number; name: string; members: GroupProfile[] }[]> {
  await io();

  const groups = db.prepare("SELECT id, name FROM groups ORDER BY sort_order, id").all();
  const users = db
    .prepare(
      `SELECT id, name, nickname, email, role, status, group_id
       FROM users
       ORDER BY group_id, sort_order, id`,
    )
    .all();
  const byGroup = new Map<number, GroupProfile[]>();
  for (const row of users) {
    const groupId = Number(row.group_id);
    const members = byGroup.get(groupId) ?? [];
    members.push({
      id: Number(row.id),
      name: String(row.name),
      nickname: String(row.nickname),
      email: String(row.email),
      role: row.role as UserRole,
      status: row.status as UserStatus,
    });
    byGroup.set(groupId, members);
  }

  return groups.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    members: byGroup.get(Number(row.id)) ?? [],
  }));
}

export async function listGroupProfiles(groupId: number): Promise<GroupProfile[]> {
  await io();

  return db
    .prepare(
      `SELECT id, name, nickname, email, role, status
       FROM users
       WHERE group_id = ?
       ORDER BY sort_order, id`,
    )
    .all(groupId)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      nickname: String(row.nickname),
      email: String(row.email),
      role: row.role as UserRole,
      status: row.status as UserStatus,
    }));
}
