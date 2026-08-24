import { dbErrorResponse, getPublicStats } from "@/lib/db";

export async function GET() {
  try {
    const stats = await getPublicStats();
    return Response.json(stats, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return (
      dbErrorResponse(error) ??
      Response.json({ error: "Не удалось получить статистику" }, { status: 500 })
    );
  }
}
