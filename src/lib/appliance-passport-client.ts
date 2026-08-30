import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import type { AppliancePassportPhotoMeta } from "@/lib/appliance-passport";
import { formatErrorMessage } from "@/lib/user-data";

export type { AppliancePassportPhotoMeta };

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return formatErrorMessage(data.error, `Ошибка ${res.status}`);
  } catch {
    return `Ошибка ${res.status}`;
  }
}

export async function listAppliancePassportPhotosClient(
  panelId: string,
  applianceId: string,
): Promise<AppliancePassportPhotoMeta[]> {
  if (!canUseServerAuth()) return [];
  const params = new URLSearchParams({ panelId, applianceId });
  const res = await fetch(`/api/appliances/passport?${params}`, {
    cache: "no-store",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { photos?: AppliancePassportPhotoMeta[] };
  return Array.isArray(data.photos) ? data.photos : [];
}

export async function uploadAppliancePassportPhoto(input: {
  panelId: string;
  applianceId: string;
  file: File;
}): Promise<AppliancePassportPhotoMeta> {
  if (!canUseServerAuth()) {
    throw new Error("Чтобы сохранить паспорт, войдите в Током");
  }
  const form = new FormData();
  form.set("panelId", input.panelId);
  form.set("applianceId", input.applianceId);
  form.set("file", input.file);
  const res = await fetch("/api/appliances/passport", {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { photo?: AppliancePassportPhotoMeta };
  if (!data.photo?.id) {
    throw new Error("Не удалось сохранить фото");
  }
  return data.photo;
}

export async function fetchAppliancePassportPhotoBlob(
  id: string,
): Promise<Blob> {
  const res = await fetch(
    `/api/appliances/passport/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
      headers: { ...authHeaders() },
    },
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.blob();
}

export async function deleteAppliancePassportPhotoClient(
  id: string,
): Promise<void> {
  const res = await fetch(
    `/api/appliances/passport/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { ...authHeaders() },
    },
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}
