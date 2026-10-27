"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/access";
import type { AccountRecord } from "@/lib/account-record";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type AccountActionState = {
  error?: string;
  account?: AccountRecord;
  deletedId?: number;
};

type AccountFields = Omit<AccountRecord, "id">;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (isAdmin(user.role)) return null;
  return user;
}

function textError(value: string, label: string, max: number) {
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

function optionalText(value: string, label: string, max: number): string | null | { error: string } {
  if (!value) return null;
  const error = textError(value, label, max);
  if (error) return { error };
  return value;
}

function readFields(formData: FormData): AccountFields | { error: string } {
  const account = readText(formData, "account");
  const nationality = readText(formData, "nationality");
  const status = readText(formData, "status");
  const note = readText(formData, "note");

  if (!account) return { error: "Enter the account." };
  const accountError = textError(account, "Account", 120);
  if (accountError) return { error: accountError };
  const nationalityError = textError(nationality, "Nationality", 80);
  if (nationalityError) return { error: nationalityError };
  const statusError = textError(status, "Status", 80);
  if (statusError) return { error: statusError };
  const noteError = textError(note, "Note", 500);
  if (noteError) return { error: noteError };

  const hours = optionalText(readText(formData, "hours"), "Hours", 80);
  if (hours && typeof hours === "object") return hours;
  const jobs = optionalText(readText(formData, "jobs"), "Jobs", 80);
  if (jobs && typeof jobs === "object") return jobs;
  const bids = optionalText(readText(formData, "bids"), "Bids", 80);
  if (bids && typeof bids === "object") return bids;
  const interview = optionalText(readText(formData, "interview"), "Interview", 80);
  if (interview && typeof interview === "object") return interview;
  const workInProgress = optionalText(readText(formData, "workInProgress"), "Work in progress", 80);
  if (workInProgress && typeof workInProgress === "object") return workInProgress;

  return { account, nationality, status, hours, jobs, bids, interview, workInProgress, note };
}

function accountId(formData: FormData) {
  const id = Number(readText(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function createAccount(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user) return { error: "Admins can view accounts, not change them." };
  const fields = readFields(formData);
  if ("error" in fields) return { error: fields.error };

  const result = db
    .prepare(
      `INSERT INTO accounts (
         user_id, sort_order, account, nationality, status, hours, jobs, bids, interview, work_in_progress, note
       ) VALUES (
         ?,
         COALESCE((SELECT MAX(sort_order) + 1 FROM accounts WHERE user_id = ?), 0),
         ?, ?, ?, ?, ?, ?, ?, ?, ?
       )`,
    )
    .run(
      user.id,
      user.id,
      fields.account,
      fields.nationality,
      fields.status,
      fields.hours,
      fields.jobs,
      fields.bids,
      fields.interview,
      fields.workInProgress,
      fields.note,
    );

  return { account: { id: Number(result.lastInsertRowid), ...fields } };
}

export async function reorderAccounts(orderedIds: number[]): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user) return { error: "Admins can view accounts, not change them." };
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The account order could not be saved." };
  }

  const existing = db
    .prepare("SELECT id FROM accounts WHERE user_id = ?")
    .all(user.id)
    .map((row) => Number(row.id));
  const unique = new Set(orderedIds);
  if (
    unique.size !== orderedIds.length ||
    unique.size !== existing.length ||
    existing.some((id) => !unique.has(id))
  ) {
    return { error: "The account order could not be saved." };
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const update = db.prepare("UPDATE accounts SET sort_order = ? WHERE id = ? AND user_id = ?");
    orderedIds.forEach((id, index) => update.run(index, id, user.id));
    db.exec("COMMIT");
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    return { error: "The account order could not be saved." };
  }

  return {};
}

export async function updateAccount(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user) return { error: "Admins can view accounts, not change them." };
  const id = accountId(formData);
  if (!id) return { error: "That account is not yours." };
  const fields = readFields(formData);
  if ("error" in fields) return { error: fields.error };

  const result = db
    .prepare(
      `UPDATE accounts
       SET account = ?, nationality = ?, status = ?, hours = ?, jobs = ?, bids = ?,
           interview = ?, work_in_progress = ?, note = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      fields.account,
      fields.nationality,
      fields.status,
      fields.hours,
      fields.jobs,
      fields.bids,
      fields.interview,
      fields.workInProgress,
      fields.note,
      id,
      user.id,
    );

  if (result.changes !== 1) return { error: "That account is not yours." };
  return { account: { id, ...fields } };
}

export async function deleteAccount(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user) return { error: "Admins can view accounts, not change them." };
  const id = accountId(formData);
  if (!id) return { error: "That account is not yours." };

  const result = db.prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?").run(id, user.id);
  if (result.changes !== 1) return { error: "That account is not yours." };
  return { deletedId: id };
}
