"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { signup, type SignupState } from "./actions";

export type SignupGroup = {
  id: number;
  name: string;
};

const initialState: SignupState = {};

function ReturnToSignIn() {
  return (
    <Button
      component={Link}
      href="/"
      variant="outlined"
      size="large"
      fullWidth
    >
      Return to sign in
    </Button>
  );
}

export default function SignupForm({ groups }: { groups: SignupGroup[] }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [groupId, setGroupId] = useState("");

  if (state.success) {
    return (
      <Stack spacing={2} useFlexGap>
        <Alert severity="success">
          Your account was created. It stays pending until a group boss approves it.
        </Alert>
        <ReturnToSignIn />
      </Stack>
    );
  }

  return (
    <Stack
      component="form"
      action={formAction}
      spacing={2}
      useFlexGap
      noValidate
      onKeyDown={submitFormOnEnter}
    >
      {state.error ? <Alert severity="error">{state.error}</Alert> : null}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <TextField
          name="name"
          label="Name"
          autoComplete="name"
          required
          autoFocus
          disabled={pending}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={Boolean(state.fieldErrors?.name)}
          helperText={state.fieldErrors?.name}
        />
        <TextField
          name="nickname"
          label="Nickname"
          autoComplete="nickname"
          required
          disabled={pending}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          error={Boolean(state.fieldErrors?.nickname)}
          helperText={state.fieldErrors?.nickname}
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
          error={Boolean(state.fieldErrors?.email)}
          helperText={state.fieldErrors?.email}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          disabled={pending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={Boolean(state.fieldErrors?.password)}
          helperText={state.fieldErrors?.password}
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
          error={Boolean(state.fieldErrors?.confirmPassword)}
          helperText={state.fieldErrors?.confirmPassword}
        />
        <TextField
          name="groupId"
          label="Group"
          select
          required
          disabled={pending}
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          error={Boolean(state.fieldErrors?.groupId)}
          helperText={state.fieldErrors?.groupId}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        >
          <MenuItem value="" sx={{ display: "none" }} />
          {groups.map((group) => (
            <MenuItem key={group.id} value={String(group.id)}>
              {group.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Stack spacing={1} useFlexGap>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={pending}
        >
          {pending ? "Creating account..." : "Create account"}
        </Button>
        <Divider
          sx={{
            color: "text.secondary",
            fontSize: "0.875rem",
            "&::before, &::after": { borderColor: "divider" },
          }}
        >
          Already have an account?
        </Divider>
        <ReturnToSignIn />
      </Stack>
    </Stack>
  );
}
