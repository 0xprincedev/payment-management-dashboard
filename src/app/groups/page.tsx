import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import { isAdmin } from "@/lib/access";
import { listManagedGroups } from "@/lib/group-admin";
import { getCurrentUser } from "@/lib/session";
import GroupsTable from "./groups-table";

export const metadata: Metadata = {
  title: "Groups",
  description: "Create and arrange groups",
};

export default function GroupsPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <GroupsContent />
    </Suspense>
  );
}

async function GroupsContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!isAdmin(user.role)) redirect("/");

  const groups = await listManagedGroups();

  return (
    <AppShell user={user} current="groups">
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Groups
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        Drag groups into the order used on Members, Accounts, and Payments.
      </Typography>
      <GroupsTable groups={groups} />
    </AppShell>
  );
}
