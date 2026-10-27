"use server";

import { redirect } from "next/navigation";
import { db, type UserStatus } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { createSession, destroySession } from "@/lib/session";

export type SignInState = {
  error?: string;
};

type AccountRow = {
  id: number;
  password: string;
  status: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const account = db
    .prepare("SELECT id, password, status FROM users WHERE email = ?")
    .get(email) as AccountRow | undefined;

  if (!account || !verifyPassword(password, account.password)) {
    return { error: "Email or password is incorrect." };
  }

  const status = account.status as UserStatus;
  if (status === "Pending") {
    return { error: "This account is waiting for approval." };
  }
  if (status === "Rejected") {
    return { error: "This account was rejected." };
  }

  await createSession(Number(account.id));
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
