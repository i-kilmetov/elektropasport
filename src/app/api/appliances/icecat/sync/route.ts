import {
  countIcecatCatalog,
  isIcecatCatalogSyncConfigured,
  syncIcecatApplianceCatalog,
} from "@/lib/icecat-catalog";

export const maxDuration = 300;

function setupKeyAuthorized(request: Request): boolean {
  const expected =
    process.env.TELEGRAM_SETUP_KEY?.trim() ||
    process.env.TEST_SITE_PASSWORD?.trim() ||
    "";
  if (!expected) return false;
  const header = request.headers.get("x-setup-key")?.trim() ?? "";
  const urlKey = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  return header === expected || urlKey === expected;
}

function cronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization")?.trim() ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  // Vercel Cron invokes GET with this header
  return request.headers.get("x-vercel-cron") === "1";
}

async function runSync(bootstrap: boolean) {
  const result = await syncIcecatApplianceCatalog();
  return Response.json({ ok: true, bootstrap, ...result });
}

/**
 * Sync Open Icecat appliance brands/models into DB.
 * Auth: setup key, Vercel Cron, or one-time bootstrap when catalog is empty.
 */
export async function POST(request: Request) {
  if (!isIcecatCatalogSyncConfigured()) {
    return Response.json(
      {
        error:
          "Добавьте ICECAT_USERNAME и ICECAT_PASSWORD (пароль входа на icecat.biz) в Vercel",
      },
      { status: 503 },
    );
  }

  const keyed = setupKeyAuthorized(request) || cronAuthorized(request);
  let bootstrap = false;
  if (!keyed) {
    const total = await countIcecatCatalog().catch(() => -1);
    // Allow unauthenticated re-sync while catalog is still empty / tiny (bootstrap).
    if (total < 0 || total > 100) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    bootstrap = true;
  }

  try {
    return await runSync(bootstrap);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/appliances/icecat/sync", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusOnly = url.searchParams.get("status") === "1";

  if (cronAuthorized(request) && !statusOnly) {
    if (!isIcecatCatalogSyncConfigured()) {
      return Response.json(
        { error: "ICECAT_USERNAME / ICECAT_PASSWORD not configured" },
        { status: 503 },
      );
    }
    try {
      return await runSync(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("GET cron /api/appliances/icecat/sync", msg, error);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  const keyed = setupKeyAuthorized(request);
  const total = await countIcecatCatalog().catch(() => null);
  if (!keyed && !(total !== null && total <= 100)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    syncConfigured: isIcecatCatalogSyncConfigured(),
    catalogProducts: total,
    bootstrapAllowed: total !== null && total <= 100,
    hint: "POST this URL with x-setup-key (or while catalog is still tiny) to sync Open Icecat index",
  });
}
