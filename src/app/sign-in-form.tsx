"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { signIn, type SignInState } from "./sign-in-actions";

const initialState: SignInState = {};

export default function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      <TextField
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoFocus
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </Stack>
  );
}
