import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import { formatAmount, listWidgets, type PaymentWidget } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import CreateWidgetForm from "./create-widget-form";
import RefreshWidgetButton from "./refresh-widget-button";

export const metadata: Metadata = {
  title: "Payments",
  description: "Payment widgets",
};

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />}>
      <PaymentsContent />
    </Suspense>
  );
}

async function PaymentsContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const widgets = await listWidgets(user.groupId, user);

  return (
    <AppShell user={user} current="payments">
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Payments
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        {user.role === "Boss"
          ? `Create a widget for ${user.groupName}. Members select it and add their payments one by one.`
          : "Select a widget, then add your payments one by one."}
      </Typography>
      {user.role === "Boss" ? (
        <Paper elevation={0} sx={{ maxWidth: 560, mt: 3, p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider" }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            New widget
          </Typography>
          <CreateWidgetForm />
        </Paper>
      ) : null}
      <Box sx={{ display: "grid", gap: 2, mt: 3, maxWidth: 720 }}>
        {widgets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No payment widgets yet.
          </Typography>
        ) : (
          widgets.map((widget) => <WidgetLink key={widget.id} widget={widget} />)
        )}
      </Box>
    </AppShell>
  );
}

function money(cents: number) {
  return `${cents < 0 ? "-" : ""}$${formatAmount(Math.abs(cents))}`;
}

function WidgetLink({ widget }: { widget: PaymentWidget }) {
  const summary = widget.summary;

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        p: { xs: 2, sm: 2.5 },
        border: 1,
        borderColor: "divider",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <RefreshWidgetButton />
      <Box
        component="a"
        href={`/payments/${widget.id}`}
        sx={{ display: "block", pr: 5, color: "inherit", textDecoration: "none" }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {widget.name}
        </Typography>
        {summary ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="h6" component="p" sx={{ fontWeight: 700 }}>
              {money(summary.totalCents)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bank transactions {formatAmount(summary.bankCents)}
            </Typography>
            {summary.internalByGroup.length > 0 ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Internal transactions
                </Typography>
                {summary.internalByGroup.map((group) => (
                  <Typography key={group.groupId} variant="body2" color="text.secondary">
                    {group.name} {formatAmount(group.amountCents)}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
}
