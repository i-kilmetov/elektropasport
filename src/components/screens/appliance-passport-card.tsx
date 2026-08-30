"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { MAX_APPLIANCE_PASSPORT_PHOTOS } from "@/lib/appliance-passport";
import {
  deleteAppliancePassportPhotoClient,
  fetchAppliancePassportPhotoBlob,
  listAppliancePassportPhotosClient,
  uploadAppliancePassportPhoto,
} from "@/lib/appliance-passport-client";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { dataUrlToFile, fileToCompressedDataUrl } from "@/lib/image";
import { formatErrorMessage } from "@/lib/user-data";
import type { HomeAppliance, PanelObject } from "@/types";

const GALLERY_ACCEPT =
  "image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.webp";

function pickImageFile(options: {
  accept: string;
  capture?: boolean;
}): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept;
    if (options.capture) {
      input.setAttribute("capture", "environment");
    }
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(cleanupTimer);
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    input.click();

    const cleanupTimer = window.setTimeout(() => {
      if (!settled && document.body.contains(input) && !input.files?.length) {
        finish(null);
      }
    }, 120_000);
  });
}

export function AppliancePassportCard({
  panel,
  appliance,
  onReplace,
}: {
  panel: PanelObject;
  appliance: HomeAppliance;
  onReplace: (next: HomeAppliance) => void;
}) {
  const [ids, setIds] = useState<string[]>(appliance.passportPhotoIds ?? []);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const urlsRef = useRef(urls);
  const mutatedRef = useRef(false);
  urlsRef.current = urls;

  useEffect(() => {
    mutatedRef.current = false;
    setIds(appliance.passportPhotoIds ?? []);
  }, [appliance.id]);

  useEffect(() => {
    let cancelled = false;
    void listAppliancePassportPhotosClient(panel.id, appliance.id)
      .then((photos) => {
        if (cancelled || mutatedRef.current) return;
        setIds(photos.map((item) => item.id));
      })
      .catch(() => {
        /* local ids still shown after a failed sync */
      });
    return () => {
      cancelled = true;
    };
  }, [panel.id, appliance.id]);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    void (async () => {
      for (const id of ids) {
        if (cancelled || urlsRef.current[id]) continue;
        try {
          const blob = await fetchAppliancePassportPhotoBlob(id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          created.push(url);
          setUrls((prev) => ({ ...prev, [id]: url }));
        } catch {
          /* thumbnail stays empty until retry */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(urlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const commitIds = (nextIds: string[]) => {
    mutatedRef.current = true;
    setIds(nextIds);
    onReplace({ ...appliance, passportPhotoIds: nextIds });
  };

  const addFile = async (file: File | null) => {
    if (!file) return;
    if (ids.length >= MAX_APPLIANCE_PASSPORT_PHOTOS) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, {
        maxSide: 1280,
        quality: 0.75,
      });
      const jpeg = dataUrlToFile(dataUrl, "passport.jpg");
      const photo = await uploadAppliancePassportPhoto({
        panelId: panel.id,
        applianceId: appliance.id,
        file: jpeg,
      });
      hapticImpact("light");
      const url = URL.createObjectURL(jpeg);
      setUrls((prev) => ({ ...prev, [photo.id]: url }));
      commitIds([...ids, photo.id].slice(0, MAX_APPLIANCE_PASSPORT_PHOTOS));
    } catch (caught) {
      hapticNotification("error");
      setError(
        formatErrorMessage(caught, "Не получилось сохранить фото. Попробуйте другое."),
      );
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteAppliancePassportPhotoClient(id);
      hapticImpact("light");
      const url = urls[id];
      if (url) URL.revokeObjectURL(url);
      setUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (viewerId === id) setViewerId(null);
      commitIds(ids.filter((item) => item !== id));
    } catch (caught) {
      hapticNotification("error");
      setError(formatErrorMessage(caught, "Не удалось удалить фото"));
    } finally {
      setBusy(false);
    }
  };

  const canAdd = ids.length < MAX_APPLIANCE_PASSPORT_PHOTOS && !busy;

  return (
    <>
      <GlassCard className="p-4">
        <h3 className="mb-1 ty-label uppercase tracking-wide text-zinc-400">
          Паспорт техники
        </h3>
        <p className="mb-3 ty-note">
          Сфотографируйте или загрузите скан разворота с датой покупки и печатью
          продавца. Хранится в вашей карточке, до {MAX_APPLIANCE_PASSPORT_PHOTOS}{" "}
          снимков.
        </p>

        {ids.length > 0 ? (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {ids.map((id, index) => (
              <div
                key={id}
                className="relative aspect-[3/4] overflow-hidden rounded-[16px] border border-black/8 bg-zinc-100"
              >
                {urls[id] ? (
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={() => setViewerId(id)}
                    aria-label={`Открыть фото паспорта ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urls[id]}
                      alt={`Паспорт ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="h-full w-full animate-pulse bg-zinc-200" />
                )}
                <button
                  type="button"
                  aria-label="Удалить фото"
                  disabled={busy}
                  onClick={() => void removePhoto(id)}
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {canAdd ? (
              <button
                type="button"
                onClick={() =>
                  void pickImageFile({ accept: GALLERY_ACCEPT, capture: true }).then(
                    addFile,
                  )
                }
                className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-black/15 bg-zinc-50 text-zinc-500"
              >
                <Plus className="h-5 w-5" />
                <span className="ty-meta">Ещё</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mb-3 ty-note text-rose-600">{error}</p>
        ) : null}

        {ids.length < MAX_APPLIANCE_PASSPORT_PHOTOS ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={!canAdd}
              onClick={() =>
                void pickImageFile({ accept: GALLERY_ACCEPT, capture: true }).then(
                  addFile,
                )
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-white ty-label disabled:opacity-40"
            >
              <Camera className="h-4 w-4" />
              {busy ? "Сохраняем…" : "Сфотографировать"}
            </button>
            <button
              type="button"
              disabled={!canAdd}
              onClick={() =>
                void pickImageFile({ accept: GALLERY_ACCEPT }).then(addFile)
              }
              className="flex w-full items-center justify-center gap-2 py-1.5 ty-label text-zinc-500 underline decoration-zinc-300 underline-offset-4 disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
              Загрузить скан из галереи
            </button>
          </div>
        ) : (
          <p className="ty-note">
            Добавлено максимум фото. Лишнее можно удалить и заменить.
          </p>
        )}
      </GlassCard>

      {viewerId && urls[viewerId] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5"
          onClick={() => setViewerId(null)}
        >
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
            onClick={() => setViewerId(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[viewerId]}
            alt="Паспорт техники"
            className="max-h-full max-w-full rounded-[16px] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
