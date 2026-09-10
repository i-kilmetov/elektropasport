/**
 * After Robokassa SuccessURL / SuccessUrl2 redirect, the browser lands with
 * ?OutSum=&InvId=&SignatureValue=. ResultURL may have failed; this syncs via Password#1.
 */

const ROBO_KEYS = [
  "OutSum",
  "InvId",
  "SignatureValue",
  "IsTest",
  "Culture",
] as const;

export function readRobokassaReturnParams(
  search = typeof window !== "undefined" ? window.location.search : "",
): { OutSum: string; InvId: string; SignatureValue: string; shp: Record<string, string> } | null {
  const params = new URLSearchParams(search);
  const OutSum = params.get("OutSum")?.trim() ?? "";
  const InvId = params.get("InvId")?.trim() ?? "";
  const SignatureValue = params.get("SignatureValue")?.trim() ?? "";
  if (!OutSum || !InvId || !SignatureValue) return null;

  const shp: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith("Shp_")) shp[key] = value;
  });

  return { OutSum, InvId, SignatureValue, shp };
}

export function stripRobokassaReturnParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ROBO_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  const toDelete: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (key.startsWith("Shp_")) toDelete.push(key);
  });
  for (const key of toDelete) {
    url.searchParams.delete(key);
    changed = true;
  }
  if (changed) {
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

export async function syncRobokassaReturnIfPresent(): Promise<{
  ok: boolean;
  serviceType?: string;
  requestId?: string | null;
} | null> {
  const payload = readRobokassaReturnParams();
  if (!payload) return null;

  try {
    const res = await fetch("/api/payments/robokassa-success", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        OutSum: payload.OutSum,
        InvId: payload.InvId,
        SignatureValue: payload.SignatureValue,
        ...payload.shp,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      serviceType?: string;
      requestId?: string | null;
      error?: string;
    };
    stripRobokassaReturnParamsFromUrl();
    if (!res.ok) {
      console.error("Robokassa success sync failed", data.error ?? res.status);
      return { ok: false };
    }
    return {
      ok: Boolean(data.ok),
      serviceType: data.serviceType,
      requestId: data.requestId,
    };
  } catch (error) {
    console.error("Robokassa success sync error", error);
    stripRobokassaReturnParamsFromUrl();
    return { ok: false };
  }
}
