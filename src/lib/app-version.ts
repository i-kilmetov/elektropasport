/** Build-time stamp in Moscow: v.1.DDMM.HHMM */
export function formatAppVersion(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `v.1.${get("day")}${get("month")}.${get("hour")}${get("minute")}`;
}

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || formatAppVersion();
