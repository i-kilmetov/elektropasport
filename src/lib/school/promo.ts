import type { GradeId } from "@/lib/school/types";
import { isGradeId, SCHOOL_GRADE_PRICE_RUB } from "@/lib/school/access";

export type SchoolPromoDiscountType = "percent" | "fixed" | "free";

export type SchoolPromoCode = {
  id: string;
  code: string;
  discountType: SchoolPromoDiscountType;
  discountValue: number;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  usesCount: number;
  gradeIds: GradeId[] | null;
  active: boolean;
  note: string | null;
  createdAt: string;
};

export type SchoolPromoPreview = {
  code: string;
  discountType: SchoolPromoDiscountType;
  discountLabel: string;
  originalAmountRub: number;
  discountRub: number;
  finalAmountRub: number;
};

export type SchoolPaymentLeadPayload = {
  kind: "school";
  gradeId: GradeId;
  promoCodeId?: string;
  promoCode?: string;
  originalAmountRub?: number;
  discountRub?: number;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function parsePromoGradeIds(raw: unknown): GradeId[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const next: GradeId[] = [];
  for (const value of raw) {
    const n = typeof value === "string" ? Number(value) : value;
    if (isGradeId(n) && !next.includes(n)) next.push(n);
  }
  return next.length > 0 ? next : null;
}

export function promoDiscountLabel(
  discountType: SchoolPromoDiscountType,
  discountValue: number,
): string {
  if (discountType === "free") return "Бесплатно";
  if (discountType === "percent") return `−${discountValue}%`;
  return `−${discountValue.toLocaleString("ru-RU")} ₽`;
}

export function computePromoAmounts(
  originalAmountRub: number,
  promo: Pick<SchoolPromoCode, "discountType" | "discountValue">,
): { discountRub: number; finalAmountRub: number } {
  const original = Math.max(0, Math.round(originalAmountRub));
  if (promo.discountType === "free") {
    return { discountRub: original, finalAmountRub: 0 };
  }
  if (promo.discountType === "percent") {
    const discountRub = Math.min(
      original,
      Math.round((original * promo.discountValue) / 100),
    );
    return { discountRub, finalAmountRub: Math.max(0, original - discountRub) };
  }
  const discountRub = Math.min(original, Math.round(promo.discountValue));
  return { discountRub, finalAmountRub: Math.max(0, original - discountRub) };
}

export function validateSchoolPromo(params: {
  promo: SchoolPromoCode;
  gradeId: GradeId;
  alreadyRedeemed: boolean;
  now?: Date;
}): { ok: true; preview: SchoolPromoPreview } | { ok: false; error: string } {
  const { promo, gradeId, alreadyRedeemed } = params;
  const now = params.now ?? new Date();

  if (!promo.active) {
    return { ok: false, error: "Промокод отключён" };
  }
  if (alreadyRedeemed) {
    return { ok: false, error: "Вы уже использовали этот промокод для этого класса" };
  }
  if (promo.validFrom) {
    const from = new Date(promo.validFrom);
    if (now < from) {
      return { ok: false, error: "Промокод ещё не действует" };
    }
  }
  if (promo.validUntil) {
    const until = new Date(promo.validUntil);
    if (now > until) {
      return { ok: false, error: "Срок действия промокода истёк" };
    }
  }
  if (promo.maxUses != null && promo.usesCount >= promo.maxUses) {
    return { ok: false, error: "Промокод уже исчерпан" };
  }
  if (promo.gradeIds && !promo.gradeIds.includes(gradeId)) {
    return { ok: false, error: "Промокод не подходит к этому классу" };
  }

  const originalAmountRub = SCHOOL_GRADE_PRICE_RUB[gradeId];
  const { discountRub, finalAmountRub } = computePromoAmounts(
    originalAmountRub,
    promo,
  );

  return {
    ok: true,
    preview: {
      code: promo.code,
      discountType: promo.discountType,
      discountLabel: promoDiscountLabel(promo.discountType, promo.discountValue),
      originalAmountRub,
      discountRub,
      finalAmountRub,
    },
  };
}

export function parseSchoolPaymentLeadPayload(
  raw: unknown,
): SchoolPaymentLeadPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Partial<SchoolPaymentLeadPayload>;
  if (payload.kind !== "school" || !isGradeId(payload.gradeId)) return null;
  return {
    kind: "school",
    gradeId: payload.gradeId,
    promoCodeId: payload.promoCodeId,
    promoCode: payload.promoCode,
    originalAmountRub: payload.originalAmountRub,
    discountRub: payload.discountRub,
  };
}

export function schoolLeadPromoCode(raw: unknown): string | null {
  const payload = parseSchoolPaymentLeadPayload(raw);
  if (!payload?.promoCode) return null;
  return normalizePromoCode(payload.promoCode);
}

export function validatePromoInput(params: {
  code: string;
  discountType: SchoolPromoDiscountType;
  discountValue: number;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  gradeIds?: GradeId[] | null;
}): { ok: true } | { ok: false; error: string } {
  const code = normalizePromoCode(params.code);
  if (code.length < 3) {
    return { ok: false, error: "Код должен быть не короче 3 символов" };
  }
  if (params.discountType === "percent") {
    if (!Number.isFinite(params.discountValue) || params.discountValue < 1) {
      return { ok: false, error: "Укажите процент от 1 до 100" };
    }
    if (params.discountValue > 100) {
      return { ok: false, error: "Скидка не может быть больше 100%" };
    }
  } else if (params.discountType === "fixed") {
    if (!Number.isFinite(params.discountValue) || params.discountValue < 1) {
      return { ok: false, error: "Укажите сумму скидки в рублях" };
    }
  }
  if (params.validFrom && params.validUntil) {
    if (new Date(params.validFrom) > new Date(params.validUntil)) {
      return { ok: false, error: "Дата начала не может быть позже даты окончания" };
    }
  }
  if (params.maxUses != null) {
    if (!Number.isFinite(params.maxUses) || params.maxUses < 1) {
      return { ok: false, error: "Лимит использований должен быть больше 0" };
    }
  }
  return { ok: true };
}
