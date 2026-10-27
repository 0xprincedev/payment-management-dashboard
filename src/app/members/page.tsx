import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import { listGroupProfiles } from "@/lib/members";
import { getCurrentUser } from "@/lib/session";
import MembersTable from "./members-table";

export const metadata: Metadata = {
  title: "Members",
  description: "Group member profiles",
};

export default function MembersPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "Boss") redirect("/");

  const members = await listGroupProfiles(user.groupId);

  return (
    <AppShell user={user} current="members">
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Members
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        Profiles for {user.groupName}. Drag members into the order used in the spreadsheet export.
      </Typography>
      <MembersTable members={members} selfId={user.id} />
    </AppShell>
  );
}
