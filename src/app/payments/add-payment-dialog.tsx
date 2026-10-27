"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { addPayment, type FormState } from "./actions";
import MemberField from "./member-field";

export type PaymentMember = {
  id: number;
  nickname: string;
  groupName: string;
};

const initialState: FormState = {};

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function AddPaymentDialog({
  widgetId,
  members,
}: {
  widgetId: number;
  members: PaymentMember[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add payment
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        {open ? (
          <PaymentDialogForm
            widgetId={widgetId}
            members={members}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

function PaymentDialogForm({
  widgetId,
  members,
  onClose,
}: {
  widgetId: number;
  members: PaymentMember[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(addPayment, initialState);
  const [kind, setKind] = useState<"bank" | "internal">("bank");
  const [info, setInfo] = useState("");
  const [account, setAccount] = useState("");
  const [memberId, setMemberId] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Add payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} useFlexGap sx={{ pt: 1 }}>
          <input type="hidden" name="widgetId" value={widgetId} />
          <input type="hidden" name="kind" value={kind} />
          {state.error ? <Alert severity="error">{state.error}</Alert> : null}
          <ToggleButtonGroup
            exclusive
            value={kind}
            onChange={(_event, value: "bank" | "internal" | null) => {
              if (value) setKind(value);
            }}
            aria-label="Payment type"
            sx={{ width: "100%" }}
          >
            <ToggleButton value="bank" type="button" sx={{ flex: 1 }}>
              Bank transaction
            </ToggleButton>
            <ToggleButton value="internal" type="button" sx={{ flex: 1 }}>
              Internal transaction
            </ToggleButton>
          </ToggleButtonGroup>
          {kind === "bank" ? (
            <>
              <TextField
                name="info"
                label="Info"
                value={info}
                onChange={(event) => setInfo(event.target.value)}
                required
                autoFocus
              />
              <TextField
                name="account"
                label="Account"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                required
              />
            </>
          ) : (
            <MemberField members={members} memberId={memberId} onChange={setMemberId} autoFocus />
          )}
          <TextField
            name="paidOn"
            type="date"
            label="Date"
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="amount"
            label="Amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          {kind === "bank" ? (
            <TextField
              name="note"
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" color="inherit" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Adding payment..." : "Add payment"}
        </Button>
      </DialogActions>
    </form>
  );
}
