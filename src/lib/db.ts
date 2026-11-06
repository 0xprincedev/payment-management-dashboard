import "server-only";
import { MongoClient, type ClientSession, type Collection, type Db } from "mongodb";

export const userRoles = ["Admin", "Boss", "Member"] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ["Approved", "Rejected", "Pending"] as const;
export type UserStatus = (typeof userStatuses)[number];

export type Group = {
  id: number;
  name: string;
};

export type GroupDoc = {
  _id: number;
  name: string;
  sortOrder: number;
};

export type UserDoc = {
  _id: number;
  email: string;
  password: string;
  name: string;
  nickname: string;
  groupId: number;
  role: UserRole;
  status: UserStatus;
  sortOrder: number;
};

export type SessionDoc = {
  _id: string;
  userId: number;
  expiresAt: number;
};

export type WidgetDoc = {
  _id: number;
  groupId: number;
  name: string;
  createdBy: number;
};

export type PaymentDoc = {
  _id: number;
  widgetId: number;
  userId: number;
  kind: "bank" | "internal";
  info: string;
  account: string;
  memberId: number | null;
  paidOn: string;
  amountCents: number;
  note: string;
};

export type AccountDoc = {
  _id: number;
  userId: number;
  sortOrder: number;
  platform: string;
  account: string;
  nationality: string;
  status: string;
  createdAt: string | null;
  machine: string;
  project: string;
  availableCents: number | null;
  pendingCents: number | null;
  note: string;
};

type CounterDoc = {
  _id: string;
  seq: number;
};

export const caseInsensitive = { locale: "en", strength: 2 } as const;

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoReady?: Promise<Db>;
};

async function connect() {
  if (!globalForMongo.mongoReady) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set.");
    globalForMongo.mongoReady = (async () => {
      const client = new MongoClient(uri);
      await client.connect();
      globalForMongo.mongoClient = client;
      const database = client.db();
      await ensureIndexes(database);
      return database;
    })();
  }

  return globalForMongo.mongoReady;
}

async function ensureIndexes(database: Db) {
  await database.collection<GroupDoc>("groups").createIndex(
    { name: 1 },
    { unique: true, collation: caseInsensitive, name: "group_name" },
  );
  const users = database.collection<UserDoc>("users");
  await users.createIndex({ email: 1 }, { unique: true, collation: caseInsensitive, name: "user_email" });
  await users.createIndex({ name: 1 }, { unique: true, collation: caseInsensitive, name: "user_name" });
  await users.createIndex({ nickname: 1 }, { unique: true, collation: caseInsensitive, name: "user_nickname" });
  await database.collection<SessionDoc>("sessions").createIndex({ userId: 1 });
  await database.collection<WidgetDoc>("widgets").createIndex(
    { groupId: 1, name: 1 },
    { unique: true, collation: caseInsensitive, name: "widget_name" },
  );
  await database.collection<PaymentDoc>("payments").createIndex({ widgetId: 1, userId: 1 });
  await database.collection<AccountDoc>("accounts").createIndex({ userId: 1, sortOrder: 1 });
}

export async function mongo() {
  return connect();
}

export async function groups(): Promise<Collection<GroupDoc>> {
  return (await connect()).collection<GroupDoc>("groups");
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await connect()).collection<UserDoc>("users");
}

export async function sessions(): Promise<Collection<SessionDoc>> {
  return (await connect()).collection<SessionDoc>("sessions");
}

export async function widgets(): Promise<Collection<WidgetDoc>> {
  return (await connect()).collection<WidgetDoc>("widgets");
}

export async function payments(): Promise<Collection<PaymentDoc>> {
  return (await connect()).collection<PaymentDoc>("payments");
}

export async function accounts(): Promise<Collection<AccountDoc>> {
  return (await connect()).collection<AccountDoc>("accounts");
}

export async function nextId(name: string) {
  const counters = (await connect()).collection<CounterDoc>("counters");
  const updated = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = updated?.seq;
  if (typeof seq !== "number" || !Number.isInteger(seq)) {
    throw new Error("The next id could not be created.");
  }
  return seq;
}

export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>) {
  const database = await connect();
  const session = database.client.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
