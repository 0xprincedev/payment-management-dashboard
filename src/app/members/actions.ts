"use server";

import { redirect } from "next/navigation";
import { db, userStatuses, type UserStatus } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

export type MemberActionState = {
  error?: string;
  message?: string;
  email?: string;
  status?: "Approved" | "Pending" | "Rejected";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireBoss(): Promise<{ user: CurrentUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "Boss") return { error: "Only a group boss can update members." };
  return { user };
}

function memberInGroup(memberId: number, groupId: number) {
  return db.prepare("SELECT id FROM users WHERE id = ? AND group_id = ?").get(memberId, groupId);
}

export async function reorderGroupMembers(orderedIds: number[]): Promise<MemberActionState> {
  const boss = await requireBoss();
  if ("error" in boss) return { error: boss.error };
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The member order could not be saved." };
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE group_id = ?")
    .all(boss.user.groupId)
    .map((row) => Number(row.id));
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== existing.length || existing.some((id) => !unique.has(id))) {
    return { error: "The member order could not be saved." };
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const assign = db.prepare("UPDATE users SET sort_order = ? WHERE id = ? AND group_id = ?");
    orderedIds.forEach((id, index) => assign.run(index, id, boss.user.groupId));
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "The member order could not be saved." };
  }

  return {};
}

export async function updateMemberStatus(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const boss = await requireBoss();
  if ("error" in boss) return { error: boss.error };

  const memberId = Number(readText(formData, "userId"));
  const status = readText(formData, "status");
  if (!userStatuses.includes(status as UserStatus)) return { error: "Select a status." };
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return { error: "That member could not be found." };
  }
  if (memberId === boss.user.id) return { error: "You can't change your own status." };
  if (!memberInGroup(memberId, boss.user.groupId)) {
    return { error: "That member is not in your group." };
  }

  db.prepare("UPDATE users SET status = ? WHERE id = ? AND group_id = ?").run(
    status,
    memberId,
    boss.user.groupId,
  );

  if (status !== "Approved") {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(memberId);
  }

  return { message: `Status updated to ${status}.`, status: status as UserStatus };
}

export async function updateMemberEmail(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const boss = await requireBoss();
  if ("error" in boss) return { error: boss.error };

  const memberId = Number(readText(formData, "userId"));
  const email = readText(formData, "email").toLowerCase();
  if (!Number.isInteger(memberId) || memberId <= 0 || !memberInGroup(memberId, boss.user.groupId)) {
    return { error: "That member is not in your group." };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const taken = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?")
    .get(email, memberId);
  if (taken) return { error: "An account with this email already exists." };

  db.prepare("UPDATE users SET email = ? WHERE id = ? AND group_id = ?").run(
    email,
    memberId,
    boss.user.groupId,
  );

  return { message: "Email updated.", email };
}

export async function updateMemberPassword(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const boss = await requireBoss();
  if ("error" in boss) return { error: boss.error };

  const memberId = Number(readText(formData, "userId"));
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  if (!Number.isInteger(memberId) || memberId <= 0 || !memberInGroup(memberId, boss.user.groupId)) {
    return { error: "That member is not in your group." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password must be 128 characters or fewer." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  db.prepare("UPDATE users SET password = ? WHERE id = ? AND group_id = ?").run(
    hashPassword(password),
    memberId,
    boss.user.groupId,
  );

  return { message: "Password updated." };
}

export async function deleteMemberAccount(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const boss = await requireBoss();
  if ("error" in boss) return { error: boss.error };

  const memberId = Number(readText(formData, "userId"));
  if (!Number.isInteger(memberId) || memberId <= 0 || !memberInGroup(memberId, boss.user.groupId)) {
    return { error: "That member is not in your group." };
  }
  if (memberId === boss.user.id) return { error: "You can't delete your own account." };

  const used = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM payments WHERE user_id = ? OR member_id = ?) AS payments,
         (SELECT COUNT(*) FROM payment_widgets WHERE created_by = ?) AS widgets`,
    )
    .get(memberId, memberId, memberId) as { payments: number; widgets: number };

  if (Number(used.payments) > 0 || Number(used.widgets) > 0) {
    return { error: "This account is used by payments, so it can't be deleted." };
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM accounts WHERE user_id = ?").run(memberId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(memberId);
    db.prepare("DELETE FROM users WHERE id = ? AND group_id = ?").run(memberId, boss.user.groupId);
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "That account could not be deleted." };
  }

  return { message: "Account deleted." };
}
