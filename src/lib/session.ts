import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { groups, sessions, users, type UserRole, type UserStatus } from "@/lib/db";

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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;

  await (await sessions()).insertOne({
    _id: hashToken(token),
    userId,
    expiresAt,
  });

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

  const session = await (await sessions()).findOne({ _id: hashToken(token) });
  if (!session || session.expiresAt <= Date.now()) return null;

  const user = await (await users()).findOne({ _id: session.userId });
  if (!user || user.status !== "Approved") return null;
  const group = await (await groups()).findOne({ _id: user.groupId });
  if (!group) return null;

  return {
    id: user._id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    status: user.status,
    groupId: user.groupId,
    groupName: group.name,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await (await sessions()).deleteOne({ _id: hashToken(token) });
  }

  cookieStore.delete(COOKIE_NAME);
}
