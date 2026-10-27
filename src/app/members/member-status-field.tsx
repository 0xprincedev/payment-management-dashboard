"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { updateMemberStatus, type MemberActionState } from "./actions";

const statuses = ["Approved", "Pending", "Rejected"] as const;
const initialState: MemberActionState = {};

export default function MemberStatusField({
  userId,
  nickname,
  status,
  onResult,
}: {
  userId: number;
  nickname: string;
  status: (typeof statuses)[number];
  onResult: (result: MemberActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberStatus, initialState);
  const [value, setValue] = useState(status);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current) return;
    if (!state.message && !state.error) return;
    reported.current = state;
    if (state.error) setValue(status);
    onResult(state);
  }, [state, status, onResult]);

  return (
    <TextField
      select
      size="small"
      hiddenLabel
      value={value}
      disabled={pending}
      aria-label={`Status for ${nickname}`}
      onChange={(event) => {
        const next = event.target.value;
        if (!statuses.includes(next as (typeof statuses)[number])) return;
        setValue(next as (typeof statuses)[number]);
        const data = new FormData();
        data.set("userId", String(userId));
        data.set("status", next);
        formAction(data);
      }}
      sx={{ minWidth: 140 }}
    >
      {statuses.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
