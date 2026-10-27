"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { submitFormOnEnter } from "@/lib/submit-on-enter";
import { deleteWidget, renameWidget, type FormState } from "./actions";

const initialState: FormState = {};

export default function WidgetActions({
  widgetId,
  name,
  returnTo,
  compact = false,
}: {
  widgetId: number;
  name: string;
  returnTo: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Button type="button" size={compact ? "small" : "medium"} onClick={() => setEditing(true)}>
        Edit name
      </Button>
      <Button type="button" size={compact ? "small" : "medium"} color="error" onClick={() => setDeleting(true)}>
        Delete
      </Button>
      <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="xs">
        {editing ? (
          <RenameWidgetForm widgetId={widgetId} name={name} returnTo={returnTo} onClose={() => setEditing(false)} />
        ) : null}
      </Dialog>
      <Dialog open={deleting} onClose={() => setDeleting(false)} fullWidth maxWidth="xs">
        {deleting ? <DeleteWidgetForm widgetId={widgetId} name={name} onClose={() => setDeleting(false)} /> : null}
      </Dialog>
    </Box>
  );
}

function RenameWidgetForm({
  widgetId,
  name,
  returnTo,
  onClose,
}: {
  widgetId: number;
  name: string;
  returnTo: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(renameWidget, initialState);
  const [nextName, setNextName] = useState(name);

  return (
    <form action={formAction} noValidate onKeyDown={submitFormOnEnter}>
      <DialogTitle>Edit widget name</DialogTitle>
      <DialogContent sx={{ "&&": { overflow: "visible", paddingTop: "16px" } }}>
        <input type="hidden" name="widgetId" value={widgetId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {state.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        ) : null}
        <TextField
          name="name"
          label="Widget name"
          value={nextName}
          onChange={(event) => setNextName(event.target.value)}
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

function DeleteWidgetForm({
  widgetId,
  name,
  onClose,
}: {
  widgetId: number;
  name: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteWidget, initialState);

  return (
    <form action={formAction}>
      <DialogTitle>Delete this widget?</DialogTitle>
      <DialogContent>
        <input type="hidden" name="widgetId" value={widgetId} />
        {state.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          {`${name} and every payment in it will be removed.`}
        </Typography>
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
