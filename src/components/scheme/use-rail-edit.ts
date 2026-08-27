"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DEVICE_GAP_PX, MODULE_PX } from "@/components/icons/device-face";
import {
  hapticContextMenu,
  hapticDelete,
  hapticImpact,
  hapticSelection,
} from "@/lib/haptics";
import {
  type DropSlot,
  insertDevice,
  insertIndexAtX,
  previewRails,
  removeDevice,
  sameDropSlot,
} from "@/lib/panel-edit";
import { MAX_RAILS } from "@/lib/panel-rails";
import type { Device } from "@/types";

const LONG_PRESS_MS = 480;
const CANCEL_MOVE_PX = 12;

type Session = {
  deviceId: number;
  pointerId: number;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  timer: number;
  dragging: boolean;
};

export function useRailEdit({
  devices,
  railCount,
  enabled,
  onCommit,
}: {
  devices: Device[];
  railCount?: number;
  enabled: boolean;
  onCommit: (next: Device[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [grab, setGrab] = useState({ x: 0, y: 0 });
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const skipClickRef = useRef(false);
  const dropSlotRef = useRef<DropSlot | null>(null);
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const railCountRef = useRef(railCount);
  railCountRef.current = railCount;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const preview = previewRails(devices, draggingId, dropSlot, railCount);
  const dragging = devices.find((device) => device.id === draggingId) ?? null;

  const exitEdit = useCallback(() => {
    setEditing(false);
    setDraggingId(null);
    setPointer(null);
    setDropSlot(null);
    dropSlotRef.current = null;
    hapticImpact("light");
  }, []);

  const enterEdit = useCallback(() => {
    setEditing(true);
    hapticContextMenu();
  }, []);

  const resolveSlot = useCallback(
    (x: number, y: number, deviceId: number): DropSlot | null => {
      const newZone = document.querySelector<HTMLElement>(
        "[data-new-rail-zone]",
      );
      if (newZone) {
        const box = newZone.getBoundingClientRect();
        if (
          y >= box.top &&
          y <= box.bottom &&
          x >= box.left - 12 &&
          x <= box.right + 12
        ) {
          const rail = Number(newZone.dataset.newRailZone ?? "0");
          return { rail, index: 0, isNewRail: true };
        }
      }

      const rows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-rail-drop]"),
      );
      if (rows.length === 0) return null;

      let best: { el: HTMLElement; rail: number; dist: number } | null = null;
      for (const el of rows) {
        const box = el.getBoundingClientRect();
        const mid = (box.top + box.bottom) / 2;
        const dist = Math.abs(y - mid);
        const padded = y >= box.top - 28 && y <= box.bottom + 28;
        if (!padded && dist > 72) continue;
        const rail = Number(el.dataset.railDrop ?? "0");
        if (!best || dist < best.dist) best = { el, rail, dist };
      }
      if (!best) return null;

      const box = best.el.getBoundingClientRect();
      const styles = window.getComputedStyle(best.el);
      const padLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const railDevices =
        previewRails(devicesRef.current, deviceId, null, railCountRef.current)
          .rails[best.rail] ?? [];
      const index = insertIndexAtX(
        railDevices,
        x - box.left - padLeft,
        MODULE_PX,
        DEVICE_GAP_PX,
        deviceId,
      );
      return { rail: best.rail, index, isNewRail: false };
    },
    [],
  );

  const finishDrag = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    const slot = dropSlotRef.current;
    const id = session?.deviceId;
    setDraggingId(null);
    setPointer(null);
    setDropSlot(null);
    dropSlotRef.current = null;
    document.body.style.overflow = "";
    document.body.style.touchAction = "";

    if (!session?.dragging || id == null || !slot) return;
    const current = devicesRef.current;
    const moving = current.find((device) => device.id === id);
    if (!moving) return;
    const next = insertDevice(current, moving, slot);
    if (!next) {
      hapticImpact("rigid");
      return;
    }
    hapticImpact("medium");
    onCommitRef.current(next);
  }, []);

  const onDevicePointerDown = useCallback(
    (device: Device, event: ReactPointerEvent, face: DOMRect) => {
      if (!enabled || event.button !== 0) return;

      skipClickRef.current = false;
      const pointerId = event.pointerId;
      const target = event.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(pointerId);
      } catch {
        /* ignore */
      }

      const session: Session = {
        deviceId: device.id,
        pointerId,
        startX: event.clientX,
        startY: event.clientY,
        grabX: event.clientX - face.left,
        grabY: event.clientY - face.top,
        timer: 0,
        dragging: false,
      };

      const startDrag = (x: number, y: number, fromLongPress: boolean) => {
        const live = sessionRef.current;
        if (!live || live.pointerId !== pointerId || live.dragging) return;
        live.dragging = true;
        live.startX = x;
        live.startY = y;
        skipClickRef.current = true;
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        setGrab({ x: live.grabX, y: live.grabY });
        setEditing(true);
        setDraggingId(device.id);
        setPointer({ x, y });
        const slot = resolveSlot(x, y, device.id);
        dropSlotRef.current = slot;
        setDropSlot(slot);
        if (fromLongPress) hapticContextMenu();
        else hapticImpact("medium");
      };

      if (editingRef.current) {
        session.timer = window.setTimeout(
          () => startDrag(session.startX, session.startY, false),
          40,
        );
      } else {
        session.timer = window.setTimeout(
          () => startDrag(session.startX, session.startY, true),
          LONG_PRESS_MS,
        );
      }
      sessionRef.current = session;

      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return;
        const live = sessionRef.current;
        if (!live) return;
        const dx = move.clientX - live.startX;
        const dy = move.clientY - live.startY;
        if (!live.dragging) {
          if (Math.hypot(dx, dy) > CANCEL_MOVE_PX) {
            window.clearTimeout(live.timer);
            if (!editingRef.current) {
              sessionRef.current = null;
              return;
            }
            startDrag(move.clientX, move.clientY, false);
          }
          return;
        }
        setPointer({ x: move.clientX, y: move.clientY });
        const slot = resolveSlot(move.clientX, move.clientY, live.deviceId);
        if (!sameDropSlot(slot, dropSlotRef.current)) {
          dropSlotRef.current = slot;
          setDropSlot(slot);
          if (slot?.isNewRail) hapticImpact("medium");
          else if (slot) hapticSelection();
        }
      };

      const onUp = (up: PointerEvent) => {
        if (up.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        const live = sessionRef.current;
        if (live) window.clearTimeout(live.timer);
        if (live?.dragging) finishDrag();
        else sessionRef.current = null;
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [enabled, finishDrag, resolveSlot],
  );

  const consumeClick = useCallback(() => {
    if (!skipClickRef.current) return false;
    skipClickRef.current = false;
    return true;
  }, []);

  const deleteDevice = useCallback((id: number) => {
    hapticDelete();
    onCommitRef.current(removeDevice(devicesRef.current, id));
    setDraggingId((current) => (current === id ? null : current));
    setDropSlot(null);
  }, []);

  useEffect(() => {
    if (!enabled && editing) exitEdit();
  }, [enabled, editing, exitEdit]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, []);

  return {
    editing,
    draggingId,
    dragging,
    pointer,
    grab,
    dropSlot: preview.placeholder,
    displayRails: preview.rails,
    canAddRail: preview.rails.length < MAX_RAILS,
    newRailIndex: preview.rails.length,
    enterEdit,
    exitEdit,
    onDevicePointerDown,
    consumeClick,
    deleteDevice,
  };
}
