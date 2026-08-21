"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { fileToCompressedDataUrl } from "@/lib/image";
import {
  HOME_APPLIANCE_CATALOG,
  applianceCatalogItem,
  createApplianceId,
  formatAppliancePower,
} from "@/lib/home-appliances";
import type { HomeAppliance, HomeApplianceKind, PanelObject } from "@/types";
import { cn } from "@/lib/utils";

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

type Step = "method" | "form";

export function AddApplianceSheet({
  panels,
  preferredPanelId,
  onClose,
  onSave,
  onAddPanel,
}: {
  panels: PanelObject[];
  preferredPanelId?: string | null;
  onClose: () => void;
  onSave: (panelId: string, appliance: HomeAppliance) => void;
  onAddPanel?: () => void;
}) {
  const [step, setStep] = useState<Step>("method");
  const [kind, setKind] = useState<HomeApplianceKind>("fridge");
  const [title, setTitle] = useState(applianceCatalogItem("fridge").title);
  const [powerW, setPowerW] = useState(
    String(applianceCatalogItem("fridge").defaultPowerW),
  );
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [panelId, setPanelId] = useState(
    preferredPanelId && panels.some((p) => p.id === preferredPanelId)
      ? preferredPanelId
      : panels[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = useMemo(() => HOME_APPLIANCE_CATALOG, []);

  const applyKind = (next: HomeApplianceKind) => {
    const item = applianceCatalogItem(next);
    setKind(next);
    setTitle(item.title);
    setPowerW(String(item.defaultPowerW));
  };

  const processPhoto = async (capture: boolean) => {
    setError(null);
    const file = await pickImageFile({
      accept: capture ? "image/*" : GALLERY_ACCEPT,
      capture,
    });
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setStep("form");
    } catch {
      setError("Не удалось обработать фото. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!panelId) {
      setError("Сначала добавьте щиток — электрическое сердце дома.");
      return;
    }
    const watts = Number(powerW.replace(",", "."));
    const item = applianceCatalogItem(kind);
    const appliance: HomeAppliance = {
      id: createApplianceId(),
      kind,
      title: title.trim() || item.title,
      powerW: Number.isFinite(watts) && watts > 0 ? Math.round(watts) : item.defaultPowerW,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      photoDataUrl: photoDataUrl ?? undefined,
      manuals: item.manuals,
      createdAt: new Date().toISOString(),
    };
    onSave(panelId, appliance);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            {step === "form" ? (
              <button
                type="button"
                onClick={() => setStep("method")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
                aria-label="Назад"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
            <h2 className="text-[17px] font-semibold text-zinc-900">
              Добавить технику
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "method" ? (
            <div className="space-y-3">
              <p className="px-1 text-[14px] leading-relaxed text-zinc-500">
                Добавьте основные электроприборы квартиры или дома — по фото
                шильдика или вручную.
              </p>
              <Button
                className="w-full"
                size="lg"
                disabled={busy}
                onClick={() => void processPhoto(true)}
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                По фото
              </Button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void processPhoto(false)}
                className="w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-[15px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-40"
              >
                Загрузить фото
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPhotoDataUrl(null);
                  setStep("form");
                }}
                className="w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-[15px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-40"
              >
                Вручную
              </button>
              {onAddPanel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAddPanel}
                  className="w-full pt-1 text-center text-[14px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-800"
                >
                  Добавить ещё один щиток
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDataUrl}
                  alt=""
                  className="h-36 w-full rounded-[20px] object-cover"
                />
              )}

              {panels.length > 1 && (
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-zinc-500">
                    Дом / объект
                  </span>
                  <select
                    value={panelId}
                    onChange={(e) => setPanelId(e.target.value)}
                    className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
                  >
                    {panels.map((panel) => (
                      <option key={panel.id} value={panel.id}>
                        {panel.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div>
                <span className="mb-1.5 block text-[13px] text-zinc-500">
                  Тип прибора
                </span>
                <div className="flex flex-wrap gap-2">
                  {catalog.map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() => applyKind(item.kind)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                        kind === item.kind
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[13px] text-zinc-500">
                  Название
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] text-zinc-500">
                  Мощность, Вт
                </span>
                <input
                  inputMode="numeric"
                  value={powerW}
                  onChange={(e) =>
                    setPowerW(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))
                  }
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
                />
                <span className="mt-1 block text-[12px] text-zinc-400">
                  Обычно ≈ {formatAppliancePower(Number(powerW) || undefined)}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-zinc-500">
                    Бренд
                  </span>
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value.slice(0, 40))}
                    placeholder="Необязательно"
                    className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-zinc-500">
                    Модель
                  </span>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value.slice(0, 40))}
                    placeholder="Необязательно"
                    className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </label>
              </div>

              {error && (
                <p className="text-center text-[13px] text-rose-600">{error}</p>
              )}

              <Button className="w-full" size="lg" onClick={save}>
                <Check className="h-5 w-5" />
                Сохранить
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
