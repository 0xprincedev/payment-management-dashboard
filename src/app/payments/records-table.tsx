"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { formatAmount, formatAmountInput } from "@/lib/amount";
import { internalColor, internalLightText } from "@/lib/internal-colors";
import type { PaymentMember } from "./add-payment-dialog";
import PaymentRowActions from "./payment-row-actions";

export type RecordRow = {
  id: number;
  kind: "bank" | "internal";
  info: string;
  account: string;
  memberId: number | null;
  memberNickname: string;
  memberGroupId: number;
  memberGroupName: string;
  paidOn: string;
  amountCents: number;
  note: string;
};

function formatPaidOn(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function rowColor(kind: "bank" | "internal", groupId: number, ownGroupId: number) {
  if (kind === "bank") return "background.paper";
  return `#${internalColor(groupId, ownGroupId)}`;
}

function rowTextColor(kind: "bank" | "internal", groupId: number, ownGroupId: number) {
  if (kind !== "internal") return "text.primary";
  return internalLightText(groupId, ownGroupId) ? "#fff" : "#172026";
}

type SummaryRow = {
  key: string;
  nickname: string;
  groupId: number;
  amountCents: number;
};

type ShownRow = { key: string; payment: RecordRow } | SummaryRow;

function shownRows(payments: RecordRow[], detailed: boolean): ShownRow[] {
  const rows: ShownRow[] = [];
  const internalByPerson = new Map<string, SummaryRow>();

  for (const payment of payments) {
    if (payment.kind === "bank" || detailed) {
      rows.push({ key: `payment-${payment.id}`, payment });
      continue;
    }

    const personKey = payment.memberId == null ? `name:${payment.memberNickname}` : `id:${payment.memberId}`;
    const existing = internalByPerson.get(personKey);
    if (existing) {
      existing.amountCents += payment.amountCents;
      continue;
    }

    const summary: SummaryRow = {
      key: `internal-${personKey}`,
      nickname: payment.memberNickname.trim() || "Internal transaction",
      groupId: payment.memberGroupId,
      amountCents: payment.amountCents,
    };
    internalByPerson.set(personKey, summary);
    rows.push(summary);
  }

  return rows;
}

function isPaymentRow(row: ShownRow): row is { key: string; payment: RecordRow } {
  return "payment" in row;
}

function ActionSpacer() {
  return (
    <Box aria-hidden sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, visibility: "hidden" }}>
      <Button type="button" size="small" tabIndex={-1}>
        Edit
      </Button>
      <Button type="button" size="small" tabIndex={-1}>
        Delete
      </Button>
    </Box>
  );
}

export default function RecordsTable({
  payments,
  members,
  ownGroupId,
  readOnly = false,
  topMargin = 3,
}: {
  payments: RecordRow[];
  members: PaymentMember[];
  ownGroupId: number;
  readOnly?: boolean;
  topMargin?: number;
}) {
  const [detailed, setDetailed] = useState(true);
  const columns = ["No", "Info", "Account", "Date", "Amount", "Note"];
  const rows = shownRows(payments, detailed);
  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const bankCents = payments.reduce(
    (sum, payment) => sum + (payment.kind === "bank" ? payment.amountCents : 0),
    0,
  );

  return (
    <Paper elevation={0} sx={{ mt: topMargin, border: 1, borderColor: "divider", overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        <Box>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {`${totalCents < 0 ? "-" : ""}$${formatAmount(Math.abs(totalCents))}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bank transactions {formatAmount(bankCents)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {payments.some((payment) => payment.kind === "internal") ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={detailed ? "detailed" : "summary"}
              onChange={(_event, value: "summary" | "detailed" | null) => {
                if (value) setDetailed(value === "detailed");
              }}
              aria-label="Internal transaction detail"
              sx={{
                alignSelf: "flex-start",
                p: 0.25,
                bgcolor: "action.hover",
                borderRadius: "999px",
                "& .MuiToggleButtonGroup-grouped": {
                  border: 0,
                  borderRadius: "999px !important",
                  mx: 0,
                  px: 1.75,
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
              }}
            >
              <ToggleButton value="summary" type="button">
                Summary
              </ToggleButton>
              <ToggleButton value="detailed" type="button">
                Detailed
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null}
        </Box>
      </Box>
      {payments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          No payments yet.
        </Typography>
      ) : (
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    align={column === "Amount" ? "right" : "left"}
                    sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {column}
                  </TableCell>
                ))}
                {readOnly ? null : <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const number = index + 1;
                if (!isPaymentRow(row)) {
                  const background = rowColor("internal", row.groupId, ownGroupId);
                  return (
                    <TableRow
                      key={row.key}
                      sx={{
                        bgcolor: background,
                        "& > td": {
                          bgcolor: background,
                          color: rowTextColor("internal", row.groupId, ownGroupId),
                          borderColor: "divider",
                        },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{number}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {formatAmount(row.amountCents)}
                      </TableCell>
                      <TableCell>{row.nickname}</TableCell>
                      {readOnly ? null : (
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <ActionSpacer />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                }

                const payment = row.payment;
                const background = rowColor(payment.kind, payment.memberGroupId, ownGroupId);
                return (
                  <TableRow
                    key={row.key}
                    sx={{
                      bgcolor: background,
                      "& > td": {
                        bgcolor: background,
                        color: rowTextColor(payment.kind, payment.memberGroupId, ownGroupId),
                        borderColor: "divider",
                      },
                    }}
                    >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{number}</TableCell>
                    <TableCell>{payment.kind === "bank" ? payment.info : "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {payment.kind === "bank" ? payment.account : "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatPaidOn(payment.paidOn)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {formatAmount(payment.amountCents)}
                    </TableCell>
                    <TableCell>
                      {payment.kind === "bank" ? payment.note || "—" : payment.memberNickname}
                    </TableCell>
                    {readOnly ? null : (
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <PaymentRowActions
                          payment={{
                            id: payment.id,
                            kind: payment.kind,
                            info: payment.info,
                            account: payment.account,
                            memberId: payment.memberId,
                            paidOn: payment.paidOn,
                            amount: formatAmountInput(payment.amountCents),
                            note: payment.note,
                          }}
                          members={members}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
