import type { Metadata } from "next";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import BrandMark from "@/components/brand-mark";
import ColorModeToggle from "@/components/color-mode-toggle";
import { listWidgets } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import HomeScreen from "./home-screen";
import SignInForm from "./sign-in-form";

export const metadata: Metadata = {
  title: "Home",
  description: "Payment management",
};

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const user = await getCurrentUser();

  if (user) {
    const widgets = await listWidgets(user.groupId, user);
    return <HomeScreen user={user} widgets={widgets} />;
  }

  return (
    <PageShell>
      <Typography variant="h5" component="h1" sx={{ mt: 0.5 }}>
        Sign in
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        Use the email and password for your account.
      </Typography>
      <SignInForm />
    </PageShell>
  );
}

function HomeFallback() {
  return (
    <PageShell>
      <Skeleton variant="text" width={120} height={40} />
      <Skeleton variant="text" width={240} sx={{ mt: 1, mb: 3 }} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={56} sx={{ mt: 2 }} />
      <Skeleton variant="rounded" height={42} sx={{ mt: 2 }} />
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        px: 2,
        py: { xs: 4, sm: 8 },
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          height: "fit-content",
          p: { xs: 2.5, sm: 4 },
          border: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <BrandMark />
          <ColorModeToggle />
        </Box>
        {children}
      </Paper>
    </Box>
  );
}
