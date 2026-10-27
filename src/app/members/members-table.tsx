"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import {
  deleteMemberAccount,
  reorderGroupMembers,
  updateMemberEmail,
  updateMemberPassword,
  type MemberActionState,
} from "./actions";
import MemberStatusField from "./member-status-field";

export type MemberRow = {
  id: number;
  name: string;
  nickname: string;
  email: string;
  role: "Admin" | "Boss" | "Member";
  status: "Approved" | "Pending" | "Rejected";
};

const initialState: MemberActionState = {};

function moveRow(rows: MemberRow[], from: number, to: number) {
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

export default function MembersTable({
  members,
  selfId,
}: {
  members: MemberRow[];
  selfId: number;
}) {
  const [rows, setRows] = useState(members);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const rowsRef = useRef(rows);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    index: number;
    startIds: number[];
    native: boolean;
  } | null>(null);
  rowsRef.current = rows;
  const report = useCallback((result: MemberActionState) => {
    if (result.message) setNotice({ severity: "success", text: result.message });
    else if (result.error) setNotice({ severity: "error", text: result.error });
  }, []);

  function rowsFor(ids: number[]) {
    const byId = new Map(rowsRef.current.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)!);
  }

  async function persistOrder(updated: MemberRow[], previous: MemberRow[]) {
    rowsRef.current = updated;
    setRows(updated);
    setSavingOrder(true);
    const result = await reorderGroupMembers(updated.map((row) => row.id));
    if (result.error) {
      rowsRef.current = previous;
      setRows(previous);
      setNotice({ severity: "error", text: result.error });
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

  return (
    <Box sx={{ mt: 3 }}>
      {notice ? (
        <Alert severity={notice.severity} sx={{ mb: 2 }}>
          {notice.text}
        </Alert>
      ) : null}
      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 980, userSelect: draggingId === null ? "auto" : "none" }}>
            <TableHead>
              <TableRow>
                {["No", "Name", "Nickname", "Email", "Role", "Status"].map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {column}
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody ref={bodyRef} onDragOver={dragOverRow} onDrop={dropRow}>
              {rows.map((member, index) => (
                <TableRow
                  key={member.id}
                  draggable={!savingOrder}
                  onPointerDown={(event) => {
                    if (
                      (event.target as HTMLElement).closest(
                        "button, a, input, textarea, select, [role='combobox'], [role='button'], .MuiInputBase-root",
                      )
                    ) {
                      return;
                    }
                    startDrag(event, index);
                  }}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={cancelDrag}
                  onDragStart={startNativeDrag}
                  onDragEnd={() => {
                    if (dragRef.current?.native) finishDrag();
                  }}
                  sx={{
                    cursor: savingOrder ? "default" : draggingId === member.id ? "grabbing" : "grab",
                    touchAction: "none",
                    bgcolor: draggingId === member.id ? "action.selected" : undefined,
                    "& .MuiButton-root, & .MuiInputBase-root": { cursor: "pointer" },
                  }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{index + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{member.name}</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{member.nickname}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{member.role}</TableCell>
                  <TableCell>
                    {member.id === selfId ? (
                      <Typography variant="body2">{member.status}</Typography>
                    ) : (
                      <MemberStatusField
                        userId={member.id}
                        nickname={member.nickname}
                        status={member.status}
                        onResult={(result) => {
                          report(result);
                          if (!result.status) return;
                          setRows((current) =>
                            current.map((row) =>
                              row.id === member.id ? { ...row, status: result.status! } : row,
                            ),
                          );
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <AccountActions
                      member={member}
                      onEmail={(email) => {
                        setRows((current) =>
                          current.map((row) => (row.id === member.id ? { ...row, email } : row)),
                        );
                        setNotice({ severity: "success", text: "Email updated." });
                      }}
                      onPassword={() => setNotice({ severity: "success", text: "Password updated." })}
                      onDeleted={() => {
                        setRows((current) => current.filter((row) => row.id !== member.id));
                        setNotice({ severity: "success", text: "Account deleted." });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function AccountActions({
  member,
  onEmail,
  onPassword,
  onDeleted,
}: {
  member: MemberRow;
  onEmail: (email: string) => void;
  onPassword: () => void;
  onDeleted: () => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      <Button type="button" size="small" onClick={() => setEmailOpen(true)}>
        Email
      </Button>
      <Button type="button" size="small" onClick={() => setPasswordOpen(true)}>
        Password
      </Button>
      <Button type="button" size="small" color="error" onClick={() => setDeleteOpen(true)}>
        Delete
      </Button>
      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} fullWidth maxWidth="xs">
        {emailOpen ? (
          <EmailForm
            member={member}
            onClose={() => setEmailOpen(false)}
            onSaved={onEmail}
          />
        ) : null}
      </Dialog>
      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs">
        {passwordOpen ? (
          <PasswordForm
            member={member}
            onClose={() => setPasswordOpen(false)}
            onSaved={onPassword}
          />
        ) : null}
      </Dialog>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        {deleteOpen ? (
          <DeleteForm
            member={member}
            onClose={() => setDeleteOpen(false)}
            onDeleted={onDeleted}
          />
        ) : null}
      </Dialog>
    </Box>
  );
}

function EmailForm({
  member,
  onClose,
  onSaved,
}: {
  member: MemberRow;
  onClose: () => void;
  onSaved: (email: string) => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberEmail, initialState);
  const [email, setEmail] = useState(member.email);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.email) return;
    reported.current = state;
    onSaved(state.email);
    onClose();
  }, [state, onSaved, onClose]);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Change email</DialogTitle>
      <DialogContent>
        <input type="hidden" name="userId" value={member.id} />
        <Stack spacing={2} useFlexGap sx={{ pt: 1 }}>
          {state.error ? <Alert severity="error">{state.error}</Alert> : null}
          <TextField
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
            fullWidth
          />
        </Stack>
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

function PasswordForm({
  member,
  onClose,
  onSaved,
}: {
  member: MemberRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberPassword, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.message) return;
    reported.current = state;
    onSaved();
    onClose();
  }, [state, onSaved, onClose]);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <input type="hidden" name="userId" value={member.id} />
        <Stack spacing={2} useFlexGap sx={{ pt: 1 }}>
          {state.error ? <Alert severity="error">{state.error}</Alert> : null}
          <TextField
            name="password"
            label="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            name="confirmPassword"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            fullWidth
          />
        </Stack>
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

function DeleteForm({
  member,
  onClose,
  onDeleted,
}: {
  member: MemberRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteMemberAccount, initialState);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.message) return;
    reported.current = state;
    onDeleted();
    onClose();
  }, [state, onDeleted, onClose]);

  return (
    <form action={formAction}>
      <DialogTitle>Delete this account?</DialogTitle>
      <DialogContent>
        <input type="hidden" name="userId" value={member.id} />
        <Typography variant="body2" color="text.secondary">
          {`${member.nickname}'s account will be removed.`}
        </Typography>
        {state.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.error}
          </Alert>
        ) : null}
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
