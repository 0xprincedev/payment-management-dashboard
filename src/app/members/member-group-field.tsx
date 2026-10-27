"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { updateMemberGroup, type MemberActionState } from "./actions";

const initialState: MemberActionState = {};

export default function MemberGroupField({
  userId,
  nickname,
  groupId,
  groups,
  onResult,
}: {
  userId: number;
  nickname: string;
  groupId: number;
  groups: { id: number; name: string }[];
  onResult: (result: MemberActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberGroup, initialState);
  const [value, setValue] = useState(groupId);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current) return;
    if (!state.message && !state.error && state.groupId == null) return;
    reported.current = state;
    if (state.error || state.groupId == null) setValue(groupId);
    onResult(state);
  }, [state, groupId, onResult]);

  return (
    <TextField
      select
      size="small"
      hiddenLabel
      value={value}
      disabled={pending}
      aria-label={`Group for ${nickname}`}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (!Number.isInteger(next) || next === groupId || !groups.some((group) => group.id === next)) return;
        setValue(next);
        const data = new FormData();
        data.set("userId", String(userId));
        data.set("groupId", String(next));
        startTransition(() => {
          formAction(data);
        });
      }}
      sx={{ minWidth: 140 }}
    >
      {groups.map((group) => (
        <MenuItem key={group.id} value={group.id}>
          {group.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
