import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import MemberViews from "@/components/member-views";
import { getWidget, listMemberPayments, listMembers, listPayments } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import AddPaymentDialog from "../add-payment-dialog";
import ExportDialog from "../export-dialog";
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
      ? await getWidget(widgetId, user.groupId)
      : null;

  if (!widget) notFound();

  const members = await listMembers();
  const roster = user.role === "Boss" ? await listMemberPayments(widget.id, user) : [];
  const payments =
    user.role === "Boss"
      ? (roster.find((member) => member.id === user.id)?.payments ?? [])
      : await listPayments(widget.id, user);
  const memberPayments = roster.filter((member) => member.id !== user.id);

  return (
    <AppShell user={user} current="payments">
      <Typography
        component="a"
        href="/payments"
        variant="body2"
        color="primary"
        sx={{ fontWeight: 600 }}
      >
        All widgets
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "flex-start" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mt: 1,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {widget.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Add your payments one at a time.
          </Typography>
        </Box>
        <ExportDialog widgetId={widget.id} defaultFilename={widget.name} />
      </Box>
      {user.role === "Boss" ? (
        <MemberViews
          ownId={user.id}
          action={<AddPaymentDialog widgetId={widget.id} members={members} />}
          people={[
            {
              id: user.id,
              nickname: user.nickname,
              table: (
                <RecordsTable payments={payments} members={members} ownGroupId={user.groupId} topMargin={2} />
              ),
            },
            ...memberPayments.map((member) => ({
              id: member.id,
              nickname: member.nickname,
              table: (
                <RecordsTable payments={member.payments} members={members} ownGroupId={user.groupId} readOnly />
              ),
            })),
          ]}
        />
      ) : (
        <Box sx={{ mt: 3 }}>
          <AddPaymentDialog widgetId={widget.id} members={members} />
          <RecordsTable payments={payments} members={members} ownGroupId={user.groupId} topMargin={2} />
        </Box>
      )}
    </AppShell>
  );
}
