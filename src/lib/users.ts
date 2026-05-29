export type UserProfile = {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatarUrl?: string;
  subscribe?: boolean;
  createdAt: string;
  updatedAt: string;
  lastOrderAt?: string;
  orderCount: number;
  paidOrderCount: number;
  lastResultType?: string;
  lastScore?: number;
  lastGender?: string;
};

const globalForUsers = globalThis as typeof globalThis & {
  __mbtiUsers?: Map<string, UserProfile>;
};

// Replace this with a persistent database before production traffic.
const users = globalForUsers.__mbtiUsers ?? new Map<string, UserProfile>();
globalForUsers.__mbtiUsers = users;

export function upsertUserFromOrder(input: {
  openid?: string;
  resultType?: string;
  score?: number;
  gender?: string;
}) {
  if (!input.openid) return null;

  const now = new Date().toISOString();
  const current = users.get(input.openid);
  const next: UserProfile = {
    ...(current ?? {
      openid: input.openid,
      createdAt: now,
      orderCount: 0,
      paidOrderCount: 0
    }),
    updatedAt: now,
    lastOrderAt: now,
    orderCount: (current?.orderCount ?? 0) + 1,
    lastResultType: input.resultType ?? current?.lastResultType,
    lastScore: input.score ?? current?.lastScore,
    lastGender: input.gender ?? current?.lastGender
  };

  users.set(input.openid, next);
  return next;
}

export function markUserPaid(openid?: string) {
  if (!openid) return null;

  const now = new Date().toISOString();
  const current = users.get(openid);
  const next: UserProfile = {
    ...(current ?? {
      openid,
      createdAt: now,
      orderCount: 0,
      paidOrderCount: 0
    }),
    updatedAt: now,
    paidOrderCount: (current?.paidOrderCount ?? 0) + 1
  };

  users.set(openid, next);
  return next;
}

export function listUsers() {
  return Array.from(users.values()).sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function maskOpenid(openid?: string) {
  if (!openid) return "--";
  if (openid.length <= 10) return `${openid.slice(0, 2)}***`;
  return `${openid.slice(0, 6)}...${openid.slice(-4)}`;
}
