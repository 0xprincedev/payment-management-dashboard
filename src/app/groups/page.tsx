import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import AppShell from "@/components/app-shell";
import PageHeader from "@/components/page-header";
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
      <PageHeader title="Groups" description="Drag groups into the order used on Members, Accounts, and Payments." />
      <GroupsTable groups={groups} />
    </AppShell>
  );
}
