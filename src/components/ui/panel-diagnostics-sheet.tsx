"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  appliancesToEquipmentLabels,
  equipmentLabelForAppliance,
  mergeEquipmentSelections,
  OTHER_LINE_EQUIPMENT_TITLES,
  PRIMARY_LINE_EQUIPMENT_TITLES,
} from "@/lib/appliance-line-sync";
import {
  OBJECT_TYPE_CONFIG,
  OBJECT_TYPE_OPTIONS,
  PANEL_LINE_CHECK_INSTRUCTIONS,
} from "@/lib/panel-identify-catalog";
import type { IdentifyContext, IdentifyObjectType } from "@/lib/panel-identify";
import type { HomeAppliance } from "@/types";
import { cn } from "@/lib/utils";

type DiagnosticsStep =
  | "intro"
  | "confirm_empty"
  | "confirm_list"
  | "survey"
  | "appliance_rooms"
  | "instructions";

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function PanelDiagnosticsSheet({
  appliances,
  initialContext,
  onClose,
  onComplete,
  onGoAddAppliances,
}: {
  appliances: HomeAppliance[];
  initialContext?: IdentifyContext | null;
  onClose: () => void;
  onComplete: (context: IdentifyContext) => void;
  onGoAddAppliances?: () => void;
}) {
  const [step, setStep] = useState<DiagnosticsStep>("intro");
  const [objectType, setObjectType] = useState<IdentifyObjectType | null>(
    initialContext?.objectType ?? null,
  );
  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    initialContext?.rooms ?? [],
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() =>
    mergeEquipmentSelections(initialContext?.equipment ?? [], appliances),
  );
  const [showMoreRooms, setShowMoreRooms] = useState(false);
  const [showMoreEquipment, setShowMoreEquipment] = useState(false);
  const [customRoom, setCustomRoom] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [showCustomRoom, setShowCustomRoom] = useState(false);
  const [showCustomEquipment, setShowCustomEquipment] = useState(false);
  const [applianceRooms, setApplianceRooms] = useState<Record<string, string>>(
    initialContext?.applianceRooms ?? {},
  );

  useEffect(() => {
    setStep("intro");
    setObjectType(initialContext?.objectType ?? null);
    setSelectedRooms(initialContext?.rooms ?? []);
    setSelectedEquipment(
      mergeEquipmentSelections(initialContext?.equipment ?? [], appliances),
    );
    setApplianceRooms(initialContext?.applianceRooms ?? {});
  }, [appliances, initialContext]);

  const objectConfig = objectType ? OBJECT_TYPE_CONFIG[objectType] : null;
  const roomOptions = useMemo(() => {
    if (!objectConfig) return [];
    return showMoreRooms
      ? [...objectConfig.roomBase, ...objectConfig.roomExtra]
      : objectConfig.roomBase;
  }, [objectConfig, showMoreRooms]);
  const equipmentOptions = showMoreEquipment
    ? [...PRIMARY_LINE_EQUIPMENT_TITLES, ...OTHER_LINE_EQUIPMENT_TITLES]
    : PRIMARY_LINE_EQUIPMENT_TITLES;

  const finish = () => {
    if (!objectType) return;
    onComplete({
      objectType,
      rooms: selectedRooms,
      equipment: selectedEquipment,
      applianceRooms:
        Object.keys(applianceRooms).length > 0 ? applianceRooms : undefined,
    });
    onClose();
  };

  const handleIntroDone = () => {
    if (appliances.length === 0) {
      setStep("confirm_empty");
      return;
    }
    setStep("confirm_list");
  };

  const handleSurveyContinue = () => {
    if (!objectType) return;
    if (appliances.length > 0) {
      setStep("appliance_rooms");
      return;
    }
    setStep("instructions");
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
          onClick={(event) => event.stopPropagation()}
          className="mx-auto max-h-[min(88vh,760px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 ty-note">Диагностика щитка</p>
              <h2 className="ty-heading">
                {step === "intro" && "Сначала — техника дома"}
                {step === "confirm_empty" && "Без стационарной техники?"}
                {step === "confirm_list" && "Проверьте список техники"}
                {step === "survey" && "Объект и помещения"}
                {step === "appliance_rooms" && "Где стоит техника"}
                {step === "instructions" && "Как проверить линии"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "intro" ? (
            <div className="space-y-4">
              <p className="ty-body text-zinc-700">
                Добавьте на главной основную стационарную технику: стиральную
                машину, посудомойку, бойлер, плиту и другое. Это нужно, чтобы
                потом правильно привязать нагрузки к линиям щитка.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => onGoAddAppliances?.()}
                  disabled={!onGoAddAppliances}
                >
                  Добавить
                </Button>
                <Button className="w-full" onClick={handleIntroDone}>
                  Сделано
                </Button>
              </div>
            </div>
          ) : null}

          {step === "confirm_empty" ? (
            <div className="space-y-4">
              <p className="ty-body text-zinc-700">
                Сейчас к щитку не добавлена стационарная техника. Точно не будете
                ничего добавлять — у вас нет такой техники дома?
              </p>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => setStep("survey")}>
                  Да, техники нет
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => onGoAddAppliances?.()}
                  disabled={!onGoAddAppliances}
                >
                  Добавить технику
                </Button>
              </div>
            </div>
          ) : null}

          {step === "confirm_list" ? (
            <div className="space-y-4">
              <p className="ty-body text-zinc-700">
                Сейчас добавлены следующие позиции. Если всё верно — продолжим
                анкету по объекту.
              </p>
              <ul className="space-y-2 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
                {appliances.map((appliance) => (
                  <li key={appliance.id} className="ty-body text-zinc-800">
                    {equipmentLabelForAppliance(appliance)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => setStep("survey")}>
                  Всё верно, продолжить
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => onGoAddAppliances?.()}
                  disabled={!onGoAddAppliances}
                >
                  Добавить ещё
                </Button>
              </div>
            </div>
          ) : null}

          {step === "survey" ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 ty-badge text-zinc-500">Тип жилья</p>
                <div className="flex flex-wrap gap-1.5">
                  {OBJECT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setObjectType(option.id);
                        setSelectedRooms([]);
                        setShowMoreRooms(false);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1 text-[13px] transition-colors",
                        objectType === option.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {objectType ? (
                <>
                  <div>
                    <p className="mb-2 ty-badge text-zinc-500">Помещения</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roomOptions.map((room) => (
                        <button
                          key={room}
                          type="button"
                          onClick={() =>
                            setSelectedRooms((prev) => toggleValue(prev, room))
                          }
                          className={cn(
                            "rounded-full px-3 py-1 text-[13px] transition-colors",
                            selectedRooms.includes(room)
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {room}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {objectConfig && objectConfig.roomExtra.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowMoreRooms((value) => !value)}
                          className="ty-note underline underline-offset-4"
                        >
                          {showMoreRooms ? "Скрыть" : "Показать больше"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShowCustomRoom((value) => !value)}
                        className="ty-note underline underline-offset-4"
                      >
                        + Добавить
                      </button>
                    </div>
                    {showCustomRoom ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customRoom}
                          onChange={(event) => setCustomRoom(event.target.value)}
                          placeholder="Добавить помещение"
                          className="h-11 flex-1 rounded-[14px] border border-black/8 bg-white px-3 text-[14px] outline-none focus:border-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = customRoom.trim();
                            if (!next) return;
                            setSelectedRooms((prev) => toggleValue(prev, next));
                            setCustomRoom("");
                            setShowCustomRoom(false);
                          }}
                          className="h-11 rounded-[14px] border border-black/8 px-3 ty-label"
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-2 ty-badge text-zinc-500">
                      Техника и нагрузки
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {equipmentOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setSelectedEquipment((prev) =>
                              toggleValue(prev, item),
                            )
                          }
                          className={cn(
                            "rounded-full px-3 py-1 text-[13px] transition-colors",
                            selectedEquipment.includes(item)
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setShowMoreEquipment((value) => !value)}
                        className="ty-note underline underline-offset-4"
                      >
                        {showMoreEquipment ? "Скрыть" : "Показать больше"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomEquipment((value) => !value)}
                        className="ty-note underline underline-offset-4"
                      >
                        + Добавить
                      </button>
                    </div>
                    {showCustomEquipment ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customEquipment}
                          onChange={(event) =>
                            setCustomEquipment(event.target.value)
                          }
                          placeholder="Добавить вариант"
                          className="h-11 flex-1 rounded-[14px] border border-black/8 bg-white px-3 text-[14px] outline-none focus:border-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = customEquipment.trim();
                            if (!next) return;
                            setSelectedEquipment((prev) =>
                              toggleValue(prev, next),
                            );
                            setCustomEquipment("");
                            setShowCustomEquipment(false);
                          }}
                          className="h-11 rounded-[14px] border border-black/8 px-3 ty-label"
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              <Button
                className="w-full"
                disabled={!objectType || selectedRooms.length === 0}
                onClick={() => {
                  setSelectedEquipment((prev) =>
                    Array.from(
                      new Set([
                        ...prev,
                        ...appliancesToEquipmentLabels(appliances),
                      ]),
                    ),
                  );
                  handleSurveyContinue();
                }}
              >
                Продолжить
              </Button>
            </div>
          ) : null}

          {step === "appliance_rooms" ? (
            <div className="space-y-4">
              <p className="ty-body text-zinc-700">
                Укажите, в каком помещении стоит каждая единица техники. Это
                поможет потом проверить, какой автомат питает комнату.
              </p>
              <div className="space-y-3">
                {appliances.map((appliance) => {
                  const label = equipmentLabelForAppliance(appliance);
                  const room = applianceRooms[appliance.id] ?? "";
                  return (
                    <div
                      key={appliance.id}
                      className="rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3"
                    >
                      <p className="mb-2 ty-heading text-zinc-900">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRooms.map((roomName) => (
                          <button
                            key={roomName}
                            type="button"
                            onClick={() =>
                              setApplianceRooms((prev) => ({
                                ...prev,
                                [appliance.id]: roomName,
                              }))
                            }
                            className={cn(
                              "rounded-full px-3 py-1 text-[13px] transition-colors",
                              room === roomName
                                ? "bg-zinc-900 text-white"
                                : "bg-white text-zinc-600",
                            )}
                          >
                            {roomName}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                className="w-full"
                disabled={appliances.some(
                  (appliance) => !applianceRooms[appliance.id],
                )}
                onClick={() => setStep("instructions")}
              >
                Продолжить
              </Button>
            </div>
          ) : null}

          {step === "instructions" ? (
            <div className="space-y-4">
              <p className="ty-body text-zinc-700">
                Теперь на схеме проверьте, какой автомат или дифавтомат питает
                свет, розетки и технику в каждом помещении.
              </p>
              <ol className="list-decimal space-y-3 pl-5 ty-note text-zinc-700">
                {PANEL_LINE_CHECK_INSTRUCTIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <Button className="w-full" onClick={finish}>
                Понятно
              </Button>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
