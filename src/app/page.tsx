import type { Metadata } from "next";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import AuthShell from "@/components/auth-shell";
import { isAdmin } from "@/lib/access";
import { listAllWidgets, listWidgets } from "@/lib/payments";
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
    const widgets = isAdmin(user.role) ? await listAllWidgets() : await listWidgets(user.groupId, user);
    return <HomeScreen user={user} widgets={widgets} />;
  }

  return (
    <AuthShell>
      <Typography variant="h5" component="h1">
        Sign in
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        Use the email and password for your account.
      </Typography>
      <SignInForm />
      <SignUpPrompt />
    </AuthShell>
  );
}

function HomeFallback() {
  return (
    <AuthShell>
      <Skeleton variant="text" width={120} height={40} />
      <Skeleton variant="text" width={240} sx={{ mt: 1, mb: 3 }} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={56} sx={{ mt: 2 }} />
      <Skeleton variant="rounded" height={42} sx={{ mt: 2 }} />
      <Skeleton variant="text" width={220} sx={{ mt: 3, mx: "auto" }} />
    </AuthShell>
  );
}

function SignUpPrompt() {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
      Don&apos;t have an account yet?{" "}
      <Box
        component="a"
        href="/signup"
        sx={{
          color: "primary.main",
          fontWeight: 700,
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        Register now
      </Box>
    </Typography>
  );
}

