"use client";

import { useState, type FormEvent } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { exportFilenameError, exportPasswordError, suggestedExportFilename } from "@/lib/export-filename";
import { submitFormOnEnter } from "@/lib/submit-on-enter";

export default function ExportDialog({
  widgetId,
  defaultFilename,
  size = "medium",
}: {
  widgetId: number;
  defaultFilename: string;
  size?: "small" | "medium";
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        size={size}
        startIcon={<FileDownloadOutlinedIcon />}
        onClick={() => setOpen(true)}
      >
        Export
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        {open ? (
          <ExportForm
            widgetId={widgetId}
            defaultFilename={suggestedExportFilename(defaultFilename)}
            pending={pending}
            setPending={setPending}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

function ExportForm({
  widgetId,
  defaultFilename,
  pending,
  setPending,
  onClose,
}: {
  widgetId: number;
  defaultFilename: string;
  pending: boolean;
  setPending: (pending: boolean) => void;
  onClose: () => void;
}) {
  const [filename, setFilename] = useState(defaultFilename);
  const [password, setPassword] = useState("");
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filenameError = exportFilenameError(filename);
    if (filenameError) {
      setError(filenameError);
      return;
    }
    const passwordError = exportPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/payments/${widgetId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, password, includeAccounts }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "The export could not be created.");
        return;
      }

      const blob = await response.blob();
      const header = response.headers.get("Content-Disposition") ?? "";
      const encoded = /filename\*=UTF-8''([^;]+)/.exec(header)?.[1];
      const plain = /filename="([^"]+)"/.exec(header)?.[1];
      const downloadName = encoded ? decodeURIComponent(encoded) : plain || defaultFilename;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("The export could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} onKeyDown={submitFormOnEnter}>
      <DialogTitle>Export</DialogTitle>
      <DialogContent>
        <Stack spacing={2} useFlexGap sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            required
            autoFocus
            disabled={pending}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
            disabled={pending}
            helperText="Excel asks for this password when the file opens."
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeAccounts}
                onChange={(event) => setIncludeAccounts(event.target.checked)}
                disabled={pending}
              />
            }
            label="Include accounts tab"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" color="inherit" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Exporting..." : "Export"}
        </Button>
      </DialogActions>
    </form>
  );
}
