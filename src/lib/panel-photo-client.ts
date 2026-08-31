import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import { dataUrlToFile } from "@/lib/image";
import { formatErrorMessage } from "@/lib/user-data";

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return formatErrorMessage(data.error, `Ошибка ${res.status}`);
  } catch {
    return `Ошибка ${res.status}`;
  }
}

export async function uploadPanelPhoto(input: {
  panelId: string;
  photoDataUrl: string;
}): Promise<void> {
  if (!canUseServerAuth()) return;
  const file = dataUrlToFile(input.photoDataUrl, "panel.jpg");
  const form = new FormData();
  form.set("file", file);
  const res = await fetch(
    `/api/panels/${encodeURIComponent(input.panelId)}/photo`,
    {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    },
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function fetchPanelPhotoObjectUrl(
  panelId: string,
): Promise<string | null> {
  if (!canUseServerAuth()) return null;
  const res = await fetch(
    `/api/panels/${encodeURIComponent(panelId)}/photo`,
    {
      cache: "no-store",
      headers: { ...authHeaders() },
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const blob = await res.blob();
  if (!blob.size) return null;
  return URL.createObjectURL(blob);
}
