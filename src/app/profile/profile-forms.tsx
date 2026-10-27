"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { updateOwnPassword, updateOwnProfile, type ProfileActionState } from "./actions";

const initialState: ProfileActionState = {};

export default function ProfileForms({
  name,
  nickname,
  email,
  groupName,
  role,
}: {
  name: string;
  nickname: string;
  email: string;
  groupName: string;
  role: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        mt: 3,
        maxWidth: 960,
        alignItems: "start",
      }}
    >
      <AccountForm initialName={name} initialNickname={nickname} initialEmail={email} groupName={groupName} role={role} />
      <PasswordForm />
    </Box>
  );
}

function AccountForm({
  initialName,
  initialNickname,
  initialEmail,
  groupName,
  role,
}: {
  initialName: string;
  initialNickname: string;
  initialEmail: string;
  groupName: string;
  role: string;
}) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, initialState);
  const [name, setName] = useState(initialName);
  const [nickname, setNickname] = useState(initialNickname);
  const [email, setEmail] = useState(initialEmail);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.name || !state.nickname || !state.email) return;
    reported.current = state;
    setName(state.name);
    setNickname(state.nickname);
    setEmail(state.email);
  }, [state]);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" component="h2">
        Account
      </Typography>
      <Stack
        component="form"
        action={formAction}
        spacing={2}
        useFlexGap
        noValidate
        onKeyDown={submitFormOnEnter}
        sx={{ mt: 2 }}
      >
        {state.error ? <Alert severity="error">{state.error}</Alert> : null}
        {state.message ? <Alert severity="success">{state.message}</Alert> : null}
        <TextField
          name="name"
          label="Name"
          autoComplete="name"
          required
          disabled={pending}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          name="nickname"
          label="Nickname"
          autoComplete="nickname"
          required
          disabled={pending}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          disabled={pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Detail label="Group" value={groupName} />
        <Detail label="Role" value={role} />
        <Button type="submit" variant="contained" disabled={pending} sx={{ alignSelf: "flex-start" }}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </Stack>
    </Paper>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState(updateOwnPassword, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.message) return;
    reported.current = state;
    setPassword("");
    setConfirmPassword("");
  }, [state]);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider" }}>
      <Typography variant="h6" component="h2">
        Change password
      </Typography>
      <Stack
        component="form"
        action={formAction}
        spacing={2}
        useFlexGap
        noValidate
        onKeyDown={submitFormOnEnter}
        sx={{ mt: 2 }}
      >
        {state.error ? <Alert severity="error">{state.error}</Alert> : null}
        {state.message ? <Alert severity="success">{state.message}</Alert> : null}
        <TextField
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          disabled={pending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          disabled={pending}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" disabled={pending} sx={{ alignSelf: "flex-start" }}>
          {pending ? "Saving..." : "Save password"}
        </Button>
      </Stack>
    </Paper>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 0.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}
