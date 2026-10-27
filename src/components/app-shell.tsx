import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ReactNode } from "react";
import { signOut } from "@/app/sign-in-actions";
import BrandMark from "@/components/brand-mark";
import ColorModeToggle from "@/components/color-mode-toggle";
import type { CurrentUser } from "@/lib/session";

const sidebarText = "rgba(225, 222, 245, 0.9)";
const sidebarMuted = "rgba(225, 222, 245, 0.62)";

export default function AppShell({
  user,
  current,
  children,
}: {
  user: CurrentUser;
  current: "home" | "profile" | "payments" | "accounts" | "members";
  children: ReactNode;
}) {
  const initial = user.nickname.trim().charAt(0).toUpperCase() || "P";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Box
        component="nav"
        aria-label="Main"
        sx={{
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          width: { xs: 188, sm: 260 },
          height: "100vh",
          flexShrink: 0,
          px: 1.5,
          py: 2,
          bgcolor: "#2F3349",
          color: sidebarText,
          borderRight: "1px solid rgba(225, 222, 245, 0.08)",
        }}
      >
        <Box sx={{ px: 0.5, mb: 2.5 }}>
          <BrandMark onDark />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <NavItem href="/" current={current === "home"} icon={HomeOutlinedIcon}>
            Home
          </NavItem>
          <NavItem href="/payments" current={current === "payments"} icon={AccountBalanceWalletOutlinedIcon}>
            Payments
          </NavItem>
          <NavItem href="/accounts" current={current === "accounts"} icon={AccountBoxOutlinedIcon}>
            Accounts
          </NavItem>
          {user.role === "Boss" ? (
            <NavItem href="/members" current={current === "members"} icon={GroupsOutlinedIcon}>
              Members
            </NavItem>
          ) : null}
        </Box>
        <Box sx={{ mt: "auto" }}>
          <NavItem href="/profile" current={current === "profile"} icon={PersonOutlinedIcon}>
            Profile
          </NavItem>
          <Box
            sx={{
              mt: 1.5,
              px: 1.25,
              py: 1.25,
              borderRadius: "10px",
              bgcolor: "rgba(225, 222, 245, 0.06)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <Box
                aria-hidden
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: "50%",
                  bgcolor: "rgba(115, 103, 240, 0.24)",
                  color: "#A79DFF",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                {initial}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>
                  {user.nickname}
                </Typography>
                <Typography noWrap sx={{ fontSize: 12, color: sidebarMuted }}>
                  {user.role} · {user.groupName}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
              <ColorModeToggle onDark />
              <Box component="form" action={signOut}>
                <Button type="submit" color="inherit" size="small" sx={{ color: sidebarMuted }}>
                  Sign out
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 4 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function NavItem({
  href,
  current,
  icon: Icon,
  children,
}: {
  href: string;
  current: boolean;
  icon: SvgIconComponent;
  children: string;
}) {
  return (
    <Box
      component="a"
      href={href}
      aria-current={current ? "page" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1,
        borderRadius: "8px",
        fontWeight: current ? 600 : 500,
        fontSize: 15,
        color: current ? "#7367F0" : sidebarText,
        bgcolor: current ? "rgba(115, 103, 240, 0.16)" : "transparent",
        "&:hover": {
          bgcolor: current ? "rgba(115, 103, 240, 0.22)" : "rgba(225, 222, 245, 0.08)",
        },
      }}
    >
      <Icon sx={{ fontSize: 22 }} />
      {children}
    </Box>
  );
}
