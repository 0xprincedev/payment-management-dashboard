"use server";

import { isAdminGroupName } from "@/lib/access";
import { caseInsensitive, groups, nextId, users } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { MongoServerError } from "mongodb";

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

  try {
    const taken = await (await users())
      .find({ $or: [{ email }, { name }, { nickname }] }, { collation: caseInsensitive })
      .toArray();

    for (const row of taken) {
      if (row.email.toLowerCase() === email) {
        fieldErrors.email = "An account with this email already exists.";
      }
      if (row.name.toLowerCase() === name.toLowerCase()) {
        fieldErrors.name = "This name is already taken.";
      }
      if (row.nickname.toLowerCase() === nickname.toLowerCase()) {
        fieldErrors.nickname = "This nickname is already taken.";
      }
    }

    const group = await (await groups()).findOne({ _id: groupId });
    if (!group) {
      fieldErrors.groupId = "Select a group.";
    }

    if (hasErrors(fieldErrors) || !group) {
      return { fieldErrors };
    }

    const role = isAdminGroupName(group.name) ? "Admin" : "Member";
    const latest = await (await users()).find({ groupId }).sort({ sortOrder: -1 }).limit(1).next();
    await (await users()).insertOne({
      _id: await nextId("users"),
      email,
      password: hashPassword(password),
      name,
      nickname,
      groupId,
      role,
      status: "Pending",
      sortOrder: (latest?.sortOrder ?? -1) + 1,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0];
      if (field === "email") {
        return { fieldErrors: { email: "An account with this email already exists." } };
      }
      if (field === "name") return { fieldErrors: { name: "This name is already taken." } };
      if (field === "nickname") {
        return { fieldErrors: { nickname: "This nickname is already taken." } };
      }
    }

    console.error(error);
    return { error: "Could not create the account. Try again." };
  }
}
