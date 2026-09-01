"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, HelpCircle, ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { InfoDialog } from "@/components/ui/info-dialog";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [titlePromptId, setTitlePromptId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const urlsRef = useRef(urls);
  const mutatedRef = useRef(false);
  urlsRef.current = urls;

  useEffect(() => {
    mutatedRef.current = false;
    setIds(appliance.passportPhotoIds ?? []);
    setTitles(appliance.passportPhotoTitles ?? {});
  }, [appliance.id]);

  useEffect(() => {
    if (mutatedRef.current) return;
    setIds(appliance.passportPhotoIds ?? []);
    setTitles(appliance.passportPhotoTitles ?? {});
  }, [appliance.passportPhotoIds, appliance.passportPhotoTitles]);

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

  const ensurePhotoUrl = async (id: string) => {
    if (urlsRef.current[id]) return urlsRef.current[id];
    const blob = await fetchAppliancePassportPhotoBlob(id);
    const url = URL.createObjectURL(blob);
    setUrls((prev) => ({ ...prev, [id]: url }));
    return url;
  };

  const openViewer = async (id: string) => {
    setViewerId(id);
    if (urlsRef.current[id]) return;
    setViewerLoading(true);
    try {
      await ensurePhotoUrl(id);
    } catch {
      setViewerId(null);
      hapticNotification("error");
      setError("Не удалось открыть файл");
    } finally {
      setViewerLoading(false);
    }
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
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      try {
        await deleteAppliancePassportPhotoClient(id);
      } catch (caught) {
        const message = formatErrorMessage(caught, "Не удалось удалить фото");
        if (!/404|не найден/i.test(message)) {
          throw caught;
        }
      }

      hapticImpact("light");
      const url = urls[id];
      if (url) URL.revokeObjectURL(url);
      setUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setViewerId(null);
      if (titlePromptId === id) {
        setTitlePromptId(null);
        setTitleDraft("");
      }
      const nextTitles = { ...titles };
      delete nextTitles[id];
      let nextIds = ids.filter((item) => item !== id);
      try {
        const photos = await listAppliancePassportPhotosClient(
          panel.id,
          appliance.id,
        );
        nextIds = photos.map((item) => item.id);
      } catch {
        /* keep filtered local ids */
      }
      commitAppliance(nextIds, nextTitles);
    } catch (caught) {
      hapticNotification("error");
      setError(formatErrorMessage(caught, "Не удалось удалить фото"));
    } finally {
      setDeletingId(null);
    }
  };

  const photoTitle = (id: string, index: number) =>
    titles[id]?.trim() || defaultPassportPhotoTitle(index);

  const canAdd = ids.length < MAX_APPLIANCE_PASSPORT_PHOTOS && !busy;
  const viewerUrl = viewerId ? urls[viewerId] : null;

  return (
    <>
      <GlassCard className="p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <h3 className="ty-label uppercase tracking-wide text-zinc-400">
            Паспорт техники
          </h3>
          <button
            type="button"
            onClick={() => setHintOpen(true)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
            aria-label="Зачем добавлять паспорт техники"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {ids.length > 0 ? (
          <div className="mb-3 space-y-2">
            {ids.map((id, index) => (
              <button
                key={id}
                type="button"
                onClick={() => void openViewer(id)}
                className="flex w-full items-center gap-3 rounded-[16px] border border-black/8 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                aria-label={`Открыть ${photoTitle(id, index)}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-600">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 truncate ty-heading">
                  {photoTitle(id, index)}
                </span>
              </button>
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
            Добавлено максимум файлов. Откройте файл, чтобы удалить и заменить.
          </p>
        )}
      </GlassCard>

      {viewerId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5"
          onClick={() => setViewerId(null)}
        >
          <div className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] flex items-center gap-2">
            <button
              type="button"
              aria-label="Удалить файл"
              disabled={deletingId === viewerId}
              onClick={(event) => {
                event.stopPropagation();
                void removePhoto(viewerId);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-60"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setViewerId(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {viewerLoading || !viewerUrl ? (
            <div className="ty-body text-white/80">Загружаем…</div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewerUrl}
                alt={photoTitle(viewerId, ids.indexOf(viewerId))}
                className="max-h-full max-w-full rounded-[16px] object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </>
          )}
        </div>
      ) : null}

      <AnimatePresence>
        {hintOpen ? (
          <InfoDialog
            title="Паспорт техники"
            description={`Сфотографируйте или загрузите скан разворота с датой покупки и печатью продавца. Хранится в вашей карточке, до ${MAX_APPLIANCE_PASSPORT_PHOTOS} снимков.`}
            onClose={() => setHintOpen(false)}
          />
        ) : null}
      </AnimatePresence>

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
                <Button className="w-full" onClick={confirmTitlePrompt}>
                  Сохранить
                </Button>
              </motion.div>
            </motion.div>
          </Portal>
        ) : null}
      </AnimatePresence>
    </>
  );
}
