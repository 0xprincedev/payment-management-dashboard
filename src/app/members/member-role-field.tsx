"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { updateMemberRole, type MemberActionState } from "./actions";

const roles = ["Boss", "Member"] as const;
const initialState: MemberActionState = {};

export default function MemberRoleField({
  userId,
  nickname,
  role,
  onResult,
}: {
  userId: number;
  nickname: string;
  role: (typeof roles)[number];
  onResult: (result: MemberActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberRole, initialState);
  const [value, setValue] = useState(role);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current) return;
    if (!state.message && !state.error && !state.role) return;
    reported.current = state;
    if (state.error || (state.role !== "Boss" && state.role !== "Member")) setValue(role);
    onResult(state);
  }, [state, role, onResult]);

  return (
    <TextField
      select
      size="small"
      hiddenLabel
      value={value}
      disabled={pending}
      aria-label={`Role for ${nickname}`}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "Boss" && next !== "Member") return;
        if (next === role) return;
        setValue(next);
        const data = new FormData();
        data.set("userId", String(userId));
        data.set("role", next);
        startTransition(() => {
          formAction(data);
        });
      }}
      sx={{ minWidth: 120 }}
    >
      {roles.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
