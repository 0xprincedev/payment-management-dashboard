import "server-only";
import { io } from "next/cache";
import { db } from "@/lib/db";

export type ManagedGroup = {
  id: number;
  name: string;
  memberCount: number;
  widgetCount: number;
};

export async function listManagedGroups(): Promise<ManagedGroup[]> {
  await io();

  return db
    .prepare(
      `SELECT groups.id, groups.name,
              (SELECT COUNT(*) FROM users WHERE users.group_id = groups.id) AS member_count,
              (SELECT COUNT(*) FROM payment_widgets WHERE payment_widgets.group_id = groups.id) AS widget_count
       FROM groups
       ORDER BY groups.sort_order, groups.id`,
    )
    .all()
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      memberCount: Number(row.member_count),
      widgetCount: Number(row.widget_count),
    }));
}
