export const BASE_PANEL_LIMIT = 2;
export const PANELS_PER_INVITE = 2;

export const INVITE_TOKEN_RE = /^i[A-Za-z0-9]{8,16}$/;

export function isInviteToken(value: string | null | undefined): value is string {
  return Boolean(value && INVITE_TOKEN_RE.test(value));
}

export type InviteOutcome = "credited" | "already_member";

export type InviteEvent = {
  outcome: InviteOutcome;
  name: string;
  username?: string;
  createdAt: string;
};

export type PanelQuota = {
  panelCount: number;
  panelLimit: number;
  remaining: number;
  creditedInvites: number;
  inviteUrl: string;
  events: InviteEvent[];
};

export function panelLimitForInvites(creditedInvites: number): number {
  return BASE_PANEL_LIMIT + creditedInvites * PANELS_PER_INVITE;
}

export function inviteeDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  const full = [input.firstName, input.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (full) return full;
  const username = input.username?.replace(/^@/, "").trim();
  if (username) return `@${username}`;
  return "Пользователь Telegram";
}

export function panelWord(count: number): string {
  const abs = Math.abs(count);
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n10 === 1 && n100 !== 11) return "щиток";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "щитка";
  return "щитков";
}
