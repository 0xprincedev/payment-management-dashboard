import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as typeof globalThis & {
  sqlite?: DatabaseSync;
};

function openDatabase() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const database = new DatabaseSync(path.join(dataDir, "app.db"), {
    timeout: 5000,
  });
  database.exec("PRAGMA journal_mode = WAL;");

  return database;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      nickname TEXT NOT NULL UNIQUE,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Boss', 'Member')),
      status TEXT NOT NULL CHECK (status IN ('Approved', 'Rejected', 'Pending'))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS payment_widgets (
      id INTEGER PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY,
      widget_id INTEGER NOT NULL REFERENCES payment_widgets(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK (kind IN ('bank', 'internal')),
      info TEXT NOT NULL DEFAULT '',
      account TEXT NOT NULL DEFAULT '',
      member_id INTEGER REFERENCES users(id),
      paid_on TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
      note TEXT NOT NULL DEFAULT ''
    ) STRICT;

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      account TEXT NOT NULL,
      nationality TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      hours TEXT,
      jobs TEXT,
      bids TEXT,
      interview TEXT,
      work_in_progress TEXT,
      note TEXT NOT NULL DEFAULT ''
    ) STRICT;
  `);

  const columns = database.prepare("PRAGMA table_info(payments)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "kind")) {
    rebuildPayments(database, columns.length > 0, true);
  }

  const definition = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payments'")
    .get() as { sql: string };
  if (definition.sql.includes("amount_cents > 0")) {
    rebuildPayments(database, true, false);
  }

  const groupColumns = database.prepare("PRAGMA table_info(groups)").all() as { name: string }[];
  if (!groupColumns.some((column) => column.name === "sort_order")) {
    database.exec("ALTER TABLE groups ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    const orderedGroups = database.prepare("SELECT id FROM groups ORDER BY id").all() as { id: number }[];
    const assignGroup = database.prepare("UPDATE groups SET sort_order = ? WHERE id = ?");
    orderedGroups.forEach((group, index) => assignGroup.run(index, group.id));
  }

  const userColumns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((column) => column.name === "sort_order")) {
    database.exec("ALTER TABLE users ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    const groups = database.prepare("SELECT id FROM groups").all() as { id: number }[];
    const members = database.prepare(
      `SELECT id
       FROM users
       WHERE group_id = ?
       ORDER BY CASE WHEN role = 'Boss' THEN 0 ELSE 1 END, nickname COLLATE NOCASE, id`,
    );
    const assign = database.prepare("UPDATE users SET sort_order = ? WHERE id = ?");
    for (const group of groups) {
      const rows = members.all(group.id) as { id: number }[];
      rows.forEach((row, index) => assign.run(index, row.id));
    }
  }

  const accountColumns = database.prepare("PRAGMA table_info(accounts)").all() as {
    name: string;
    type: string;
  }[];
  if (!accountColumns.some((column) => column.name === "user_id")) {
    database.exec("DROP TABLE accounts");
    database.exec(accountsTableSql);
  } else if (accountColumns.some((column) => column.name === "hours" && column.type !== "TEXT")) {
    rebuildAccountMetrics(database);
  }

  database
    .prepare("UPDATE accounts SET nationality = 'US' WHERE nationality = 'United States' COLLATE NOCASE")
    .run();
}

const accountsTableSql = `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    account TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    hours TEXT,
    jobs TEXT,
    bids TEXT,
    interview TEXT,
    work_in_progress TEXT,
    note TEXT NOT NULL DEFAULT ''
  ) STRICT;
`;

function metricText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value * 100) / 100;
    return rounded.toString();
  }
  const text = String(value).trim();
  return text || null;
}

function rebuildAccountMetrics(database: DatabaseSync) {
  const rows = database
    .prepare(
      `SELECT id, user_id, sort_order, account, nationality, status, hours, jobs, bids, interview, work_in_progress, note
       FROM accounts
       ORDER BY id`,
    )
    .all() as {
    id: number;
    user_id: number;
    sort_order: number;
    account: string;
    nationality: string;
    status: string;
    hours: unknown;
    jobs: unknown;
    bids: unknown;
    interview: unknown;
    work_in_progress: unknown;
    note: string;
  }[];

  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("ALTER TABLE accounts RENAME TO accounts_previous;");
    database.exec(accountsTableSql);
    const insert = database.prepare(
      `INSERT INTO accounts (
         id, user_id, sort_order, account, nationality, status, hours, jobs, bids, interview, work_in_progress, note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of rows) {
      insert.run(
        row.id,
        row.user_id,
        row.sort_order,
        row.account,
        row.nationality,
        row.status,
        metricText(row.hours),
        metricText(row.jobs),
        metricText(row.bids),
        metricText(row.interview),
        metricText(row.work_in_progress),
        row.note,
      );
    }
    database.exec("DROP TABLE accounts_previous;");
    database.exec("COMMIT");
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
}

function rebuildPayments(database: DatabaseSync, copyRows: boolean, legacyRows: boolean) {
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(`
      CREATE TABLE payments_next (
        id INTEGER PRIMARY KEY,
        widget_id INTEGER NOT NULL REFERENCES payment_widgets(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK (kind IN ('bank', 'internal')),
        info TEXT NOT NULL DEFAULT '',
        account TEXT NOT NULL DEFAULT '',
        member_id INTEGER REFERENCES users(id),
        paid_on TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
        note TEXT NOT NULL DEFAULT ''
      ) STRICT;
    `);

    if (copyRows && legacyRows) {
      database.exec(`
        INSERT INTO payments_next (
          id, widget_id, user_id, kind, info, account, member_id, paid_on, amount_cents, note
        )
        SELECT id, widget_id, user_id, 'bank', '', '', user_id, paid_on, amount_cents, note
        FROM payments;
      `);
    } else if (copyRows) {
      database.exec(`
        INSERT INTO payments_next (
          id, widget_id, user_id, kind, info, account, member_id, paid_on, amount_cents, note
        )
        SELECT id, widget_id, user_id, kind, info, account, member_id, paid_on, amount_cents, note
        FROM payments;
      `);
    }

    database.exec("DROP TABLE payments;");
    database.exec("ALTER TABLE payments_next RENAME TO payments;");
    database.exec("COMMIT");
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
}

export type Group = {
  id: number;
  name: string;
};

export const userRoles = ["Admin", "Boss", "Member"] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ["Approved", "Rejected", "Pending"] as const;
export type UserStatus = (typeof userStatuses)[number];

export type User = {
  id: number;
  email: string;
  password: string;
  name: string;
  nickname: string;
  group_id: number;
  role: UserRole;
  status: UserStatus;
};

export const db = globalForDb.sqlite ?? openDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = db;
}

migrate(db);
