import { randomBytes } from "crypto";
import { authErrorResponse } from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertSchoolPromoCode,
  listSchoolPromoCodes,
} from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGradeId } from "@/lib/school/access";
import {
  normalizePromoCode,
  validatePromoInput,
  type SchoolPromoDiscountType,
} from "@/lib/school/promo";
import type { GradeId } from "@/lib/school/types";

function newPromoId(): string {
  return `promo-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

function parseDiscountType(value: unknown): SchoolPromoDiscountType | null {
  return value === "percent" || value === "fixed" || value === "free"
    ? value
    : null;
}

function parseOptionalDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseGradeIds(value: unknown): GradeId[] | null {
  if (value == null || value === "" || value === "all") return null;
  if (!Array.isArray(value)) return null;
  const next: GradeId[] = [];
  for (const item of value) {
    const n = typeof item === "string" ? Number(item) : item;
    if (isGradeId(n) && !next.includes(n)) next.push(n);
  }
  return next.length > 0 ? next : null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    await ensureSchema();
    const items = await listSchoolPromoCodes();
    return Response.json({ items });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    await ensureSchema();
    const body = (await request.json()) as {
      code?: unknown;
      discountType?: unknown;
      discountValue?: unknown;
      validFrom?: unknown;
      validUntil?: unknown;
      maxUses?: unknown;
      gradeIds?: unknown;
      note?: unknown;
    };

    const discountType = parseDiscountType(body.discountType);
    if (!discountType) {
      return Response.json({ error: "Выберите тип скидки" }, { status: 400 });
    }

    const discountValue =
      discountType === "free" ? 0 : Number(body.discountValue ?? 0);
    const validFrom = parseOptionalDate(body.validFrom);
    const validUntil = parseOptionalDate(body.validUntil);
    const maxUsesRaw = body.maxUses;
    const maxUses =
      maxUsesRaw == null || maxUsesRaw === ""
        ? null
        : Number(maxUsesRaw);
    const gradeIds = parseGradeIds(body.gradeIds);
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : null;

    const inputCheck = validatePromoInput({
      code: String(body.code ?? ""),
      discountType,
      discountValue,
      validFrom,
      validUntil,
      maxUses,
      gradeIds,
    });
    if (!inputCheck.ok) {
      return Response.json({ error: inputCheck.error }, { status: 400 });
    }

    const item = await insertSchoolPromoCode({
      id: newPromoId(),
      code: normalizePromoCode(String(body.code ?? "")),
      discountType,
      discountValue,
      validFrom,
      validUntil,
      maxUses,
      gradeIds,
      note,
      createdBy: admin.telegramId,
    });

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
