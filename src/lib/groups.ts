import "server-only";
import { io } from "next/cache";
import { db, type Group } from "@/lib/db";

export async function listGroups(): Promise<Group[]> {
  await io();

  return db
    .prepare("SELECT id, name FROM groups ORDER BY id")
    .all()
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
    }));
}
