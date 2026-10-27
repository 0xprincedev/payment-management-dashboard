import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import { isAdmin, isBoss } from "@/lib/access";
import { listGroupProfiles, listGroupsWithProfiles } from "@/lib/members";
import { getCurrentUser } from "@/lib/session";
import AdminMembers from "./admin-members";
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
  if (!isBoss(user.role) && !isAdmin(user.role)) redirect("/");

  if (user.role === "Admin") {
    const groups = await listGroupsWithProfiles();
    return (
      <AppShell user={user} current="members">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Members
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
          Every group. Change a member&apos;s group or role, or drag members into the order used in the spreadsheet export.
        </Typography>
        <AdminMembers groups={groups} selfId={user.id} />
      </AppShell>
    );
  }

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
