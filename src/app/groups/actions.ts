"use server";

import { redirect } from "next/navigation";
import { isAdmin, isAdminGroupName } from "@/lib/access";
import { caseInsensitive, groups, nextId, users, widgets, withTransaction } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import type { ClientSession } from "mongodb";

export type GroupRecord = {
  id: number;
  name: string;
  memberCount: number;
  widgetCount: number;
};

export type GroupActionState = {
  error?: string;
  message?: string;
  name?: string;
  group?: GroupRecord;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin(): Promise<{ user: CurrentUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!isAdmin(user.role)) return { error: "Only an admin can manage groups." };
  return { user };
}

function groupNameError(name: string) {
  if (!name) return "Enter a group name.";
  if (name.length > 80) return "Group name must be 80 characters or fewer.";
  return null;
}

async function nameTaken(name: string, exceptId?: number) {
  const row = await (await groups()).findOne(
    { name, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
    { collation: caseInsensitive },
  );
  return Boolean(row);
}

async function syncGroupRoles(
  groupId: number,
  previousName: string,
  nextName: string,
  session: ClientSession,
) {
  const wasAdmin = isAdminGroupName(previousName);
  const nowAdmin = isAdminGroupName(nextName);
  if (!wasAdmin && nowAdmin) {
    await (await users()).updateMany({ groupId }, { $set: { role: "Admin" } }, { session });
    return "Group name updated. Everyone in this group is now an admin.";
  }
  if (wasAdmin && !nowAdmin) {
    await (await users()).updateMany({ groupId, role: "Admin" }, { $set: { role: "Member" } }, { session });
    return "Group name updated. Admins in this group are now members.";
  }
  return "Group name updated.";
}

export async function createGroup(
  _state: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const name = readText(formData, "name");
  const invalid = groupNameError(name);
  if (invalid) return { error: invalid };
  if (await nameTaken(name)) return { error: "A group with this name already exists." };

  const latest = await (await groups()).find().sort({ sortOrder: -1 }).limit(1).next();
  const id = await nextId("groups");
  await (await groups()).insertOne({
    _id: id,
    name,
    sortOrder: (latest?.sortOrder ?? -1) + 1,
  });

  return {
    message: "Group created.",
    group: {
      id,
      name,
      memberCount: 0,
      widgetCount: 0,
    },
  };
}

export async function renameGroup(
  _state: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const groupId = Number(readText(formData, "groupId"));
  const name = readText(formData, "name");
  const invalid = groupNameError(name);
  if (invalid) return { error: invalid };
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "That group could not be found." };

  const current = await (await groups()).findOne({ _id: groupId });
  if (!current) return { error: "That group could not be found." };
  if (await nameTaken(name, groupId)) return { error: "A group with this name already exists." };

  try {
    const message = await withTransaction(async (session) => {
      await (await groups()).updateOne({ _id: groupId }, { $set: { name } }, { session });
      return syncGroupRoles(groupId, current.name, name, session);
    });
    return { message, name };
  } catch {
    return { error: "That group name could not be saved." };
  }
}

export async function deleteGroup(
  _state: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const groupId = Number(readText(formData, "groupId"));
  if (!Number.isInteger(groupId) || groupId <= 0) return { error: "That group could not be found." };

  const current = await (await groups()).findOne({ _id: groupId });
  if (!current) return { error: "That group could not be found." };

  const [members, widgetCount] = await Promise.all([
    users().then((collection) => collection.countDocuments({ groupId })),
    widgets().then((collection) => collection.countDocuments({ groupId })),
  ]);
  if (members > 0 || widgetCount > 0) {
    return { error: "This group still has members or payment widgets, so it can't be deleted." };
  }

  const deleted = await (await groups()).deleteOne({ _id: groupId });
  if (deleted.deletedCount !== 1) return { error: "That group could not be deleted." };

  return { message: "Group deleted." };
}

export async function reorderGroups(orderedIds: number[]): Promise<GroupActionState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The group order could not be saved." };
  }

  const existing = (await (await groups()).find({}, { projection: { _id: 1 } }).toArray()).map((row) => row._id);
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== existing.length || existing.some((id) => !unique.has(id))) {
    return { error: "The group order could not be saved." };
  }

  try {
    await (await groups()).bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      })),
    );
  } catch {
    return { error: "The group order could not be saved." };
  }

  return {};
}
