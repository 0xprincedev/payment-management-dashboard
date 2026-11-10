import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import AppShell from "@/components/app-shell";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import ProfileForms from "./profile-forms";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and update your account",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell user={user} current="profile">
      <PageHeader title="Profile" description={`Your account details for ${user.groupName}.`} />
      <ProfileForms
        name={user.name}
        nickname={user.nickname}
        email={user.email}
        groupName={user.groupName}
        role={user.role}
      />
    </AppShell>
  );
}
