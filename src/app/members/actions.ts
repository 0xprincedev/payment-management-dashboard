"use server";

import { redirect } from "next/navigation";
import { isAdmin, isAdminGroupName, isBoss } from "@/lib/access";
import {
  accounts,
  caseInsensitive,
  groups,
  payments,
  sessions,
  userStatuses,
  users,
  widgets,
  withTransaction,
  type UserRole,
  type UserStatus,
} from "@/lib/db";
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

async function managedMember(
  actor: CurrentUser,
  memberId: number,
): Promise<{ id: number; groupId: number; role: UserRole } | { error: string }> {
  if (!Number.isInteger(memberId) || memberId <= 0) return { error: "That member could not be found." };

  const member = await (await users()).findOne({ _id: memberId });
  if (!member) return { error: "That member could not be found." };
  if (actor.role !== "Admin" && member.groupId !== actor.groupId) {
    return { error: "That member is not in your group." };
  }
  if (actor.role !== "Admin" && member.role === "Admin") {
    return { error: "You can't change an admin." };
  }
  if (member.role !== "Admin" && member.role !== "Boss" && member.role !== "Member") {
    return { error: "That member could not be found." };
  }

  return { id: member._id, groupId: member.groupId, role: member.role };
}

export async function reorderGroupMembers(orderedIds: number[]): Promise<MemberActionState> {
  const manager = await requireManager();
  if ("error" in manager) return { error: manager.error };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The member order could not be saved." };
  }

  const placed = await (await users()).find({ _id: { $in: orderedIds } }, { projection: { groupId: 1 } }).toArray();
  const groupIds = new Set(placed.map((row) => row.groupId));
  if (placed.length !== orderedIds.length || groupIds.size !== 1) {
    return { error: "The member order could not be saved." };
  }

  const groupId = [...groupIds][0];
  if (manager.user.role !== "Admin" && groupId !== manager.user.groupId) {
    return { error: "The member order could not be saved." };
  }

  const existing = (await (await users()).find({ groupId }, { projection: { _id: 1 } }).toArray()).map((row) => row._id);
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== existing.length || existing.some((id) => !unique.has(id))) {
    return { error: "The member order could not be saved." };
  }

  try {
    await (await users()).bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, groupId },
          update: { $set: { sortOrder: index } },
        },
      })),
    );
  } catch {
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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.id === manager.user.id) return { error: "You can't change your own status." };

  await (await users()).updateOne(
    { _id: member.id, groupId: member.groupId },
    { $set: { status: status as UserStatus } },
  );

  if (status !== "Approved") {
    await (await sessions()).deleteMany({ userId: memberId });
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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "That group could not be found." };

  const group = await (await groups()).findOne({ _id: groupId });
  if (!group) return { error: "That group could not be found." };
  if (group._id === member.groupId) return { groupId: member.groupId, role: member.role };

  const joiningAdmin = isAdminGroupName(group.name);
  if (member.role === "Admin" && !joiningAdmin) {
    const admins = await (await users()).countDocuments({ role: "Admin" });
    if (admins <= 1) {
      return { error: "The last admin has to stay in the admin group." };
    }
  }

  const role: UserRole = joiningAdmin ? "Admin" : member.role === "Admin" ? "Member" : member.role;
  const latest = await (await users()).find({ groupId }).sort({ sortOrder: -1 }).limit(1).next();
  const updated = await (await users()).updateOne(
    { _id: member.id, groupId: member.groupId },
    { $set: { groupId, role, sortOrder: (latest?.sortOrder ?? -1) + 1 } },
  );
  if (updated.matchedCount !== 1) return { error: "That member's group could not be changed." };

  const message = joiningAdmin && member.role !== "Admin"
    ? `Moved to ${group.name}. This member is now an admin.`
    : member.role === "Admin" && role !== "Admin"
      ? `Moved to ${group.name}. This member is now a member.`
      : `Moved to ${group.name}.`;

  return { message, groupId: group._id, role };
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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.role === role) return { role };

  const group = await (await groups()).findOne({ _id: member.groupId });
  if (!group || member.role === "Admin" || isAdminGroupName(group.name)) {
    return { error: "Move this member out of the admin group before changing their role." };
  }

  const updated = await (await users()).updateOne(
    { _id: member.id, groupId: member.groupId, role: { $ne: "Admin" } },
    { $set: { role } },
  );
  if (updated.matchedCount !== 1) return { error: "That member's role could not be changed." };

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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const taken = await (await users()).findOne(
    { email, _id: { $ne: memberId } },
    { collation: caseInsensitive },
  );
  if (taken) return { error: "An account with this email already exists." };

  await (await users()).updateOne({ _id: member.id, groupId: member.groupId }, { $set: { email } });

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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password must be 128 characters or fewer." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  await (await users()).updateOne(
    { _id: member.id, groupId: member.groupId },
    { $set: { password: hashPassword(password) } },
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
  const member = await managedMember(manager.user, memberId);
  if ("error" in member) return { error: member.error };
  if (member.id === manager.user.id) return { error: "You can't delete your own account." };

  const [paymentCount, widgetCount] = await Promise.all([
    payments().then((collection) => collection.countDocuments({ $or: [{ userId: memberId }, { memberId }] })),
    widgets().then((collection) => collection.countDocuments({ createdBy: memberId })),
  ]);

  if (paymentCount > 0 || widgetCount > 0) {
    return { error: "This account is used by payments, so it can't be deleted." };
  }

  try {
    await withTransaction(async (session) => {
      await (await accounts()).deleteMany({ userId: memberId }, { session });
      await (await sessions()).deleteMany({ userId: memberId }, { session });
      const deleted = await (await users()).deleteOne({ _id: member.id, groupId: member.groupId }, { session });
      if (deleted.deletedCount !== 1) throw new Error("The account could not be deleted.");
    });
  } catch {
    return { error: "That account could not be deleted." };
  }

  return { message: "Account deleted." };
}
