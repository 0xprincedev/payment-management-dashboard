import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
import PageHeader from "@/components/page-header";
import type { PaymentWidget } from "@/lib/payments";
import type { CurrentUser } from "@/lib/session";

export default function HomeScreen({
  user,
  widgets,
}: {
  user: CurrentUser;
  widgets: PaymentWidget[];
}) {
  return (
    <AppShell user={user} current="home">
        <PageHeader title="Home" description={`Signed in as ${user.nickname}.`} />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            mt: 0,
          }}
        >
          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, border: 1, borderColor: "divider" }}>
            <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
              Account
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Detail label="Nickname" value={user.nickname} />
              <Detail label="Email" value={user.email} />
              <Detail label="Group" value={user.groupName} />
              <Detail label="Role" value={user.role} />
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, border: 1, borderColor: "divider" }}>
            <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
              Payments
            </Typography>
            {widgets.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                No payment widgets yet.
              </Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                {widgets.slice(0, 5).map((widget) => (
                  <Box
                    key={widget.id}
                    component="a"
                    href={`/payments/${widget.id}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mx: -1,
                      px: 1,
                      py: 1,
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: 14,
                      "&:hover": { bgcolor: "action.hover", color: "primary.main" },
                    }}
                  >
                    <Box component="span" sx={{ minWidth: 0 }}>
                      {user.role === "Admin" ? `${widget.groupName} · ${widget.name}` : widget.name}
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
                  </Box>
                ))}
              </Box>
            )}
            <Typography
              component="a"
              href="/payments"
              variant="body2"
              color="primary"
              sx={{ display: "inline-block", mt: 1.5, fontWeight: 600 }}
            >
              Open payments
            </Typography>
          </Paper>
        </Box>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "baseline" },
        gap: { xs: 0.25, sm: 2 },
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0, pb: 0 },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: { xs: "left", sm: "right" }, minWidth: 0 }}>
        {value}
      </Typography>
    </Box>
  );
}
