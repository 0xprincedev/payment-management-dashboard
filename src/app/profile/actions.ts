"use server";

import { redirect } from "next/navigation";
import { caseInsensitive, users } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { getCurrentUser } from "@/lib/session";

export type ProfileActionState = {
  error?: string;
  message?: string;
  name?: string;
  nickname?: string;
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateOwnProfile(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const name = readText(formData, "name");
  const nickname = readText(formData, "nickname");
  const email = readText(formData, "email").toLowerCase();

  if (!name) return { error: "Enter your name." };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer." };
  if (!nickname) return { error: "Enter a nickname." };
  if (nickname.length > 80) return { error: "Nickname must be 80 characters or fewer." };
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const taken = await (await users())
    .find(
      {
        _id: { $ne: user.id },
        $or: [{ email }, { name }, { nickname }],
      },
      { collation: caseInsensitive },
    )
    .toArray();

  for (const row of taken) {
    if (String(row.email).toLowerCase() === email) {
      return { error: "An account with this email already exists." };
    }
    if (String(row.name).toLowerCase() === name.toLowerCase()) {
      return { error: "This name is already taken." };
    }
    if (String(row.nickname).toLowerCase() === nickname.toLowerCase()) {
      return { error: "This nickname is already taken." };
    }
  }

  await (await users()).updateOne({ _id: user.id }, { $set: { name, nickname, email } });

  return { message: "Profile updated.", name, nickname, email };
}

export async function updateOwnPassword(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password must be 128 characters or fewer." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  await (await users()).updateOne({ _id: user.id }, { $set: { password: hashPassword(password) } });

  return { message: "Password updated." };
}
