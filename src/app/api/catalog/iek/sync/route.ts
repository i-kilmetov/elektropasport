import { countIekCatalog, syncIekInfobase } from "@/lib/iek-infobase";

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
  return request.headers.get("x-vercel-cron") === "1";
}

async function runSync() {
  const result = await syncIekInfobase();
  return Response.json({ ok: true, ...result });
}

/**
 * Sync IEK infobase (imagesPrice.xml) into panel_catalog_products.
 * Public XML, no API key. Auth: setup key or Vercel Cron.
 * One-time bootstrap is allowed while the IEK table is empty.
 */
export async function POST(request: Request) {
  const keyed = setupKeyAuthorized(request) || cronAuthorized(request);
  let bootstrap = false;
  if (!keyed) {
    const total = await countIekCatalog().catch(() => -1);
    if (total !== 0) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    bootstrap = true;
  }

  try {
    const result = await syncIekInfobase();
    return Response.json({ ok: true, bootstrap, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/catalog/iek/sync", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusOnly = url.searchParams.get("status") === "1";

  if (cronAuthorized(request) && !statusOnly) {
    try {
      return await runSync();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("GET cron /api/catalog/iek/sync", msg, error);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  const keyed = setupKeyAuthorized(request);
  const total = await countIekCatalog().catch(() => null);
  if (!keyed && total !== 0) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    catalogProducts: total,
    bootstrapAllowed: total === 0,
    hint: "POST this URL with x-setup-key (or Vercel Cron) to sync IEK infobase",
  });
}
