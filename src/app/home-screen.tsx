import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/app-shell";
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
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Home
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Signed in as {user.nickname}.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            mt: 3,
          }}
        >
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider" }}>
            <Typography variant="h6" component="h2">
              Account
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Detail label="Nickname" value={user.nickname} />
              <Detail label="Email" value={user.email} />
              <Detail label="Group" value={user.groupName} />
              <Detail label="Role" value={user.role} />
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider" }}>
            <Typography variant="h6" component="h2">
              Payments
            </Typography>
            {widgets.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                No payment widgets yet.
              </Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                {widgets.slice(0, 5).map((widget) => (
                  <Typography
                    key={widget.id}
                    component="a"
                    href={`/payments/${widget.id}`}
                    variant="body2"
                    sx={{
                      display: "block",
                      py: 0.75,
                      fontWeight: 600,
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {user.role === "Admin" ? `${widget.groupName} · ${widget.name}` : widget.name}
                  </Typography>
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
