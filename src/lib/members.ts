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
