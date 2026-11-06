import "server-only";
import { io } from "next/cache";
import { groups, users, type UserRole, type UserStatus } from "@/lib/db";

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

  const [groupDocs, userDocs] = await Promise.all([
    groups().then((collection) => collection.find().sort({ sortOrder: 1, _id: 1 }).toArray()),
    users().then((collection) => collection.find().toArray()),
  ]);
  const orderedUsers = [...userDocs].sort(
    (left, right) => left.groupId - right.groupId || left.sortOrder - right.sortOrder || left._id - right._id,
  );
  const byGroup = new Map<number, GroupProfile[]>();
  for (const user of orderedUsers) {
    const members = byGroup.get(user.groupId) ?? [];
    members.push({
      id: user._id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    byGroup.set(user.groupId, members);
  }

  return groupDocs.map((group) => ({
    id: group._id,
    name: group.name,
    members: byGroup.get(group._id) ?? [],
  }));
}

export async function listGroupProfiles(groupId: number): Promise<GroupProfile[]> {
  await io();

  const rows = (await (await users()).find({ groupId }).toArray()).sort(
    (left, right) => left.sortOrder - right.sortOrder || left._id - right._id,
  );
  return rows.map((user) => ({
    id: user._id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    status: user.status,
  }));
}
