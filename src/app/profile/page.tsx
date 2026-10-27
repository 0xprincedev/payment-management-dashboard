import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
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
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        Your account details for {user.groupName}.
      </Typography>
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
