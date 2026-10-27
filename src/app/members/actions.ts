"use server";

import { redirect } from "next/navigation";
import { isAdmin, isAdminGroupName, isBoss } from "@/lib/access";
import { db, userStatuses, type UserRole, type UserStatus } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

export type MemberActionState = {
  error?: string;
  message?: string;
  email?: string;
  status?: "Approved" | "Pending" | "Rejected";
  groupId?: number;
  role?: UserRole;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireManager(): Promise<{ user: CurrentUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!isBoss(user.role) && !isAdmin(user.role)) return { error: "Only a boss or an admin can update members." };
  return { user };
}

function managedMember(
  actor: CurrentUser,
  memberId: number,
): { id: number; groupId: number; role: UserRole } | { error: string } {
  if (!Number.isInteger(memberId) || memberId <= 0) return { error: "That member could not be found." };

  const member = db.prepare("SELECT id, group_id, role FROM users WHERE id = ?").get(memberId) as
    | { id: number; group_id: number; role: string }
    | undefined;
  if (!member) return { error: "That member could not be found." };
  if (actor.role !== "Admin" && Number(member.group_id) !== actor.groupId) {
    return { error: "That member is not in your group." };
  }
  if (actor.role !== "Admin" && member.role === "Admin") {
    return { error: "You can't change an admin." };
  }
  if (member.role !== "Admin" && member.role !== "Boss" && member.role !== "Member") {
    return { error: "That member could not be found." };
  }

  return { id: Number(member.id), groupId: Number(member.group_id), role: member.role };
}

export async function reorderGroupMembers(orderedIds: number[]): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The member order could not be saved." };
  }

  const placed = db
    .prepare(`SELECT id, group_id FROM users WHERE id IN (${orderedIds.map(() => "?").join(", ")})`)
    .all(...orderedIds) as { id: number; group_id: number }[];
  const groupIds = new Set(placed.map((row) => Number(row.group_id)));
  if (placed.length !== orderedIds.length || groupIds.size !== 1) {
    return { error: "The member order could not be saved." };
  }

  const groupId = [...groupIds][0];
  if (manager.user.role !== "Admin" && groupId !== manager.user.groupId) {
    return { error: "The member order could not be saved." };
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE group_id = ?")
    .all(groupId)
    .map((row) => Number(row.id));
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== existing.length || existing.some((id) => !unique.has(id))) {
    return { error: "The member order could not be saved." };
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const assign = db.prepare("UPDATE users SET sort_order = ? WHERE id = ? AND group_id = ?");
    orderedIds.forEach((id, index) => assign.run(index, id, groupId));
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
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };

  const memberId = Number(readText(formData, "userId"));
  const status = readText(formData, "status");
  if (!userStatuses.includes(status as UserStatus)) return { error: "Select a status." };
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.id === manager.user.id) return { error: "You can't change your own status." };

  db.prepare("UPDATE users SET status = ? WHERE id = ? AND group_id = ?").run(
    status,
    member.id,
    member.groupId,
  );

  if (status !== "Approved") {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(memberId);
  }

  return { message: `Status updated to ${status}.`, status: status as UserStatus };
}

export async function updateMemberGroup(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };
  if (!isAdmin(manager.user.role)) return { error: "Only an admin can change a member's group." };

  const memberId = Number(readText(formData, "userId"));
  const groupId = Number(readText(formData, "groupId"));
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "That group could not be found." };

  const group = db.prepare("SELECT id, name FROM groups WHERE id = ?").get(groupId) as
    | { id: number; name: string }
    | undefined;
  if (!group) return { error: "That group could not be found." };
  if (Number(group.id) === member.groupId) return { groupId: member.groupId, role: member.role };

  const targetName = String(group.name);
  const joiningAdmin = isAdminGroupName(targetName);
  if (member.role === "Admin" && !joiningAdmin) {
    const admins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin'").get() as { count: number };
    if (Number(admins.count) <= 1) {
      return { error: "The last admin has to stay in the admin group." };
    }
  }

  const role: UserRole = joiningAdmin ? "Admin" : member.role === "Admin" ? "Member" : member.role;
  db.exec("BEGIN IMMEDIATE");
  try {
    const next = db
      .prepare("SELECT COALESCE(MAX(sort_order) + 1, 0) AS sort_order FROM users WHERE group_id = ?")
      .get(groupId) as { sort_order: number };
    const updated = db
      .prepare("UPDATE users SET group_id = ?, role = ?, sort_order = ? WHERE id = ? AND group_id = ?")
      .run(groupId, role, Number(next.sort_order), member.id, member.groupId);
    if (Number(updated.changes) !== 1) throw new Error("The member group could not be saved.");
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "That member's group could not be changed." };
  }

  const message = joiningAdmin && member.role !== "Admin"
    ? `Moved to ${targetName}. This member is now an admin.`
    : member.role === "Admin" && role !== "Admin"
      ? `Moved to ${targetName}. This member is now a member.`
      : `Moved to ${targetName}.`;

  return { message, groupId: Number(group.id), role };
}

export async function updateMemberRole(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };
  if (!isAdmin(manager.user.role)) return { error: "Only an admin can change a member's role." };

  const memberId = Number(readText(formData, "userId"));
  const role = readText(formData, "role");
  if (role !== "Boss" && role !== "Member") return { error: "Select Boss or Member." };
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.role === role) return { role };

  const group = db.prepare("SELECT name FROM groups WHERE id = ?").get(member.groupId) as
    | { name: string }
    | undefined;
  if (!group || member.role === "Admin" || isAdminGroupName(String(group.name))) {
    return { error: "Move this member out of the admin group before changing their role." };
  }

  const updated = db
    .prepare("UPDATE users SET role = ? WHERE id = ? AND group_id = ? AND role != 'Admin'")
    .run(role, member.id, member.groupId);
  if (Number(updated.changes) !== 1) return { error: "That member's role could not be changed." };

  return { message: `Role updated to ${role}.`, role };
}

export async function updateMemberEmail(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };

  const memberId = Number(readText(formData, "userId"));
  const email = readText(formData, "email").toLowerCase();
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const taken = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?")
    .get(email, memberId);
  if (taken) return { error: "An account with this email already exists." };

  db.prepare("UPDATE users SET email = ? WHERE id = ? AND group_id = ?").run(
    email,
    member.id,
    member.groupId,
  );

  return { message: "Email updated.", email };
}

export async function updateMemberPassword(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };

  const memberId = Number(readText(formData, "userId"));
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password must be 128 characters or fewer." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  db.prepare("UPDATE users SET password = ? WHERE id = ? AND group_id = ?").run(
    hashPassword(password),
    member.id,
    member.groupId,
  );

  return { message: "Password updated." };
}

export async function deleteMemberAccount(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };

  const memberId = Number(readText(formData, "userId"));
  const member = managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.id === manager.user.id) return { error: "You can't delete your own account." };

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
    db.prepare("DELETE FROM users WHERE id = ? AND group_id = ?").run(member.id, member.groupId);
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
