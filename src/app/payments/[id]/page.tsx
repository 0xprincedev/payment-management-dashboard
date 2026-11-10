import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import PageHeader from "@/components/page-header";
import MemberViews from "@/components/member-views";
import { isAdmin, isBoss } from "@/lib/access";
import { getWidget, listMemberPayments, listMembers } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import AddPaymentDialog from "../add-payment-dialog";
import ExportDialog from "../export-dialog";
import MemberRanking from "../member-ranking";
import RecordsTable from "../records-table";

export const metadata: Metadata = {
  title: "Payment widget",
  description: "Add a payment",
};

export default function PaymentWidgetPage(props: PageProps<"/payments/[id]">) {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <WidgetContent params={props.params} />
    </Suspense>
  );
}

async function WidgetContent({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const widgetId = Number(id);
  const widget =
    Number.isInteger(widgetId) && widgetId > 0
      ? await getWidget(widgetId, isAdmin(user.role) ? null : user.groupId)
      : null;

  if (!widget) notFound();

  const members = await listMembers();
  const roster = await listMemberPayments(widget.id, widget.groupId);
  const payments = roster.find((member) => member.id === user.id)?.payments ?? [];
  const memberPayments = isAdmin(user.role) ? roster : roster.filter((member) => member.id !== user.id);

  return (
    <AppShell user={user} current="payments">
      <Typography component="a" href="/payments" variant="body2" color="primary" sx={{ display: "inline-block", mb: 1.5, fontWeight: 600 }}>
        All widgets
      </Typography>
      <PageHeader
        title={widget.name}
        description={isAdmin(user.role) ? `Payments for ${widget.groupName}.` : "Add your payments one at a time."}
        action={<ExportDialog widgetId={widget.id} defaultFilename={widget.name} />}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "flex-start",
          gap: 3,
        }}
      >
        <Box sx={{ flex: "1 1 auto", minWidth: 0, width: "100%" }}>
      {isBoss(user.role) ? (
        <MemberViews
          ownId={user.id}
          action={<AddPaymentDialog widgetId={widget.id} members={members} />}
          people={[
            {
              id: user.id,
              nickname: user.nickname,
              table: (
                <RecordsTable payments={payments} members={members} ownGroupId={widget.groupId} topMargin={2} />
              ),
            },
            ...memberPayments.map((member) => ({
              id: member.id,
              nickname: member.nickname,
              table: (
                <RecordsTable payments={member.payments} members={members} ownGroupId={widget.groupId} readOnly />
              ),
            })),
          ]}
        />
      ) : isAdmin(user.role) ? (
        <MemberViews
          ownId={-1}
          people={memberPayments.map((member) => ({
            id: member.id,
            nickname: member.nickname,
            table: (
              <RecordsTable payments={member.payments} members={members} ownGroupId={widget.groupId} readOnly />
            ),
          }))}
        />
      ) : (
        <Box>
          <AddPaymentDialog widgetId={widget.id} members={members} />
          <RecordsTable payments={payments} members={members} ownGroupId={user.groupId} topMargin={2} />
        </Box>
      )}
        </Box>
        <MemberRanking members={roster} currentUserId={user.id} />
      </Box>
    </AppShell>
  );
}
