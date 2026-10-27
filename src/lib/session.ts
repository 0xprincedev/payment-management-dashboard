import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { db, type UserRole, type UserStatus } from "@/lib/db";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type CurrentUser = {
  id: number;
  name: string;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  groupId: number;
  groupName: string;
};

type SessionRow = {
  id: number;
  name: string;
  nickname: string;
  email: string;
  role: string;
  status: string;
  group_id: number;
  group_name: string;
  expires_at: number;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;

  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(hashToken(token), userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  await io();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT users.id, users.name, users.nickname, users.email, users.role, users.status,
              users.group_id, groups.name AS group_name, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       JOIN groups ON groups.id = users.group_id
       WHERE sessions.token_hash = ?`,
    )
    .get(hashToken(token)) as SessionRow | undefined;

  if (!row || Number(row.expires_at) <= Date.now()) return null;
  if (row.status !== "Approved") return null;

  return {
    id: Number(row.id),
    name: String(row.name),
    nickname: String(row.nickname),
    email: String(row.email),
    role: row.role as UserRole,
    status: row.status as UserStatus,
    groupId: Number(row.group_id),
    groupName: String(row.group_name),
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }

  cookieStore.delete(COOKIE_NAME);
}
