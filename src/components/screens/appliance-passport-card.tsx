"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, FileText, ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
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

function defaultPassportPhotoTitle(index: number): string {
  return `Фото паспорта ${index + 1}`;
}

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
  const [titles, setTitles] = useState<Record<string, string>>(
    appliance.passportPhotoTitles ?? {},
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [titlePromptId, setTitlePromptId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const urlsRef = useRef(urls);
  const mutatedRef = useRef(false);
  urlsRef.current = urls;

  useEffect(() => {
    mutatedRef.current = false;
    setIds(appliance.passportPhotoIds ?? []);
    setTitles(appliance.passportPhotoTitles ?? {});
  }, [appliance.id, appliance.passportPhotoIds, appliance.passportPhotoTitles]);

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
    void (async () => {
      for (const id of ids) {
        if (cancelled || urlsRef.current[id]) continue;
        try {
          const blob = await fetchAppliancePassportPhotoBlob(id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
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

  const commitAppliance = (
    nextIds: string[],
    nextTitles: Record<string, string>,
  ) => {
    mutatedRef.current = true;
    setIds(nextIds);
    setTitles(nextTitles);
    onReplace({
      ...appliance,
      passportPhotoIds: nextIds,
      passportPhotoTitles: nextTitles,
    });
  };

  const saveTitle = (photoId: string, title: string) => {
    const trimmed = title.trim();
    const nextTitles = { ...titles };
    if (trimmed) {
      nextTitles[photoId] = trimmed;
    } else {
      delete nextTitles[photoId];
    }
    commitAppliance(ids, nextTitles);
  };

  const openTitlePrompt = (photoId: string, index: number) => {
    setTitleDraft(titles[photoId] ?? defaultPassportPhotoTitle(index));
    setTitlePromptId(photoId);
  };

  const confirmTitlePrompt = () => {
    if (!titlePromptId) return;
    saveTitle(titlePromptId, titleDraft);
    setTitlePromptId(null);
    setTitleDraft("");
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
      const nextIds = [...ids, photo.id].slice(0, MAX_APPLIANCE_PASSPORT_PHOTOS);
      commitAppliance(nextIds, titles);
      openTitlePrompt(photo.id, nextIds.indexOf(photo.id));
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
      if (titlePromptId === id) {
        setTitlePromptId(null);
        setTitleDraft("");
      }
      const nextTitles = { ...titles };
      delete nextTitles[id];
      commitAppliance(
        ids.filter((item) => item !== id),
        nextTitles,
      );
    } catch (caught) {
      hapticNotification("error");
      setError(formatErrorMessage(caught, "Не удалось удалить фото"));
    } finally {
      setBusy(false);
    }
  };

  const photoTitle = (id: string, index: number) =>
    titles[id]?.trim() || defaultPassportPhotoTitle(index);

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
          <div className="mb-3 divide-y divide-black/[0.06] rounded-[16px] border border-black/8 bg-white">
            {ids.map((id, index) => (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-2.5 first:rounded-t-[16px] last:rounded-b-[16px]"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setViewerId(id)}
                  aria-label={`Открыть ${photoTitle(id, index)}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-zinc-100 text-zinc-600">
                    {urls[id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urls[id]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate ty-heading">
                      {photoTitle(id, index)}
                    </span>
                    <span className="block ty-note">Открыть</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
                <button
                  type="button"
                  aria-label="Переименовать"
                  disabled={busy}
                  onClick={() => openTitlePrompt(id, index)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <span className="text-[13px] font-semibold">Aa</span>
                </button>
                <button
                  type="button"
                  aria-label="Удалить"
                  disabled={busy}
                  onClick={() => void removePhoto(id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
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
            alt={photoTitle(viewerId, ids.indexOf(viewerId))}
            className="max-h-full max-w-full rounded-[16px] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {titlePromptId ? (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => {
                setTitlePromptId(null);
                setTitleDraft("");
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
              >
                <h3 className="mb-2 ty-title">Название файла</h3>
                <p className="mb-4 ty-body text-zinc-600">
                  Как назвать этот снимок паспорта? Например: «Разворот с печатью»
                  или «Гарантийный талон».
                </p>
                <label className="mb-4 block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Название
                  </span>
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    placeholder="Например, Разворот с печатью"
                    className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmTitlePrompt();
                      }
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setTitlePromptId(null);
                      setTitleDraft("");
                    }}
                  >
                    Пропустить
                  </Button>
                  <Button className="flex-1" onClick={confirmTitlePrompt}>
                    Сохранить
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        ) : null}
      </AnimatePresence>
    </>
  );
}
