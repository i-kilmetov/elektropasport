import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertMasterApplication,
  upsertUser,
} from "@/lib/db";
import { notifyAdminMasterApplication } from "@/lib/telegram-notify";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      id?: string;
      city?: string;
      about?: string;
      contactMethod?: "phone" | "telegram";
      phone?: string;
      name?: string;
      educationDocsCount?: number;
      examScore?: number;
      examTotal?: number;
      examGrade?: number;
    };

    if (!body.id || !body.city || !body.contactMethod || !body.name) {
      return Response.json(
        { error: "Некорректные данные заявки мастера" },
        { status: 400 },
      );
    }

    const examGrade = body.examGrade;
    if (examGrade !== 3 && examGrade !== 4 && examGrade !== 5) {
      return Response.json(
        { error: "Нужно сдать экзамен 3 класса школы Током" },
        { status: 400 },
      );
    }

    const docsCount =
      typeof body.educationDocsCount === "number" &&
      body.educationDocsCount >= 1 &&
      body.educationDocsCount <= 3
        ? Math.round(body.educationDocsCount)
        : 0;
    if (docsCount < 1) {
      return Response.json(
        { error: "Приложите фото документов об образовании" },
        { status: 400 },
      );
    }

    const about = body.about?.trim() || undefined;

    await insertMasterApplication(user.telegramId, {
      id: body.id,
      city: body.city,
      about,
      contactMethod: body.contactMethod,
      phone: body.phone,
      name: body.name,
      educationDocsCount: docsCount,
      examScore:
        typeof body.examScore === "number" ? body.examScore : undefined,
      examTotal:
        typeof body.examTotal === "number" ? body.examTotal : undefined,
      examGrade,
    });

    // Must await: Vercel freezes the function after the response is sent.
    try {
      await notifyAdminMasterApplication({
        id: body.id,
        city: body.city,
        about,
        contactMethod: body.contactMethod,
        phone: body.phone,
        name: body.name,
        customerTelegramId: user.telegramId,
        educationDocsCount: docsCount,
        examScore: body.examScore,
        examTotal: body.examTotal,
        examGrade,
      });
    } catch (error) {
      console.error("Failed to notify admin about master application", error);
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
