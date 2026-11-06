export type AccountRecord = {
  id: number;
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
