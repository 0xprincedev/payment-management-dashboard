"use client";

import { useActionState, useContext, useEffect, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MemberActionSlot } from "@/components/member-views";
import type { AccountRecord } from "@/lib/account-record";
import { nationalities } from "@/lib/nationalities";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { createAccount, deleteAccount, reorderAccounts, updateAccount, type AccountActionState } from "./actions";

const columns = [
  "No",
  "Account",
  "Nationality",
  "Status",
  "Hours",
  "Jobs",
  "Bids",
  "Interview",
  "Work in progress",
  "Note",
] as const;

const initialState: AccountActionState = {};

function moveRow(rows: AccountRecord[], from: number, to: number) {
  const updated = [...rows];
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);
  return updated;
}

function rowIndexAt(body: HTMLTableSectionElement, clientY: number) {
  const elements = [...body.querySelectorAll("tr")];
  for (let index = 0; index < elements.length; index += 1) {
    const rect = elements[index].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return index;
  }
  return Math.max(elements.length - 1, 0);
}

export default function AccountsTable({
  accounts,
  readOnly = false,
  relocateAddButton = false,
}: {
  accounts: AccountRecord[];
  readOnly?: boolean;
  relocateAddButton?: boolean;
}) {
  const [rows, setRows] = useState(accounts);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountRecord | null>(null);
  const [deleting, setDeleting] = useState<AccountRecord | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const rowsRef = useRef(rows);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    index: number;
    startIds: number[];
    native: boolean;
  } | null>(null);
  rowsRef.current = rows;
  const actionSlot = useContext(MemberActionSlot);

  function rowsFor(ids: number[]) {
    const byId = new Map(rowsRef.current.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)!);
  }

  async function persistOrder(updated: AccountRecord[], previous: AccountRecord[]) {
    rowsRef.current = updated;
    setRows(updated);
    setSavingOrder(true);
    const result = await reorderAccounts(updated.map((row) => row.id));
    if (result.error) {
      rowsRef.current = previous;
      setRows(previous);
    }
    setSavingOrder(false);
  }

  function placeDrag(target: number) {
    const drag = dragRef.current;
    if (!drag || target < 0 || target === drag.index) return;
    const updated = moveRow(rowsRef.current, drag.index, target);
    rowsRef.current = updated;
    drag.index = target;
    setRows(updated);
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);
    const current = rowsRef.current;
    if (current.map((row) => row.id).join(",") === drag.startIds.join(",")) return;
    void persistOrder(current, rowsFor(drag.startIds));
  }

  function startDrag(event: ReactPointerEvent<HTMLTableRowElement>, index: number) {
    if (savingOrder || dragRef.current || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable for this event.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      index,
      startIds: rowsRef.current.map((row) => row.id),
      native: false,
    };
    setDraggingId(rowsRef.current[index].id);
  }

  function moveDrag(event: ReactPointerEvent<HTMLTableRowElement>) {
    const drag = dragRef.current;
    if (!drag || drag.native || drag.pointerId !== event.pointerId || !bodyRef.current) return;
    placeDrag(rowIndexAt(bodyRef.current, event.clientY));
  }

  function cancelDrag(event: ReactPointerEvent<HTMLTableRowElement>) {
    const drag = dragRef.current;
    if (!drag || drag.native || drag.pointerId !== event.pointerId) return;
    const restored = rowsFor(drag.startIds);
    dragRef.current = null;
    rowsRef.current = restored;
    setRows(restored);
    setDraggingId(null);
  }

  function endDrag(event: ReactPointerEvent<HTMLTableRowElement>) {
    const drag = dragRef.current;
    if (!drag || drag.native || drag.pointerId !== event.pointerId) return;
    finishDrag();
  }

  function startNativeDrag(event: ReactDragEvent<HTMLTableRowElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.native = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(rowsRef.current[drag.index]?.id ?? ""));
    const row = event.currentTarget.closest("tr");
    if (row) event.dataTransfer.setDragImage(row, 24, 16);
  }

  function dragOverRow(event: ReactDragEvent<HTMLTableSectionElement>) {
    if (!dragRef.current?.native || !bodyRef.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    placeDrag(rowIndexAt(bodyRef.current, event.clientY));
  }

  function dropRow(event: ReactDragEvent<HTMLTableSectionElement>) {
    const drag = dragRef.current;
    if (!drag?.native || !bodyRef.current) return;
    event.preventDefault();
    const row = (event.target as HTMLElement).closest("tr");
    const index = row ? [...bodyRef.current.querySelectorAll("tr")].indexOf(row) : -1;
    if (index >= 0) placeDrag(index);
    finishDrag();
  }

  const addButton = (
    <Button variant="contained" onClick={() => setAdding(true)} disabled={savingOrder}>
      Add account
    </Button>
  );

  return (
    <Box sx={{ mt: readOnly ? 1.5 : relocateAddButton ? 0 : 3 }}>
      {readOnly ? null : relocateAddButton ? (actionSlot ? createPortal(addButton, actionSlot) : null) : addButton}
      <Paper elevation={0} sx={{ mt: readOnly ? 0 : 2, border: 1, borderColor: "divider", overflow: "hidden" }}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            No accounts yet.
          </Typography>
        ) : (
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1240, userSelect: draggingId === null ? "auto" : "none" }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {column}
                  </TableCell>
                ))}
                {readOnly ? null : <TableCell />}
              </TableRow>
            </TableHead>
              <TableBody ref={bodyRef} onDragOver={readOnly ? undefined : dragOverRow} onDrop={readOnly ? undefined : dropRow}>
                {rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    draggable={readOnly ? undefined : !savingOrder}
                    onPointerDown={
                      readOnly
                        ? undefined
                        : (event) => {
                            if ((event.target as HTMLElement).closest("button, a, input, textarea")) return;
                            startDrag(event, index);
                          }
                    }
                    onPointerMove={readOnly ? undefined : moveDrag}
                    onPointerUp={readOnly ? undefined : endDrag}
                    onPointerCancel={readOnly ? undefined : cancelDrag}
                    onDragStart={readOnly ? undefined : startNativeDrag}
                    onDragEnd={
                      readOnly
                        ? undefined
                        : () => {
                            if (dragRef.current?.native) finishDrag();
                          }
                    }
                    sx={{
                      cursor: readOnly || savingOrder ? "default" : draggingId === row.id ? "grabbing" : "grab",
                      touchAction: readOnly ? undefined : "none",
                      bgcolor: draggingId === row.id ? "action.selected" : undefined,
                      "& .MuiButton-root": { cursor: "pointer" },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{row.account}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{row.nationality}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{row.status}</TableCell>
                    <TableCell>{row.hours}</TableCell>
                    <TableCell>{row.jobs}</TableCell>
                    <TableCell>{row.bids}</TableCell>
                    <TableCell>{row.interview}</TableCell>
                    <TableCell>{row.workInProgress}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>{row.note}</TableCell>
                    {readOnly ? null : (
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Button type="button" size="small" onClick={() => setEditing(row)} disabled={savingOrder}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          color="error"
                          onClick={() => setDeleting(row)}
                          disabled={savingOrder}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </TableContainer>
        )}
      </Paper>
      <Dialog open={adding} onClose={() => setAdding(false)} fullWidth maxWidth="sm">
        {adding ? (
          <AccountForm
            title="Add account"
            action={createAccount}
            onClose={() => setAdding(false)}
            onSaved={(account) => {
              setRows((current) => {
                const updated = [...current, account];
                rowsRef.current = updated;
                return updated;
              });
              setAdding(false);
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        {editing ? (
          <AccountForm
            title="Edit account"
            action={updateAccount}
            account={editing}
            onClose={() => setEditing(null)}
            onSaved={(account) => {
              setRows((current) => {
                const updated = current.map((row) => (row.id === account.id ? account : row));
                rowsRef.current = updated;
                return updated;
              });
              setEditing(null);
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} fullWidth maxWidth="xs">
        {deleting ? (
          <DeleteAccountForm
            account={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={(id) => {
              setRows((current) => {
                const updated = current.filter((row) => row.id !== id);
                rowsRef.current = updated;
                return updated;
              });
              setDeleting(null);
            }}
          />
        ) : null}
      </Dialog>
    </Box>
  );
}

function AccountForm({
  title,
  action,
  account,
  onClose,
  onSaved,
}: {
  title: string;
  action: (state: AccountActionState, formData: FormData) => Promise<AccountActionState>;
  account?: AccountRecord;
  onClose: () => void;
  onSaved: (account: AccountRecord) => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [accountName, setAccountName] = useState(account?.account ?? "");
  const [nationality, setNationality] = useState(account?.nationality ?? "");
  const [status, setStatus] = useState(account?.status ?? "");
  const [hours, setHours] = useState(account?.hours ?? "");
  const [jobs, setJobs] = useState(account?.jobs ?? "");
  const [bids, setBids] = useState(account?.bids ?? "");
  const [interview, setInterview] = useState(account?.interview ?? "");
  const [workInProgress, setWorkInProgress] = useState(account?.workInProgress ?? "");
  const [note, setNote] = useState(account?.note ?? "");
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.account) return;
    reported.current = state;
    onSaved(state.account);
  }, [state, onSaved]);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {account ? <input type="hidden" name="id" value={account.id} /> : null}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            pt: 1,
          }}
        >
          {state.error ? (
            <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
              {state.error}
            </Alert>
          ) : null}
          <TextField
            name="account"
            label="Account"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            required
            autoFocus
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <input type="hidden" name="nationality" value={nationality} />
          <Autocomplete
            options={
              nationality && !nationalities.includes(nationality) ? [nationality, ...nationalities] : nationalities
            }
            value={nationality || null}
            onChange={(_event, value) => setNationality(value ?? "")}
            autoHighlight
            openOnFocus
            fullWidth
            renderInput={(params) => <TextField {...params} label="Nationality" />}
          />
          <TextField
            name="status"
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            fullWidth
          />
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridColumn: "1 / -1",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            }}
          >
            <TextField name="hours" label="Hours" value={hours} onChange={(event) => setHours(event.target.value)} fullWidth />
            <TextField name="jobs" label="Jobs" value={jobs} onChange={(event) => setJobs(event.target.value)} fullWidth />
            <TextField name="bids" label="Bids" value={bids} onChange={(event) => setBids(event.target.value)} fullWidth />
            <TextField
              name="interview"
              label="Interview"
              value={interview}
              onChange={(event) => setInterview(event.target.value)}
              fullWidth
            />
          </Box>
          <TextField
            name="workInProgress"
            label="Work in progress"
            value={workInProgress}
            onChange={(event) => setWorkInProgress(event.target.value)}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            name="note"
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            fullWidth
            sx={{ gridColumn: "1 / -1" }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </form>
  );
}

function DeleteAccountForm({
  account,
  onClose,
  onDeleted,
}: {
  account: AccountRecord;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.deletedId) return;
    reported.current = state;
    onDeleted(state.deletedId);
  }, [state, onDeleted]);

  return (
    <form action={formAction}>
      <DialogTitle>Delete this account?</DialogTitle>
      <DialogContent>
        <input type="hidden" name="id" value={account.id} />
        <Stack spacing={2} useFlexGap>
          <Typography variant="body2" color="text.secondary">
            {`${account.account} will be removed.`}
          </Typography>
          {state.error ? <Alert severity="error">{state.error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" color="error" variant="contained" disabled={pending}>
          {pending ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </form>
  );
}
