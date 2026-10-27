"use client";

import { useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Snackbar from "@mui/material/Snackbar";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { formatAmount } from "@/lib/amount";
import { internalColor } from "@/lib/internal-colors";
import { loadGroupTransactions, type GroupTransaction, type GroupTransactions } from "./actions";

type GroupTile = {
  groupId: number;
  name: string;
  amountCents: number;
};

type TransactionView = "all" | "mine" | "target";

function formatPaidOn(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export default function GroupTransactions({
  widgetId,
  ownGroupId,
  groups,
}: {
  widgetId: number;
  ownGroupId: number;
  groups: GroupTile[];
}) {
  const requestId = useRef(0);
  const [selected, setSelected] = useState<GroupTile | null>(null);
  const [details, setDetails] = useState<GroupTransactions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TransactionView>("all");
  const [notice, setNotice] = useState(false);

  async function openGroup(group: GroupTile) {
    const current = requestId.current + 1;
    requestId.current = current;
    setView("all");
    setSelected(group);
    setDetails(null);
    setError(null);
    const result = await loadGroupTransactions(widgetId, group.groupId);
    if (requestId.current !== current) return;
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDetails(result);
  }

  function close() {
    requestId.current += 1;
    setView("all");
    setSelected(null);
    setDetails(null);
    setError(null);
  }

  return (
    <>
      <Box sx={{ mt: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}
        >
          Internal transactions
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.75, minWidth: 0, overflowX: "auto", pb: 0.25 }}>
          {groups.map((group) => {
            const tile = {
              flex: "1 0 112px",
              maxWidth: 168,
              px: 1.5,
              py: 1.1,
              borderRadius: "12px",
              bgcolor: `#${internalColor(group.groupId, ownGroupId)}`,
              color: "#172026",
              textAlign: "left",
            } as const;
            const body = (
              <>
                <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{group.name}</Typography>
                <Typography sx={{ mt: 0.35, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                  {formatAmount(group.amountCents)}
                </Typography>
              </>
            );
            if (group.groupId === ownGroupId) {
              return (
                <Box key={group.groupId} sx={tile}>
                  {body}
                </Box>
              );
            }
            return (
              <Box
                key={group.groupId}
                component="button"
                type="button"
                aria-label={`${group.name} transactions`}
                onClick={() => void openGroup(group)}
                sx={{
                  ...tile,
                  border: 0,
                  font: "inherit",
                  cursor: "pointer",
                  "&:hover": { filter: "brightness(0.96)" },
                  "&:focus-visible": { outline: "2px solid #172026", outlineOffset: 2 },
                }}
              >
                {body}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Dialog open={selected !== null} onClose={close} fullWidth maxWidth="sm" scroll="paper">
        {selected ? (
          <>
            <DialogTitle sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "18px", pb: 0 }}>
              <Box sx={{ pr: 6 }}>{selected.name}</Box>
              {details && details.rows.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography component="span" sx={{ fontWeight: 700 }}>
                    {money(details.totalCents)}
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={view}
                    onChange={(_event, value: TransactionView | null) => {
                      if (value) setView(value);
                    }}
                    aria-label="Transaction grouping"
                    sx={viewSwitchSx}
                  >
                    <ToggleButton value="all" type="button">
                      All
                    </ToggleButton>
                    <ToggleButton value="mine" type="button">
                      My members
                    </ToggleButton>
                    <ToggleButton value="target" type="button">
                      Target members
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              ) : null}
            </DialogTitle>
            <IconButton aria-label="Close" onClick={close} sx={{ position: "absolute", top: 8, right: 8 }}>
              <CloseIcon />
            </IconButton>
            <DialogContent sx={{ "&&": { paddingTop: "8px" } }}>
              {error ? (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              ) : details ? (
                <TransactionTable rows={details.rows} view={view} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading transactions…
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ContentCopyOutlinedIcon />}
                disabled={!details || details.rows.length === 0}
                onClick={() => setNotice(true)}
              >
                Copy
              </Button>
              <Button type="button" onClick={close}>
                Close
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
      <Snackbar
        open={notice}
        autoHideDuration={4000}
        onClose={() => setNotice(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" variant="filled" onClose={() => setNotice(false)}>
          Ongoing development and nothing copied
        </Alert>
      </Snackbar>
    </>
  );
}

const viewSwitchSx = {
  p: 0.25,
  bgcolor: "action.hover",
  borderRadius: "999px",
  "& .MuiToggleButtonGroup-grouped": {
    border: 0,
    borderRadius: "999px !important",
    mx: 0,
    px: 1.5,
    py: 0.6,
    textTransform: "none",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "text.secondary",
    "&.Mui-selected": {
      bgcolor: "primary.main",
      color: "primary.contrastText",
      "&:hover": { bgcolor: "primary.main" },
    },
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

function TransactionTable({ rows, view }: { rows: GroupTransaction[]; view: TransactionView }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No transactions.
      </Typography>
    );
  }

  return view === "all" ? <FlatTable rows={rows} /> : <GroupedTables rows={rows} by={view} />;
}

function FlatTable({ rows }: { rows: GroupTransaction[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Member", "Date", "Amount", "Note"].map((column) => (
              <AmountHeading key={column} column={column} />
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{row.member}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{formatPaidOn(row.paidOn)}</TableCell>
              <AmountCell cents={row.amountCents} />
              <TableCell>{row.note || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function GroupedTables({ rows, by }: { rows: GroupTransaction[]; by: "mine" | "target" }) {
  const sections = groupRows(rows, by === "mine" ? "member" : "note");
  const columns = by === "mine" ? ["Date", "Amount", "Note"] : ["Member", "Date", "Amount"];

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {sections.map((section) => (
        <Box key={section.name}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {section.name}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              {formatAmount(section.totalCents)}
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <AmountHeading key={column} column={column} />
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {section.rows.map((row) => (
                  <TableRow key={row.id}>
                    {by === "target" ? <TableCell sx={{ whiteSpace: "nowrap" }}>{row.member}</TableCell> : null}
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatPaidOn(row.paidOn)}</TableCell>
                    <AmountCell cents={row.amountCents} />
                    {by === "mine" ? <TableCell>{row.note || "—"}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}

function groupRows(rows: GroupTransaction[], key: "member" | "note") {
  const sections = new Map<string, { name: string; rows: GroupTransaction[]; totalCents: number }>();
  for (const row of rows) {
    const name = (key === "member" ? row.member : row.note).trim() || "—";
    const id = name.toLocaleLowerCase();
    const section = sections.get(id);
    if (section) {
      section.rows.push(row);
      section.totalCents += row.amountCents;
      continue;
    }
    sections.set(id, { name, rows: [row], totalCents: row.amountCents });
  }

  return [...sections.values()]
    .map((section) => ({
      ...section,
      rows: [...section.rows].sort((a, b) =>
        key === "note"
          ? a.memberSort - b.memberSort || a.paidOn.localeCompare(b.paidOn) || a.id - b.id
          : a.paidOn.localeCompare(b.paidOn) || a.id - b.id,
      ),
    }))
    .sort((a, b) =>
      key === "member"
        ? a.rows[0].memberSort - b.rows[0].memberSort || a.rows[0].id - b.rows[0].id
        : a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

function money(cents: number) {
  return `${cents < 0 ? "-" : ""}$${formatAmount(Math.abs(cents))}`;
}

function AmountHeading({ column }: { column: string }) {
  return (
    <TableCell align={column === "Amount" ? "right" : "left"} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
      {column}
    </TableCell>
  );
}

function AmountCell({ cents }: { cents: number }) {
  return (
    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
      {formatAmount(cents)}
    </TableCell>
  );
}
