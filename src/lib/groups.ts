import "server-only";
import { io } from "next/cache";
import { groups, type Group } from "@/lib/db";

export async function listGroups(): Promise<Group[]> {
  await io();

  const rows = await (await groups()).find().sort({ sortOrder: 1, _id: 1 }).toArray();
  return rows.map((row) => ({
    id: row._id,
    name: row.name,
  }));
}
