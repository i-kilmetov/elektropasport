import { cityHasConnectedMaster } from "@/lib/master-coverage";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city")?.trim() ?? "";
  if (!city) {
    return Response.json({ hasMaster: false });
  }
  try {
    const hasMaster = await cityHasConnectedMaster(city);
    return Response.json({ hasMaster });
  } catch {
    return Response.json({ hasMaster: false });
  }
}
