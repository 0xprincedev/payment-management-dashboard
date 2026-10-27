import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
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
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
          Accounts for every group.
        </Typography>
        {groups.map((group) => (
          <Box key={group.id} sx={{ mt: 4 }}>
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
                  <AccountsTable accounts={member.accounts} readOnly />
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
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Accounts
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        Your accounts. Drag a row to set their order.
      </Typography>
      {isBoss(user.role) ? (
        <MemberViews
          ownId={user.id}
          people={[
            {
              id: user.id,
              nickname: user.nickname,
              table: <AccountsTable accounts={accounts} relocateAddButton />,
            },
            ...memberAccounts.map((member) => ({
              id: member.id,
              nickname: member.nickname,
              table: <AccountsTable accounts={member.accounts} readOnly />,
            })),
          ]}
        />
      ) : (
        <AccountsTable accounts={accounts} />
      )}
    </AppShell>
  );
}
