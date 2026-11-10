import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import PageHeader from "@/components/page-header";
import MemberViews from "@/components/member-views";
import { isAdmin, isBoss } from "@/lib/access";
import { listAccounts, listAllAccountsByGroup, listGroupMemberAccounts } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/session";
import AccountsTable from "./accounts-table";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Your accounts",
};

export default function AccountsPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <AccountsContent />
    </Suspense>
  );
}

async function AccountsContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  if (isAdmin(user.role)) {
    const groups = await listAllAccountsByGroup();
    return (
      <AppShell user={user} current="accounts">
        <PageHeader title="Accounts" description="Accounts for every group." />
        {groups.map((group, index) => (
          <Box key={group.id} sx={{ mt: index === 0 ? 0 : 4 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {group.name}
            </Typography>
            {group.members.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No members yet.
              </Typography>
            ) : (
              group.members.map((member) => (
                <Box key={member.id} sx={{ mt: 3 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                    {member.nickname}
                  </Typography>
                  <AccountsTable name={member.name} accounts={member.accounts} readOnly />
                </Box>
              ))
            )}
          </Box>
        ))}
      </AppShell>
    );
  }

  const accounts = await listAccounts(user.id);
  const memberAccounts = isBoss(user.role) ? await listGroupMemberAccounts(user.groupId, user.id) : [];

  return (
    <AppShell user={user} current="accounts">
      <PageHeader title="Accounts" description="Your accounts. Drag a row to set their order." />
      {isBoss(user.role) ? (
        <MemberViews
          ownId={user.id}
          people={[
            {
              id: user.id,
              nickname: user.nickname,
              table: <AccountsTable name={user.name} accounts={accounts} relocateAddButton />,
            },
            ...memberAccounts.map((member) => ({
              id: member.id,
              nickname: member.nickname,
              table: <AccountsTable name={member.name} accounts={member.accounts} readOnly />,
            })),
          ]}
        />
      ) : (
        <AccountsTable name={user.name} accounts={accounts} />
      )}
    </AppShell>
  );
}
