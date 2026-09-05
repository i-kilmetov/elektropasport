import { NextResponse } from "next/server";
import {
  directTelegramFetch,
  EGRESS_RESULT_HEADER,
  EGRESS_SIGNATURE_HEADER,
  egressSecretConfigured,
  parseEgressRequest,
  TELEGRAM_API_HOSTS,
  verifyEgressSignature,
} from "@/lib/telegram-fetch";

const UPSTREAM_TIMEOUT_MS = 20000;
const MAX_PAYLOAD_BYTES = 64 * 1024;

/**
 * Signed egress relay for Telegram API calls.
 * Deployed on a region with Telegram access (Vercel) and called by the
 * primary deployment when direct requests time out.
 */
export async function POST(request: Request) {
  if (!egressSecretConfigured()) {
    return NextResponse.json(
      { error: "egress secret is not configured" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const signature = request.headers.get(EGRESS_SIGNATURE_HEADER) ?? "";
  if (!verifyEgressSignature(raw, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const payload = parseEgressRequest(raw);
  if (!payload) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const upstream = await directTelegramFetch(
      payload.url,
      {
        method: payload.method,
        headers: payload.headers,
        body: payload.method === "GET" ? undefined : payload.body,
        redirect: "manual",
      },
      { timeoutMs: UPSTREAM_TIMEOUT_MS },
    );
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        [EGRESS_RESULT_HEADER]: "1",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("telegram egress relay", error);
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}

/** Reachability probe — no secrets, used to diagnose blocked egress. */
export async function GET() {
  const targets = [
    ...TELEGRAM_API_HOSTS.map((host) => `https://${host}/`),
    "https://elektropasport.vercel.app/api/payments/robokassa-status",
  ];

  const checks = await Promise.all(
    targets.map(async (url) => {
      const startedAt = Date.now();
      try {
        const res = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(6000),
        });
        return { url, ok: true, status: res.status, ms: Date.now() - startedAt };
      } catch (error) {
        const cause = (error as { cause?: { code?: string } }).cause;
        return {
          url,
          ok: false,
          error: cause?.code ?? (error as Error).name,
          ms: Date.now() - startedAt,
        };
      }
    }),
  );

  return NextResponse.json(
    { proxyConfigured: Boolean(process.env.TELEGRAM_EGRESS_PROXY_URL), checks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
