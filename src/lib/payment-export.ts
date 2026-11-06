import "server-only";
import ExcelJS from "exceljs";
import { isAdmin, isAdminGroupName, isBoss } from "@/lib/access";
import { listAccountsByUsers } from "@/lib/accounts";
import type { AccountRecord } from "@/lib/account-record";
import { exportBasename, exportFilenameError, exportPasswordError } from "@/lib/export-filename";
import { listGroups } from "@/lib/groups";
import { internalColor, internalLightText } from "@/lib/internal-colors";
import { getWidget, listMemberPayments, listPayments, type PaymentRecord } from "@/lib/payments";
import type { CurrentUser } from "@/lib/session";
import { encryptXlsx } from "@/lib/xlsx-encrypt";

const headerFill = "D8D8D8";
const totalFill = "FF0000";
const paperFill = "FFFFFF";
const columns = ["Name", "Project", "Account", "Date", "Amount", "Note"] as const;
const accountColumns = [
  "Name",
  "Platform",
  "Account",
  "Nationality",
  "Status",
  "Created At",
  "Machine",
  "Project",
  "Available",
  "Pending",
  "Note",
] as const;
const accountWidths = [14, 18, 36, 14, 14, 14, 16, 22, 14, 14, 40];
const grid = { style: "thin" as const, color: { argb: "FF000000" } };
const border = { top: grid, left: grid, bottom: grid, right: grid };
const font = { name: "Calibri", size: 12, color: { theme: 1 } };
const centered = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };

type Section = { id: number; name: string; nickname: string; payments: PaymentRecord[] };

export type ExportRequest = {
  filename: string;
  password: string;
  includeAccounts: boolean;
};

export async function createPaymentExport(user: CurrentUser, widgetId: number, request: ExportRequest) {
  const filenameError = exportFilenameError(request.filename);
  if (filenameError) return { error: filenameError };
  const passwordError = exportPasswordError(request.password);
  if (passwordError) return { error: passwordError };

  const basename = exportBasename(request.filename);
  if (!basename) return { error: "Choose a different filename." };

  const widget = await getWidget(widgetId, isAdmin(user.role) ? null : user.groupId);
  if (!widget) return { error: "That payment widget was not found." };

  const sections: Section[] =
    isBoss(user.role) || isAdmin(user.role)
      ? await listMemberPayments(widget.id, widget.groupId)
      : [{ id: user.id, name: user.name, nickname: user.nickname, payments: await listPayments(widget.id, user) }];
  const groups = await listGroups();
  const plain = await workbookBuffer(
    sections,
    request.includeAccounts,
    widget.groupId,
    groups,
    isBoss(user.role),
    isAdmin(user.role),
  );
  const encrypted = encryptXlsx(plain, request.password);

  return {
    bytes: new Uint8Array(encrypted),
    downloadName: `${basename}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

function amountNumber(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function excelDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function solid(hex: string): ExcelJS.Fill {
  const argb = `FF${hex}`;
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
    bgColor: { argb },
  };
}

function paint(cell: ExcelJS.Cell, fill?: string, lightText = false) {
  cell.font = lightText ? { ...font, color: { argb: "FFFFFFFF" } } : font;
  cell.alignment = centered;
  cell.border = border;
  cell.fill = fill ? solid(fill) : { type: "pattern", pattern: "none" };
}

function paymentNote(payment: PaymentRecord) {
  if (payment.kind === "bank") return payment.note;
  return payment.memberNickname;
}

async function workbookBuffer(
  sections: Section[],
  includeAccounts: boolean,
  ownGroupId: number,
  groups: { id: number; name: string }[],
  groupScore: boolean,
  scoreEachMember: boolean,
) {
  const workbook = new ExcelJS.Workbook();
  const transactions = workbook.addWorksheet("Transactions");
  columns.forEach((header, index) => {
    const cell = transactions.getCell(1, index + 1);
    cell.value = header;
    paint(cell, headerFill);
  });
  transactions.getRow(1).height = 15.75;

  let rowNumber = 2;
  const memberTotalRows: number[] = [];
  sections.forEach((section, index) => {
    const written = writeMember(transactions, section, rowNumber, ownGroupId, groups, scoreEachMember);
    memberTotalRows.push(written.totalRow);
    rowNumber = written.nextRow;
    if (index === sections.length - 1) return;
    transactions.getRow(rowNumber).height = 15.75;
    transactions.getRow(rowNumber + 1).height = 15.75;
    rowNumber += 2;
  });

  if (groupScore) {
    writeGroupScore(
      transactions,
      sections.flatMap((section) => section.payments),
      groups,
      ownGroupId,
      memberTotalRows,
    );
  }

  transactions.getColumn(1).width = 13.28515625;
  transactions.getColumn(2).width = 45.140625;
  transactions.getColumn(3).width = 42.42578125;
  transactions.getColumn(4).width = 13.28515625;
  transactions.getColumn(5).width = 25.140625;
  transactions.getColumn(6).width = 47.140625;
  if (groupScore) {
    transactions.getColumn(7).width = 3;
    transactions.getColumn(8).width = 18;
    transactions.getColumn(9).width = 16;
  }

  if (includeAccounts) {
    const accounts = await listAccountsByUsers(sections.map((section) => section.id));
    writeAccounts(workbook, sections, accounts);
  }

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

function cellText(value: string | null) {
  const text = value?.trim() ?? "";
  return text || null;
}

function nationalityText(value: string) {
  const text = value.trim();
  if (text.localeCompare("United States", undefined, { sensitivity: "accent" }) === 0) return "US";
  return text || null;
}

function writeAccounts(
  workbook: ExcelJS.Workbook,
  sections: Section[],
  accountsByUser: Map<number, AccountRecord[]>,
) {
  const sheet = workbook.addWorksheet("Accounts");
  accountColumns.forEach((header, index) => {
    const cell = sheet.getCell(1, index + 1);
    cell.value = header;
    paint(cell, headerFill);
  });
  sheet.getRow(1).height = 18.75;

  let rowNumber = 2;
  for (const section of sections) {
    const accounts = accountsByUser.get(section.id) ?? [];
    if (accounts.length === 0) continue;
    const firstRow = rowNumber;
    for (const account of accounts) {
      const values = [
        null,
        cellText(account.platform),
        cellText(account.account),
        nationalityText(account.nationality),
        cellText(account.status),
        account.createdAt ? excelDate(account.createdAt) : null,
        cellText(account.machine),
        cellText(account.project),
        account.availableCents == null ? null : amountNumber(account.availableCents),
        account.pendingCents == null ? null : amountNumber(account.pendingCents),
        cellText(account.note),
      ];
      values.forEach((value, index) => {
        const cell = sheet.getCell(rowNumber, index + 1);
        cell.value = value;
        if (index === 5 && value instanceof Date) cell.numFmt = "mm/dd/yyyy";
        paint(cell);
      });
      sheet.getRow(rowNumber).height = 18.75;
      rowNumber += 1;
    }
    const name = sheet.getCell(firstRow, 1);
    name.value = section.name;
    paint(name);
    if (accounts.length > 1) sheet.mergeCells(firstRow, 1, rowNumber - 1, 1);
  }

  accountWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function summaryRows(payments: PaymentRecord[]) {
  const rows: PaymentRecord[] = [];
  const internalByPerson = new Map<string, PaymentRecord>();

  for (const payment of payments) {
    if (payment.kind === "bank") {
      rows.push(payment);
      continue;
    }

    const personKey = payment.memberId == null ? `name:${payment.memberNickname}` : `id:${payment.memberId}`;
    const existing = internalByPerson.get(personKey);
    if (existing) {
      existing.amountCents += payment.amountCents;
      continue;
    }

    const summary: PaymentRecord = {
      ...payment,
      info: "",
      account: "",
      paidOn: "",
      note: payment.memberNickname,
    };
    internalByPerson.set(personKey, summary);
    rows.push(summary);
  }

  return rows;
}

type ScoreLine = {
  label: string;
  cents: number;
  fill: string;
  amountFill?: string;
  lightText: boolean;
};

function scoreLines(payments: PaymentRecord[], groups: { id: number; name: string }[], ownGroupId: number) {
  const byGroup = new Map<number, number>();
  let bankCents = 0;
  for (const payment of payments) {
    if (payment.kind === "bank") {
      bankCents += payment.amountCents;
      continue;
    }
    byGroup.set(payment.memberGroupId, (byGroup.get(payment.memberGroupId) ?? 0) + payment.amountCents);
  }

  const lines: ScoreLine[] = [
    { label: "Bank transfer", cents: bankCents, fill: headerFill, amountFill: paperFill, lightText: false },
  ];
  for (const group of groups) {
    if (isAdminGroupName(group.name)) continue;
    const fill = internalColor(group.id, ownGroupId);
    lines.push({
      label: group.name,
      cents: byGroup.get(group.id) ?? 0,
      fill,
      lightText: internalLightText(group.id, ownGroupId),
    });
  }
  return lines;
}

function writeScoreLine(sheet: ExcelJS.Worksheet, rowNumber: number, line: ScoreLine) {
  const label = sheet.getCell(rowNumber, 2);
  label.value = line.label;
  paint(label, line.fill, line.lightText);
  sheet.mergeCells(rowNumber, 2, rowNumber, 4);

  const amount = sheet.getCell(rowNumber, 5);
  amount.value = amountNumber(line.cents);
  paint(amount, line.amountFill ?? line.fill, line.lightText);
  paint(sheet.getCell(rowNumber, 6), line.amountFill ?? line.fill, line.lightText);
  sheet.getRow(rowNumber).height = 15.75;
}

function writeGroupScore(
  sheet: ExcelJS.Worksheet,
  payments: PaymentRecord[],
  groups: { id: number; name: string }[],
  ownGroupId: number,
  memberTotalRows: number[],
) {
  const lines = scoreLines(payments, groups, ownGroupId);
  lines.forEach((line, index) => {
    const rowNumber = 2 + index;
    const label = sheet.getCell(rowNumber, 8);
    label.value = line.label;
    paint(label, line.fill, line.lightText);
    const amount = sheet.getCell(rowNumber, 9);
    amount.value = amountNumber(line.cents);
    paint(amount, line.amountFill ?? line.fill, line.lightText);
    sheet.getRow(rowNumber).height = 15.75;
  });

  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const totalRow = 2 + lines.length;
  const label = sheet.getCell(totalRow, 8);
  label.value = "Total score";
  paint(label, headerFill);
  const amount = sheet.getCell(totalRow, 9);
  amount.value = memberTotalRows.length
    ? { formula: `SUM(${memberTotalRows.map((row) => `E${row}`).join(",")})`, result: amountNumber(totalCents) }
    : 0;
  paint(amount, totalFill);
  sheet.getRow(totalRow).height = 15.75;
}

function writeMember(
  sheet: ExcelJS.Worksheet,
  section: Section,
  totalRow: number,
  ownGroupId: number,
  groups: { id: number; name: string }[],
  scoreEachMember: boolean,
) {
  const payments = section.payments;
  const rows = summaryRows(payments);
  const lines = scoreEachMember ? scoreLines(payments, groups, ownGroupId) : [];
  const totalScoreRow = totalRow + lines.length;
  const firstPaymentRow = totalScoreRow + 1;
  const lastRow = rows.length > 0 ? firstPaymentRow + rows.length - 1 : totalScoreRow;

  const name = sheet.getCell(totalRow, 1);
  name.value = section.name;
  paint(name);
  if (lastRow > totalRow) sheet.mergeCells(totalRow, 1, lastRow, 1);

  lines.forEach((line, index) => writeScoreLine(sheet, totalRow + index, line));

  const label = sheet.getCell(totalScoreRow, 2);
  label.value = scoreEachMember ? "Total score" : "Total Amount";
  paint(label, headerFill);
  sheet.mergeCells(totalScoreRow, 2, totalScoreRow, 4);

  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const cost = sheet.getCell(totalScoreRow, 5);
  cost.value = rows.length
    ? { formula: `SUM(E${firstPaymentRow}:E${lastRow})`, result: amountNumber(totalCents) }
    : 0;
  paint(cost, totalFill);
  paint(sheet.getCell(totalScoreRow, 6));
  sheet.getRow(totalScoreRow).height = 15.75;

  rows.forEach((payment, index) => {
    const rowNumber = firstPaymentRow + index;
    const internal = payment.kind === "internal";
    const fill = internal ? internalColor(payment.memberGroupId, ownGroupId) : paperFill;
    const lightText = internal && internalLightText(payment.memberGroupId, ownGroupId);
    const values: Array<string | number | Date | null> = [
      null,
      payment.kind === "bank" ? payment.info : null,
      payment.kind === "bank" ? payment.account : null,
      payment.paidOn ? excelDate(payment.paidOn) : null,
      amountNumber(payment.amountCents),
      paymentNote(payment),
    ];
    values.forEach((value, column) => {
      const cell = sheet.getCell(rowNumber, column + 1);
      if (column === 0) return;
      cell.value = value;
      if (column === 3 && value instanceof Date) cell.numFmt = "mm/dd/yyyy";
      paint(cell, fill, lightText);
    });
    sheet.getRow(rowNumber).height = 15.75;
  });

  return { totalRow: totalScoreRow, nextRow: lastRow + 1 };
}

