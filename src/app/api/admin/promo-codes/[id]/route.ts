import { authErrorResponse } from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deleteSchoolPromoCode,
  ensureSchema,
  updateSchoolPromoCode,
} from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGradeId } from "@/lib/school/access";
import {
  normalizePromoCode,
  validatePromoInput,
  type SchoolPromoDiscountType,
} from "@/lib/school/promo";
import type { GradeId } from "@/lib/school/types";

function parseDiscountType(value: unknown): SchoolPromoDiscountType | null {
  return value === "percent" || value === "fixed" || value === "free"
    ? value
    : null;
}

function parseOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseGradeIds(value: unknown): GradeId[] | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === "" || value === "all") return null;
  if (!Array.isArray(value)) return null;
  const next: GradeId[] = [];
  for (const item of value) {
    const n = typeof item === "string" ? Number(item) : item;
    if (isGradeId(n) && !next.includes(n)) next.push(n);
  }
  return next.length > 0 ? next : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    await ensureSchema();
    const { id } = await context.params;
    const body = (await request.json()) as {
      code?: unknown;
      discountType?: unknown;
      discountValue?: unknown;
      validFrom?: unknown;
      validUntil?: unknown;
      maxUses?: unknown;
      gradeIds?: unknown;
      active?: unknown;
      note?: unknown;
    };

    const patch: Parameters<typeof updateSchoolPromoCode>[1] = {};
    if (body.code !== undefined) {
      patch.code = normalizePromoCode(String(body.code));
    }
    if (body.discountType !== undefined) {
      const discountType = parseDiscountType(body.discountType);
      if (!discountType) {
        return Response.json({ error: "Некорректный тип скидки" }, { status: 400 });
      }
      patch.discountType = discountType;
    }
    if (body.discountValue !== undefined) {
      patch.discountValue = Number(body.discountValue);
    }
    const validFrom = parseOptionalDate(body.validFrom);
    if (validFrom !== undefined) patch.validFrom = validFrom;
    const validUntil = parseOptionalDate(body.validUntil);
    if (validUntil !== undefined) patch.validUntil = validUntil;
    if (body.maxUses !== undefined) {
      patch.maxUses =
        body.maxUses == null || body.maxUses === ""
          ? null
          : Number(body.maxUses);
    }
    const gradeIds = parseGradeIds(body.gradeIds);
    if (gradeIds !== undefined) patch.gradeIds = gradeIds;
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.note !== undefined) {
      patch.note =
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim()
          : null;
    }

    if (patch.code || patch.discountType || patch.discountValue !== undefined) {
      const inputCheck = validatePromoInput({
        code: patch.code ?? "PROMO",
        discountType: patch.discountType ?? "percent",
        discountValue: patch.discountValue ?? 10,
        validFrom: patch.validFrom ?? null,
        validUntil: patch.validUntil ?? null,
        maxUses: patch.maxUses ?? null,
        gradeIds: patch.gradeIds ?? null,
      });
      if (!inputCheck.ok && patch.code) {
        return Response.json({ error: inputCheck.error }, { status: 400 });
      }
    }

    const item = await updateSchoolPromoCode(id, patch);
    if (!item) {
      return Response.json({ error: "Промокод не найден" }, { status: 404 });
    }
    return Response.json({ item });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    await ensureSchema();
    const { id } = await context.params;
    const deleted = await deleteSchoolPromoCode(id);
    if (!deleted) {
      return Response.json({ error: "Промокод не найден" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
