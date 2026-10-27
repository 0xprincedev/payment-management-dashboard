"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { PaymentMember } from "./add-payment-dialog";

function memberLabel(member: PaymentMember) {
  return `${member.nickname} · ${member.groupName}`;
}

export default function MemberField({
  members,
  memberId,
  onChange,
  autoFocus,
}: {
  members: PaymentMember[];
  memberId: string;
  onChange: (memberId: string) => void;
  autoFocus?: boolean;
}) {
  const selected = members.find((member) => String(member.id) === memberId) ?? null;

  return (
    <>
      <input type="hidden" name="memberId" value={memberId} />
      <Autocomplete
        options={members}
        value={selected}
        onChange={(_event, value) => onChange(value ? String(value.id) : "")}
        getOptionLabel={memberLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        autoHighlight
        openOnFocus
        fullWidth
        renderInput={(params) => <TextField {...params} label="Member" required autoFocus={autoFocus} />}
      />
    </>
  );
}
