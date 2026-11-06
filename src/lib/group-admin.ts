import "server-only";
import { io } from "next/cache";
import { groups, users, widgets } from "@/lib/db";

export type ManagedGroup = {
  id: number;
  name: string;
  memberCount: number;
  widgetCount: number;
};

export async function listManagedGroups(): Promise<ManagedGroup[]> {
  await io();

  const [groupDocs, userDocs, widgetDocs] = await Promise.all([
    groups().then((collection) => collection.find().sort({ sortOrder: 1, _id: 1 }).toArray()),
    users().then((collection) => collection.find({}, { projection: { groupId: 1 } }).toArray()),
    widgets().then((collection) => collection.find({}, { projection: { groupId: 1 } }).toArray()),
  ]);
  const members = new Map<number, number>();
  const widgetCounts = new Map<number, number>();
  for (const user of userDocs) members.set(user.groupId, (members.get(user.groupId) ?? 0) + 1);
  for (const widget of widgetDocs) widgetCounts.set(widget.groupId, (widgetCounts.get(widget.groupId) ?? 0) + 1);

  return groupDocs.map((group) => ({
    id: group._id,
    name: group.name,
    memberCount: members.get(group._id) ?? 0,
    widgetCount: widgetCounts.get(group._id) ?? 0,
  }));
}
