/** One panel is free; inviting at least one user removes the limit. */
export const BASE_PANEL_LIMIT = 1;

export const PANEL_LIMIT_MESSAGE =
  "Можно добавить один щиток. Чтобы снимать лимит, пригласите хотя бы одного человека.";

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
  unlimited: boolean;
  creditedInvites: number;
  inviteUrl: string;
  events: InviteEvent[];
};

export function hasUnlockedPanelLimit(creditedInvites: number): boolean {
  return creditedInvites >= 1;
}

export function panelLimitForInvites(creditedInvites: number): number {
  return hasUnlockedPanelLimit(creditedInvites)
    ? Number.MAX_SAFE_INTEGER
    : BASE_PANEL_LIMIT;
}

export function isAtPanelLimit(
  quota: PanelQuota | null | undefined,
  localPanelCount = 0,
): boolean {
  // No quota loaded yet / caller forgot to pass it — do not invent a limit.
  // Authenticated creates are enforced by the API; local-only callers pass
  // an explicit localPanelQuota(...).
  if (!quota) return false;
  if (quota.unlimited || hasUnlockedPanelLimit(quota.creditedInvites)) {
    return false;
  }
  const count = Math.max(quota.panelCount, localPanelCount);
  return count >= BASE_PANEL_LIMIT;
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
