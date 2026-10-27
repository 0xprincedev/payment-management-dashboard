import type { Metadata } from "next";
import { Suspense } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BrandMark from "@/components/brand-mark";
import ColorModeToggle from "@/components/color-mode-toggle";
import { listGroups } from "@/lib/groups";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a payment management account",
};

export default function SignupPage() {
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
          maxWidth: 560,
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
        <Typography variant="h5" component="h1" sx={{ mt: 0.5 }}>
          Create an account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          You will join as a member. An admin approves the account before it
          can be used.
        </Typography>
        <Suspense fallback={<SignupFormFallback />}>
          <SignupContent />
        </Suspense>
      </Paper>
    </Box>
  );
}

async function SignupContent() {
  const groups = await listGroups();

  if (groups.length === 0) {
    return (
      <Alert severity="warning">
        No groups are available, so new accounts cannot be created yet.
      </Alert>
    );
  }

  return <SignupForm groups={groups} />;
}

function SignupFormFallback() {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={56} />
      ))}
      <Skeleton variant="rounded" height={42} />
      <Skeleton variant="rounded" height={42} />
    </Stack>
  );
}
