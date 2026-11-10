import type { Metadata } from "next";
import { Suspense } from "react";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AuthShell from "@/components/auth-shell";
import { listGroups } from "@/lib/groups";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a payment management account",
};

export default function SignupPage() {
  return (
    <AuthShell maxWidth={560}>
      <Typography variant="h5" component="h1">
        Create an account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        You will join as a member. An admin approves the account before it can be used.
      </Typography>
      <Suspense fallback={<SignupFormFallback />}>
        <SignupContent />
      </Suspense>
    </AuthShell>
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
