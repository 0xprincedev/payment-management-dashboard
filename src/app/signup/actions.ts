"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

export type SignupField =
  | "name"
  | "nickname"
  | "email"
  | "password"
  | "confirmPassword"
  | "groupId";

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<Record<SignupField, string>>;
  success?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hasErrors(
  fieldErrors: Partial<Record<SignupField, string>>,
): fieldErrors is Partial<Record<SignupField, string>> &
  Record<string, string> {
  return Object.keys(fieldErrors).length > 0;
}

export async function signup(
  _state: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = readText(formData, "name");
  const nickname = readText(formData, "nickname");
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const groupIdValue = readText(formData, "groupId");
  const groupId = Number(groupIdValue);

  const fieldErrors: Partial<Record<SignupField, string>> = {};

  if (!name) {
    fieldErrors.name = "Enter your name.";
  } else if (name.length > 80) {
    fieldErrors.name = "Name must be 80 characters or fewer.";
  }

  if (!nickname) {
    fieldErrors.nickname = "Enter a nickname.";
  } else if (nickname.length > 80) {
    fieldErrors.nickname = "Nickname must be 80 characters or fewer.";
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter a password.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  } else if (password.length > 128) {
    fieldErrors.password = "Password must be 128 characters or fewer.";
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (!Number.isInteger(groupId) || groupId <= 0) {
    fieldErrors.groupId = "Select a group.";
  }

  if (hasErrors(fieldErrors)) {
    return { fieldErrors };
  }

  db.exec("BEGIN IMMEDIATE");

  try {
    const taken = db
      .prepare(
        `SELECT email, name, nickname
         FROM users
         WHERE email = ? COLLATE NOCASE
            OR name = ? COLLATE NOCASE
            OR nickname = ? COLLATE NOCASE`,
      )
      .all(email, name, nickname);

    for (const row of taken) {
      if (String(row.email).toLowerCase() === email) {
        fieldErrors.email = "An account with this email already exists.";
      }
      if (String(row.name).toLowerCase() === name.toLowerCase()) {
        fieldErrors.name = "This name is already taken.";
      }
      if (String(row.nickname).toLowerCase() === nickname.toLowerCase()) {
        fieldErrors.nickname = "This nickname is already taken.";
      }
    }

    const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
    if (!group) {
      fieldErrors.groupId = "Select a group.";
    }

    if (hasErrors(fieldErrors)) {
      db.exec("ROLLBACK");
      return { fieldErrors };
    }

    db.prepare(
      `INSERT INTO users (email, password, name, nickname, group_id, role, status, sort_order)
       VALUES (?, ?, ?, ?, ?, 'Member', 'Pending', COALESCE((SELECT MAX(sort_order) + 1 FROM users WHERE group_id = ?), 0))`,
    ).run(email, hashPassword(password), name, nickname, groupId, groupId);

    db.exec("COMMIT");
    return { success: true };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("users.email")) {
      return {
        fieldErrors: { email: "An account with this email already exists." },
      };
    }
    if (message.includes("users.name")) {
      return { fieldErrors: { name: "This name is already taken." } };
    }
    if (message.includes("users.nickname")) {
      return {
        fieldErrors: { nickname: "This nickname is already taken." },
      };
    }

    console.error(error);
    return { error: "Could not create the account. Try again." };
  }
}
