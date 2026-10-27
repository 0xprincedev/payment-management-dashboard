"use client";

import {
  useActionState,
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
  createGroup,
  deleteGroup,
  renameGroup,
  reorderGroups,
  type GroupActionState,
  type GroupRecord,
} from "./actions";

const initialState: GroupActionState = {};

function moveRow(rows: GroupRecord[], from: number, to: number) {
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

export default function GroupsTable({ groups }: { groups: GroupRecord[] }) {
  const [rows, setRows] = useState(groups);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
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

  function rowsFor(ids: number[]) {
    const byId = new Map(rowsRef.current.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)!);
  }

  async function persistOrder(updated: GroupRecord[], previous: GroupRecord[]) {
    rowsRef.current = updated;
    setRows(updated);
    setSavingOrder(true);
    const result = await reorderGroups(updated.map((row) => row.id));
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
      <Button variant="contained" onClick={() => setCreating(true)}>
        Add group
      </Button>
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="xs">
        {creating ? (
          <CreateGroupForm
            onClose={() => setCreating(false)}
            onCreated={(group) => {
              const updated = [...rowsRef.current, group];
              rowsRef.current = updated;
              setRows(updated);
              setNotice({ severity: "success", text: "Group created." });
            }}
          />
        ) : null}
      </Dialog>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No groups yet.
        </Typography>
      ) : (
        <Paper elevation={0} sx={{ mt: 2, border: 1, borderColor: "divider", overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640, userSelect: draggingId === null ? "auto" : "none" }}>
              <TableHead>
                <TableRow>
                  {["No", "Name", "Members", "Widgets"].map((column) => (
                    <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {column}
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody ref={bodyRef} onDragOver={dragOverRow} onDrop={dropRow}>
                {rows.map((group, index) => (
                  <TableRow
                    key={group.id}
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
                      cursor: savingOrder ? "default" : draggingId === group.id ? "grabbing" : "grab",
                      touchAction: "none",
                      bgcolor: draggingId === group.id ? "action.selected" : undefined,
                      "& .MuiButton-root, & .MuiInputBase-root": { cursor: "pointer" },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{group.name}</TableCell>
                    <TableCell>{group.memberCount}</TableCell>
                    <TableCell>{group.widgetCount}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <GroupActions
                        group={group}
                        onRenamed={(name, message) => {
                          const updated = rowsRef.current.map((row) =>
                            row.id === group.id ? { ...row, name } : row,
                          );
                          rowsRef.current = updated;
                          setRows(updated);
                          setNotice({ severity: "success", text: message });
                        }}
                        onDeleted={() => {
                          const updated = rowsRef.current.filter((row) => row.id !== group.id);
                          rowsRef.current = updated;
                          setRows(updated);
                          setNotice({ severity: "success", text: "Group deleted." });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

function CreateGroupForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (group: GroupRecord) => void;
}) {
  const [state, formAction, pending] = useActionState(createGroup, initialState);
  const [name, setName] = useState("");
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.group) return;
    reported.current = state;
    onCreated(state.group);
    onClose();
  }, [state, onCreated, onClose]);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Add group</DialogTitle>
      <DialogContent sx={{ "&&": { overflow: "visible", paddingTop: "16px" } }}>
        {state.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        ) : null}
        <TextField
          name="name"
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          fullWidth
          disabled={pending}
          slotProps={{
            inputLabel: {
              sx: { bgcolor: "background.paper", px: 0.5 },
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" color="inherit" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Adding..." : "Add group"}
        </Button>
      </DialogActions>
    </form>
  );
}

function GroupActions({
  group,
  onRenamed,
  onDeleted,
}: {
  group: GroupRecord;
  onRenamed: (name: string, message: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      <Button type="button" size="small" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button type="button" size="small" color="error" onClick={() => setDeleting(true)}>
        Delete
      </Button>
      <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="xs">
        {editing ? (
          <RenameGroupForm
            group={group}
            onClose={() => setEditing(false)}
            onRenamed={onRenamed}
          />
        ) : null}
      </Dialog>
      <Dialog open={deleting} onClose={() => setDeleting(false)} fullWidth maxWidth="xs">
        {deleting ? (
          <DeleteGroupForm group={group} onClose={() => setDeleting(false)} onDeleted={onDeleted} />
        ) : null}
      </Dialog>
    </Box>
  );
}

function RenameGroupForm({
  group,
  onClose,
  onRenamed,
}: {
  group: GroupRecord;
  onClose: () => void;
  onRenamed: (name: string, message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(renameGroup, initialState);
  const [name, setName] = useState(group.name);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.name) return;
    reported.current = state;
    onRenamed(state.name, state.message ?? "Group name updated.");
    onClose();
  }, [state, onRenamed, onClose]);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Edit group name</DialogTitle>
      <DialogContent sx={{ "&&": { overflow: "visible", paddingTop: "16px" } }}>
        <input type="hidden" name="groupId" value={group.id} />
        {state.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        ) : null}
        <TextField
          name="name"
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          fullWidth
          disabled={pending}
          slotProps={{
            inputLabel: {
              sx: { bgcolor: "background.paper", px: 0.5 },
            },
          }}
        />
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

function DeleteGroupForm({
  group,
  onClose,
  onDeleted,
}: {
  group: GroupRecord;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteGroup, initialState);
  const reported = useRef(state);

  useEffect(() => {
    if (state === reported.current || !state.message) return;
    reported.current = state;
    onDeleted();
    onClose();
  }, [state, onDeleted, onClose]);

  return (
    <form action={formAction}>
      <DialogTitle>Delete this group?</DialogTitle>
      <DialogContent>
        <input type="hidden" name="groupId" value={group.id} />
        <Typography variant="body2" color="text.secondary">
          {`${group.name} will be removed.`}
        </Typography>
        {state.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" color="error" variant="contained" disabled={pending}>
          {pending ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </form>
  );
}
