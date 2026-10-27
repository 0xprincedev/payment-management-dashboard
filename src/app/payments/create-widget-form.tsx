"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { createWidget, type FormState } from "./actions";

const initialState: FormState = {};

export default function CreateWidgetForm() {
  const [state, formAction, pending] = useActionState(createWidget, initialState);
  const [name, setName] = useState("");

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
        name="name"
        label="Widget name"
        placeholder="2026/10 Payment"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        autoFocus
      />
      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? "Creating widget..." : "Create widget"}
      </Button>
    </Stack>
  );
}
