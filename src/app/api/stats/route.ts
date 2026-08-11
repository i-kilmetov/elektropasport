import { dbErrorResponse, getPublicStats } from "@/lib/db";

export async function GET() {
  try {
    const stats = await getPublicStats();
    return Response.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return (
      dbErrorResponse(error) ??
      Response.json({ error: "Не удалось получить статистику" }, { status: 500 })
    );
  }
}
