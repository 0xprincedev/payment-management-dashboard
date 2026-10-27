import "server-only";
import ExcelJS from "exceljs";
import { listAccountsByUsers } from "@/lib/accounts";
import type { AccountRecord } from "@/lib/account-record";
import { exportBasename, exportFilenameError, exportPasswordError } from "@/lib/export-filename";
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
  "Account",
  "Nationality",
  "Status",
  "Hours",
  "Jobs",
  "Bids",
  "Interviews",
  "Work In Progress",
  "Note",
] as const;
const accountWidths = [
  12.85546875, 52.140625, 11.140625, 15, 7.42578125, 7.42578125, 7.42578125, 10.5703125, 61.42578125, 47,
];
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

  const widget = await getWidget(widgetId, user.groupId);
  if (!widget) return { error: "That payment widget was not found." };

  const sections: Section[] =
    user.role === "Boss"
      ? await listMemberPayments(widget.id, user)
      : [{ id: user.id, name: user.name, nickname: user.nickname, payments: await listPayments(widget.id, user) }];
  const plain = await workbookBuffer(sections, request.includeAccounts, user.groupId);
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

async function workbookBuffer(sections: Section[], includeAccounts: boolean, ownGroupId: number) {
  const workbook = new ExcelJS.Workbook();
  const transactions = workbook.addWorksheet("Transactions");
  columns.forEach((header, index) => {
    const cell = transactions.getCell(1, index + 1);
    cell.value = header;
    paint(cell, headerFill);
  });
  transactions.getRow(1).height = 15.75;

  let rowNumber = 2;
  sections.forEach((section, index) => {
    rowNumber = writeMember(transactions, section, rowNumber, ownGroupId);
    if (index === sections.length - 1) return;
    transactions.getRow(rowNumber).height = 15.75;
    transactions.getRow(rowNumber + 1).height = 15.75;
    rowNumber += 2;
  });

  transactions.getColumn(1).width = 13.28515625;
  transactions.getColumn(2).width = 45.140625;
  transactions.getColumn(3).width = 42.42578125;
  transactions.getColumn(4).width = 13.28515625;
  transactions.getColumn(5).width = 25.140625;
  transactions.getColumn(6).width = 47.140625;

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
        cellText(account.account),
        nationalityText(account.nationality),
        cellText(account.status),
        cellText(account.hours),
        cellText(account.jobs),
        cellText(account.bids),
        cellText(account.interview),
        cellText(account.workInProgress),
        cellText(account.note),
      ];
      values.forEach((value, index) => {
        const cell = sheet.getCell(rowNumber, index + 1);
        cell.value = value;
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

function writeMember(sheet: ExcelJS.Worksheet, section: Section, totalRow: number, ownGroupId: number) {
  const payments = section.payments;
  const lastRow = totalRow + payments.length;
  const name = sheet.getCell(totalRow, 1);
  name.value = section.name;
  paint(name);
  if (payments.length > 0) sheet.mergeCells(totalRow, 1, lastRow, 1);

  const label = sheet.getCell(totalRow, 2);
  label.value = "Total Amount";
  paint(label, headerFill);
  sheet.mergeCells(totalRow, 2, totalRow, 4);

  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const cost = sheet.getCell(totalRow, 5);
  cost.value = payments.length
    ? { formula: `SUM(E${totalRow + 1}:E${lastRow})`, result: amountNumber(totalCents) }
    : 0;
  paint(cost, totalFill);
  paint(sheet.getCell(totalRow, 6));
  sheet.getRow(totalRow).height = 15.75;

  payments.forEach((payment, index) => {
    const rowNumber = totalRow + 1 + index;
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

  return lastRow + 1;
}

