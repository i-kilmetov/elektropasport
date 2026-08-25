import {
  isIcecatCatalogSyncConfigured,
  syncIcecatApplianceCatalog,
} from "@/lib/icecat-catalog";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const expected =
    process.env.TELEGRAM_SETUP_KEY?.trim() ||
    process.env.TEST_SITE_PASSWORD?.trim() ||
    "";
  if (!expected) return false;
  const header = request.headers.get("x-setup-key")?.trim() ?? "";
  const urlKey = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  return header === expected || urlKey === expected;
}

/** Sync Open Icecat appliance brands/models into DB. Protected by setup key. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIcecatCatalogSyncConfigured()) {
    return Response.json(
      {
        error:
          "Добавьте ICECAT_USERNAME и ICECAT_PASSWORD (пароль входа на icecat.biz) в Vercel",
      },
      { status: 503 },
    );
  }
  try {
    const result = await syncIcecatApplianceCatalog();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/appliances/icecat/sync", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    syncConfigured: isIcecatCatalogSyncConfigured(),
    hint: "POST this URL with x-setup-key to download Open Icecat appliance index into DB",
  });
}
