"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { deletePayment, updatePayment, type FormState } from "./actions";
import type { PaymentMember } from "./add-payment-dialog";
import MemberField from "./member-field";

export type EditablePayment = {
  id: number;
  kind: "bank" | "internal";
  info: string;
  account: string;
  memberId: number | null;
  paidOn: string;
  amount: string;
  note: string;
};

const initialState: FormState = {};

export default function PaymentRowActions({
  payment,
  members,
}: {
  payment: EditablePayment;
  members: PaymentMember[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
      <Button type="button" size="small" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button type="button" size="small" color="error" onClick={() => setDeleting(true)}>
        Delete
      </Button>
      <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="sm" scroll="paper">
        {editing ? (
          <EditPaymentForm payment={payment} members={members} onClose={() => setEditing(false)} />
        ) : null}
      </Dialog>
      <Dialog open={deleting} onClose={() => setDeleting(false)} fullWidth maxWidth="xs">
        {deleting ? <DeletePaymentForm paymentId={payment.id} onClose={() => setDeleting(false)} /> : null}
      </Dialog>
    </Box>
  );
}

function EditPaymentForm({
  payment,
  members,
  onClose,
}: {
  payment: EditablePayment;
  members: PaymentMember[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updatePayment, initialState);
  const [info, setInfo] = useState(payment.info);
  const [account, setAccount] = useState(payment.account);
  const [memberId, setMemberId] = useState(payment.memberId ? String(payment.memberId) : "");
  const [paidOn, setPaidOn] = useState(payment.paidOn);
  const [amount, setAmount] = useState(payment.amount);
  const [note, setNote] = useState(payment.note);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Edit payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} useFlexGap sx={{ pt: 1 }}>
          <input type="hidden" name="paymentId" value={payment.id} />
          {state.error ? <Alert severity="error">{state.error}</Alert> : null}
          {payment.kind === "bank" ? (
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
            <MemberField members={members} memberId={memberId} onChange={setMemberId} />
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
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          {payment.kind === "bank" ? (
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
          {pending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </form>
  );
}

function DeletePaymentForm({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(deletePayment, initialState);

  return (
    <form action={formAction}>
      <DialogTitle>Delete this payment?</DialogTitle>
      <DialogContent>
        <input type="hidden" name="paymentId" value={paymentId} />
        {state.error ? <Alert severity="error">{state.error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" color="inherit" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="error" disabled={pending}>
          {pending ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </form>
  );
}
