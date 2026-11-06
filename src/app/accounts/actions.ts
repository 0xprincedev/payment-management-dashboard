"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/access";
import type { AccountRecord } from "@/lib/account-record";
import { accounts, nextId, type AccountDoc } from "@/lib/db";
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

function optionalCents(value: string, label: string): number | null | { error: string } {
  if (!value) return null;
  const normalized = value.replace(/[$,]/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return { error: `Enter ${label} as a number with up to 2 decimal places.` };
  }

  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.slice(negative ? 1 : 0).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  const signed = negative ? -cents : cents;
  if (!Number.isSafeInteger(signed) || Math.abs(signed) > 100_000_000) {
    return { error: `Enter ${label} as a number with up to 2 decimal places.` };
  }

  return signed;
}

function optionalDate(value: string): string | null | { error: string } {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { error: "Enter a valid created date." };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { error: "Enter a valid created date." };
  }
  return value;
}

function readFields(formData: FormData): AccountFields | { error: string } {
  const platform = readText(formData, "platform");
  const account = readText(formData, "account");
  const nationality = readText(formData, "nationality");
  const status = readText(formData, "status");
  const machine = readText(formData, "machine");
  const project = readText(formData, "project");
  const note = readText(formData, "note");

  if (!account) return { error: "Enter the account." };
  const accountError = textError(account, "Account", 120);
  if (accountError) return { error: accountError };
  const platformError = textError(platform, "Platform", 80);
  if (platformError) return { error: platformError };
  const nationalityError = textError(nationality, "Nationality", 80);
  if (nationalityError) return { error: nationalityError };
  const statusError = textError(status, "Status", 80);
  if (statusError) return { error: statusError };
  const machineError = textError(machine, "Machine", 80);
  if (machineError) return { error: machineError };
  const projectError = textError(project, "Project", 80);
  if (projectError) return { error: projectError };
  const noteError = textError(note, "Note", 500);
  if (noteError) return { error: noteError };

  const createdAt = optionalDate(readText(formData, "createdAt"));
  if (createdAt && typeof createdAt === "object") return createdAt;
  const availableCents = optionalCents(readText(formData, "available"), "Available");
  if (availableCents && typeof availableCents === "object") return availableCents;
  const pendingCents = optionalCents(readText(formData, "pending"), "Pending");
  if (pendingCents && typeof pendingCents === "object") return pendingCents;

  return {
    platform,
    account,
    nationality,
    status,
    createdAt,
    machine,
    project,
    availableCents,
    pendingCents,
    note,
  };
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

  const latest = await (await accounts()).find({ userId: user.id }).sort({ sortOrder: -1 }).limit(1).next();
  const id = await nextId("accounts");
  const document: AccountDoc = {
    _id: id,
    userId: user.id,
    sortOrder: (latest?.sortOrder ?? -1) + 1,
    platform: fields.platform,
    account: fields.account,
    nationality: fields.nationality,
    status: fields.status,
    createdAt: fields.createdAt,
    machine: fields.machine,
    project: fields.project,
    availableCents: fields.availableCents,
    pendingCents: fields.pendingCents,
    note: fields.note,
  };
  await (await accounts()).insertOne(document);

  return { account: { id, ...fields } };
}

export async function reorderAccounts(orderedIds: number[]): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user) return { error: "Admins can view accounts, not change them." };
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "The account order could not be saved." };
  }

  const existing = (await (await accounts()).find({ userId: user.id }, { projection: { _id: 1 } }).toArray()).map(
    (row) => row._id,
  );
  const unique = new Set(orderedIds);
  if (
    unique.size !== orderedIds.length ||
    unique.size !== existing.length ||
    existing.some((id) => !unique.has(id))
  ) {
    return { error: "The account order could not be saved." };
  }

  try {
    await (await accounts()).bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, userId: user.id },
          update: { $set: { sortOrder: index } },
        },
      })),
    );
  } catch {
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

  const result = await (await accounts()).updateOne(
    { _id: id, userId: user.id },
    {
      $set: {
        platform: fields.platform,
        account: fields.account,
        nationality: fields.nationality,
        status: fields.status,
        createdAt: fields.createdAt,
        machine: fields.machine,
        project: fields.project,
        availableCents: fields.availableCents,
        pendingCents: fields.pendingCents,
        note: fields.note,
      },
    },
  );

  if (result.matchedCount !== 1) return { error: "That account is not yours." };
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

  const result = await (await accounts()).deleteOne({ _id: id, userId: user.id });
  if (result.deletedCount !== 1) return { error: "That account is not yours." };
  return { deletedId: id };
}
