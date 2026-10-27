"use server";

import { redirect } from "next/navigation";
import { isAdmin, isAdminGroupName } from "@/lib/access";
import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

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

function nameTaken(name: string, exceptId?: number) {
  const row = exceptId
    ? db.prepare("SELECT id FROM groups WHERE name = ? COLLATE NOCASE AND id != ?").get(name, exceptId)
    : db.prepare("SELECT id FROM groups WHERE name = ? COLLATE NOCASE").get(name);
  return Boolean(row);
}

function syncGroupRoles(groupId: number, previousName: string, nextName: string) {
  const wasAdmin = isAdminGroupName(previousName);
  const nowAdmin = isAdminGroupName(nextName);
  if (!wasAdmin && nowAdmin) {
    db.prepare("UPDATE users SET role = 'Admin' WHERE group_id = ?").run(groupId);
    return "Group name updated. Everyone in this group is now an admin.";
  }
  if (wasAdmin && !nowAdmin) {
    db.prepare("UPDATE users SET role = 'Member' WHERE group_id = ? AND role = 'Admin'").run(groupId);
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
  if (nameTaken(name)) return { error: "A group with this name already exists." };

  const inserted = db
    .prepare(
      `INSERT INTO groups (name, sort_order)
       VALUES (?, COALESCE((SELECT MAX(sort_order) + 1 FROM groups), 0))`,
    )
    .run(name);

  return {
    message: "Group created.",
    group: {
      id: Number(inserted.lastInsertRowid),
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

  const current = db.prepare("SELECT id, name FROM groups WHERE id = ?").get(groupId) as
    | { id: number; name: string }
    | undefined;
  if (!current) return { error: "That group could not be found." };
  if (nameTaken(name, groupId)) return { error: "A group with this name already exists." };

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, groupId);
    const message = syncGroupRoles(groupId, String(current.name), name);
    db.exec("COMMIT");
    return { message, name };
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
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

  db.exec("BEGIN IMMEDIATE");
  try {
    const current = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
    if (!current) {
      db.exec("ROLLBACK");
      return { error: "That group could not be found." };
    }

    const used = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE group_id = ?) AS members,
           (SELECT COUNT(*) FROM payment_widgets WHERE group_id = ?) AS widgets`,
      )
      .get(groupId, groupId) as { members: number; widgets: number };

    if (Number(used.members) > 0 || Number(used.widgets) > 0) {
      db.exec("ROLLBACK");
      return { error: "This group still has members or payment widgets, so it can't be deleted." };
    }

    db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "That group could not be deleted." };
  }

  return { message: "Group deleted." };
}

export async function reorderGroups(orderedIds: number[]): Promise<GroupActionState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The group order could not be saved." };
  }

  const existing = db
    .prepare("SELECT id FROM groups")
    .all()
    .map((row) => Number(row.id));
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== existing.length || existing.some((id) => !unique.has(id))) {
    return { error: "The group order could not be saved." };
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const assign = db.prepare("UPDATE groups SET sort_order = ? WHERE id = ?");
    orderedIds.forEach((id, index) => assign.run(index, id));
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "The group order could not be saved." };
  }

  return {};
}
