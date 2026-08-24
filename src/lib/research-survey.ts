export const RESEARCH_SURVEY_START_PARAMS = new Set(["research", "survey"]);

/** Payload after `/start` or `/start@bot`, e.g. `research`. */
export function parseTelegramStartCommand(text?: string | null): string | null {
  if (!text) return null;
  const match = text
    .trim()
    .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?$/i);
  return match?.[1]?.trim() || null;
}

export const RESEARCH_SURVEY_TOTAL_STEPS = 18;

export type SurveyQuestionKind = "single" | "multi" | "text";

export type SurveyOption = {
  id: string;
  label: string;
};

export type SurveyQuestion = {
  id: string;
  kind: SurveyQuestionKind;
  title: string;
  hint?: string;
  concept?: string;
  required: boolean;
  options?: SurveyOption[];
  placeholder?: string;
  exclusiveOptionId?: string;
};

export type SurveyAnswers = Record<string, string | string[]>;

export type InletBranch = "A" | "B" | "C";

const Q3_APARTMENT_A = new Set(["own_panel"]);
const Q3_APARTMENT_B = new Set(["floor_only", "fuses"]);
const Q3_HOUSE_A = new Set(["street_and_house", "single_in_house"]);
const Q3_HOUSE_B = new Set(["pole_only", "fuses_house"]);

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function resolveInletBranch(answers: SurveyAnswers): InletBranch | null {
  const dwelling = asString(answers.q2);
  const inlet = asString(answers.q3);
  if (!dwelling || !inlet) return null;
  if (dwelling === "apartment") {
    if (Q3_APARTMENT_A.has(inlet)) return "A";
    if (Q3_APARTMENT_B.has(inlet)) return "B";
    return "C";
  }
  if (dwelling === "house") {
    if (Q3_HOUSE_A.has(inlet)) return "A";
    if (Q3_HOUSE_B.has(inlet)) return "B";
    return "C";
  }
  return null;
}

const questions: Record<string, SurveyQuestion> = {
  q1: {
    id: "q1",
    kind: "single",
    required: true,
    title: "Вы пользуетесь электричеством?",
    options: [{ id: "yes", label: "Да" }],
  },
  q_sex: {
    id: "q_sex",
    kind: "single",
    required: true,
    title: "Ваш пол?",
    options: [
      { id: "male", label: "Мужской" },
      { id: "female", label: "Женский" },
      { id: "prefer_not", label: "Предпочитаю не указывать" },
    ],
  },
  q_age: {
    id: "q_age",
    kind: "single",
    required: true,
    title: "Сколько вам лет?",
    options: [
      { id: "18_24", label: "18–24" },
      { id: "25_34", label: "25–34" },
      { id: "35_44", label: "35–44" },
      { id: "45_54", label: "45–54" },
      { id: "55_64", label: "55–64" },
      { id: "65_plus", label: "65 и старше" },
      { id: "prefer_not", label: "Предпочитаю не указывать" },
    ],
  },
  q2: {
    id: "q2",
    kind: "single",
    required: true,
    title: "Вы живёте в многоквартирном доме или в частном?",
    hint: "Если и там, и там — пройдите этот опрос дважды: один раз про квартиру, второй раз про дом.",
    options: [
      { id: "apartment", label: "Многоквартирный дом" },
      { id: "house", label: "Частный дом / таунхаус" },
    ],
  },
  q3_apartment: {
    id: "q3",
    kind: "single",
    required: true,
    title: "Как у вас организован ввод электричества в квартиру?",
    options: [
      { id: "own_panel", label: "В квартире есть свой щиток с автоматами" },
      {
        id: "floor_only",
        label: "Автоматы только в этажном щите на площадке, в квартире щитка нет",
      },
      {
        id: "fuses",
        label: "Пробки (предохранители) — в квартире или на площадке",
      },
      {
        id: "no_panel",
        label: "Кабель заходит в квартиру, щитка ещё нет (новостройка, черновая)",
      },
      { id: "unknown", label: "Не разбирался / не уверен" },
    ],
  },
  q3_house: {
    id: "q3",
    kind: "single",
    required: true,
    title: "Как у вас организован ввод электричества в дом?",
    options: [
      {
        id: "street_and_house",
        label: "Щит на улице или на фасаде, плюс щиток в доме",
      },
      {
        id: "single_in_house",
        label: "Всё в одном щитке в доме (тамбур, гараж, котельная)",
      },
      {
        id: "pole_only",
        label: "Счётчик и автоматы на столбе / в щите на участке, в доме почти ничего нет",
      },
      {
        id: "fuses_house",
        label: "Старые пробки или рубильник, нормального щитка нет",
      },
      { id: "unknown", label: "Не разбирался / не уверен" },
    ],
  },
  q4a: {
    id: "q4",
    kind: "single",
    required: true,
    title: "Автоматы подписаны так, что понятно, что за чем?",
    options: [
      { id: "labeled", label: "Да, можно сразу найти нужный" },
      { id: "partial", label: "Частично / по памяти" },
      { id: "unlabeled", label: "Нет, наугад" },
      { id: "never_opened", label: "Не открывал щиток" },
    ],
  },
  q5a: {
    id: "q5",
    kind: "single",
    required: true,
    title: "Если нужно обесточить только кухню или одну комнату — получится?",
    options: [
      { id: "yes", label: "Да, спокойно" },
      { id: "guess", label: "Придётся угадывать" },
      { id: "all", label: "Выключу всё сразу" },
      { id: "unsure", label: "Не уверен" },
    ],
  },
  q4b: {
    id: "q4",
    kind: "single",
    required: true,
    title: "Вы об этом беспокоитесь — или так и живёте?",
    options: [
      { id: "worry_idle", label: "Беспокоюсь, но ничего с этим не делаю" },
      {
        id: "when_happens",
        label: "Иногда думаю, когда выбивает или пахнет гарью",
      },
      { id: "not_a_problem", label: "Не думал, что это проблема" },
      { id: "good_enough", label: "Знаю, что так себе, но «и так сойдёт»" },
      { id: "planning", label: "Планирую переделать" },
    ],
  },
  q5b: {
    id: "q5",
    kind: "single",
    required: true,
    title: "Если ночью нужно быстро обесточить жильё — вы знаете, как это сделать?",
    options: [
      { id: "know", label: "Да, знаю где и как" },
      { id: "roughly", label: "Примерно, но лезть не хочется" },
      { id: "no_access", label: "Нет / щит на площадке / не мой доступ" },
      { id: "never_thought", label: "Не думал об этом" },
    ],
  },
  q4c: {
    id: "q4",
    kind: "single",
    required: true,
    title: "Кто у вас сейчас «отвечает» за электрику?",
    options: [
      { id: "me_no_map", label: "Я сам, но без схемы в голове" },
      { id: "renovation_master", label: "Мастер, который делал ремонт" },
      { id: "uk", label: "УК / электрик дома" },
      { id: "nobody", label: "Никто конкретно" },
      { id: "unknown", label: "Не знаю" },
    ],
  },
  q5c: {
    id: "q5",
    kind: "single",
    required: true,
    title:
      "Заглядывали ли вы вообще, откуда в жильё приходит кабель и что стоит на вводе?",
    options: [
      { id: "looked_got_it", label: "Да, смотрел и примерно понял" },
      { id: "looked_lost", label: "Открывал, ничего не понял" },
      { id: "never", label: "Нет, не лез" },
      { id: "afraid", label: "Боюсь туда лезть" },
    ],
  },
  q6: {
    id: "q6",
    kind: "single",
    required: true,
    title: "Когда вы в последний раз думали, безопасна ли электрика у вас дома?",
    options: [
      { id: "this_month", label: "На этой неделе / в этом месяце" },
      {
        id: "incident",
        label: "Когда что-то случилось (выбило, запахло, ударило)",
      },
      { id: "avoid", label: "Стараюсь об этом не думать" },
      { id: "never", label: "По сути никогда не задумывался" },
      { id: "fine", label: "Кажется, у меня всё нормально" },
    ],
  },
  q7: {
    id: "q7",
    kind: "single",
    required: true,
    title: "Электрощиток для вас — это скорее…",
    options: [
      { id: "clear", label: "Понятная штука, я в нём ориентируюсь" },
      { id: "closed_box", label: "Коробка, которую не открываю без нужды" },
      { id: "masters_job", label: "Дело мастера, не моё" },
      { id: "avoid", label: "Тема, о которой лучше не думать" },
      { id: "unknown_where", label: "Не знаю, где он у меня" },
    ],
  },
  q8: {
    id: "q8",
    kind: "single",
    required: true,
    title:
      "Есть ли у вас УЗО или дифавтомат — защита, которая спасает человека, а не только проводку?",
    options: [
      { id: "yes", label: "Да, есть" },
      { id: "no", label: "Нет" },
      { id: "what_is_it", label: "Не знаю, что это" },
      { id: "unknown", label: "Не знаю, есть или нет" },
    ],
  },
  q9: {
    id: "q9",
    kind: "multi",
    required: true,
    title: "Что из этого с вами уже было?",
    hint: "Можно несколько вариантов.",
    exclusiveOptionId: "none",
    options: [
      { id: "trips", label: "Часто выбивает автомат" },
      { id: "burn", label: "Запах гари / греется щиток или розетка" },
      { id: "sparks", label: "Искры, оплавленная вилка" },
      { id: "shock", label: "Ударило током" },
      { id: "emergency_call", label: "Вызывали электрика «на аварии»" },
      { id: "none", label: "Ничего из этого" },
    ],
  },
  q10: {
    id: "q10",
    kind: "single",
    required: true,
    title: "Когда в последний раз меняли или серьёзно переделывали электрику?",
    options: [
      { id: "lt5", label: "До 5 лет назад" },
      { id: "5to15", label: "5–15 лет" },
      { id: "gt15", label: "15+ лет / не припомню, чтобы меняли" },
      { id: "newbuild", label: "Новостройка, заводская схема" },
      { id: "unknown", label: "Не знаю" },
    ],
  },
  q11: {
    id: "q11",
    kind: "single",
    required: true,
    title: "Если с электрикой что-то не так, что вы сделаете в первую очередь?",
    options: [
      { id: "google", label: "Погуглю / спрошу в чате" },
      { id: "friend", label: "Позову знакомого «кто шарит»" },
      { id: "call_pro", label: "Вызову электрика и отдам ему всё" },
      { id: "diy", label: "Полезю сам" },
      { id: "endure", label: "Буду терпеть, пока совсем не сломается" },
    ],
  },
  q12: {
    id: "q12",
    kind: "single",
    required: true,
    title: "Что из этого больше про вас?",
    hint: "Один вариант — тот, который ближе всего.",
    options: [
      {
        id: "never_thought",
        label:
          "Не задумывался, что со щитком и электрикой вообще может быть проблема",
      },
      { id: "avoid", label: "Знаю, что это важно, но стараюсь не думать" },
      {
        id: "need_start",
        label: "Понимаю риски, но не знаю, с чего начать и кому можно доверить",
      },
      { id: "in_control", label: "Всё под контролем, разбирать щиток мне не нужно" },
      { id: "recently_done", label: "Недавно уже разбирался / делал щиток" },
    ],
  },
  q13: {
    id: "q13",
    kind: "single",
    required: true,
    title: "Вам такое было бы нужно?",
    concept:
      "Есть сервис: фотографируете щиток (или отвечаете, если щитка нет) — и видите, что внутри, какие риски и что делать: самому или с мастером. Без «страшилок ради страшилок», чтобы было понятно.",
    options: [
      { id: "need_now", label: "Да, прямо сейчас было бы полезно" },
      { id: "need_later", label: "Скорее да, но не горит" },
      { id: "curious", label: "Интересно глянуть из любопытства" },
      { id: "no_self", label: "Нет, разберусь сам / вызову электрика" },
      { id: "no_point", label: "Нет, не вижу в этом смысла" },
    ],
  },
  q14: {
    id: "q14",
    kind: "single",
    required: true,
    title: "Что в этом ценнее всего?",
    options: [
      { id: "safety_now", label: "Понять, не опасно ли сейчас" },
      { id: "which_breaker", label: "Разобраться, какой автомат за что" },
      { id: "diy_or_pro", label: "Понять, что можно сделать самому, а где мастер" },
      {
        id: "peace",
        label: "Чтобы было спокойнее жить / сдать жильё / въехать после ремонта",
      },
      { id: "curiosity", label: "Просто интересно, как это устроено" },
    ],
  },
  q15: {
    id: "q15",
    kind: "single",
    required: true,
    title: "Почему скорее не нужно?",
    options: [
      { id: "already_clear", label: "У меня и так всё понятно" },
      { id: "distrust", label: "Не доверяю приложению в такой теме" },
      {
        id: "not_my_job",
        label: "Электрика — не моя забота (снимаю / есть кто занимается)",
      },
      { id: "avoid", label: "Не хочу об этом думать" },
      { id: "no_time", label: "Слишком сложно / нет времени" },
    ],
  },
  q16: {
    id: "q16",
    kind: "single",
    required: true,
    title: "Вы в этом жилье…",
    options: [
      { id: "owner", label: "Собственник" },
      { id: "tenant", label: "Снимаю" },
      { id: "family", label: "Живу у родных / не я решаю по ремонту" },
    ],
  },
  q17: {
    id: "q17",
    kind: "text",
    required: false,
    title: "В каком городе это жильё?",
    hint: "Можно пропустить.",
    placeholder: "Москва, Казань…",
  },
};

const Q13_POSITIVE = new Set(["need_now", "need_later", "curious"]);

export function getSurveyQuestion(
  stepId: string,
  answers: SurveyAnswers,
): SurveyQuestion {
  if (stepId === "q3") {
    return asString(answers.q2) === "house"
      ? questions.q3_house!
      : questions.q3_apartment!;
  }
  if (stepId === "q4" || stepId === "q5") {
    const branch = resolveInletBranch(answers) ?? "C";
    return questions[`${stepId}${branch.toLowerCase()}`]!;
  }
  const question = questions[stepId];
  if (!question) throw new Error(`Unknown survey step: ${stepId}`);
  return question;
}

export function nextSurveyStep(
  stepId: string,
  answers: SurveyAnswers,
): string | "done" {
  if (stepId === "q1") return "q_sex";
  if (stepId === "q_sex") return "q_age";
  if (stepId === "q_age") return "q2";
  if (stepId === "q2") return "q3";
  if (stepId === "q3") return "q4";
  if (stepId === "q4") return "q5";
  if (stepId === "q5") return "q6";
  if (stepId === "q6") return "q7";
  if (stepId === "q7") return "q8";
  if (stepId === "q8") return "q9";
  if (stepId === "q9") return "q10";
  if (stepId === "q10") return "q11";
  if (stepId === "q11") return "q12";
  if (stepId === "q12") return "q13";
  if (stepId === "q13") {
    return Q13_POSITIVE.has(asString(answers.q13)) ? "q14" : "q15";
  }
  if (stepId === "q14" || stepId === "q15") return "q16";
  if (stepId === "q16") return "q17";
  return "done";
}

function optionLabel(question: SurveyQuestion, optionId: string): string {
  return question.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

export function formatAnswerLabel(
  stepId: string,
  answers: SurveyAnswers,
): string {
  const value = answers[stepId];
  if (stepId === "q17") return asString(value).trim();
  const question = getSurveyQuestion(stepId, answers);
  if (Array.isArray(value)) {
    return value.map((id) => optionLabel(question, id)).join(" | ");
  }
  if (!value) return "";
  return optionLabel(question, value);
}

export type SurveyValidation =
  | { ok: true; branch: InletBranch }
  | { ok: false; error: string };

export function validateSurveyAnswers(answers: unknown): SurveyValidation {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false, error: "Нет ответов" };
  }
  const data = answers as SurveyAnswers;
  if (asString(data.q1) !== "yes") {
    return { ok: false, error: "Не заполнен первый вопрос" };
  }
  const sex = getSurveyQuestion("q_sex", data);
  if (!sex.options?.some((option) => option.id === asString(data.q_sex))) {
    return { ok: false, error: "Укажите пол" };
  }
  const age = getSurveyQuestion("q_age", data);
  if (!age.options?.some((option) => option.id === asString(data.q_age))) {
    return { ok: false, error: "Укажите возраст" };
  }
  if (asString(data.q2) !== "apartment" && asString(data.q2) !== "house") {
    return { ok: false, error: "Выберите тип жилья" };
  }
  const q3 = getSurveyQuestion("q3", data);
  if (!q3.options?.some((option) => option.id === asString(data.q3))) {
    return { ok: false, error: "Выберите, как организован ввод" };
  }
  const branch = resolveInletBranch(data);
  if (!branch) return { ok: false, error: "Не удалось определить ветку опроса" };

  for (const stepId of ["q4", "q5", "q6", "q7", "q8", "q10", "q11", "q12", "q13", "q16"]) {
    const question = getSurveyQuestion(stepId, data);
    if (!question.options?.some((option) => option.id === asString(data[stepId]))) {
      return { ok: false, error: "Ответьте на все обязательные вопросы" };
    }
  }

  const q9 = getSurveyQuestion("q9", data);
  const selected = asStringArray(data.q9);
  if (selected.length === 0) {
    return { ok: false, error: "Отметьте, что из этого с вами было" };
  }
  if (selected.some((id) => !q9.options?.some((option) => option.id === id))) {
    return { ok: false, error: "Некорректный ответ в списке происшествий" };
  }

  const q13 = asString(data.q13);
  if (Q13_POSITIVE.has(q13)) {
    const q14 = getSurveyQuestion("q14", data);
    if (!q14.options?.some((option) => option.id === asString(data.q14))) {
      return { ok: false, error: "Выберите, что ценнее всего" };
    }
  } else {
    const q15 = getSurveyQuestion("q15", data);
    if (!q15.options?.some((option) => option.id === asString(data.q15))) {
      return { ok: false, error: "Выберите, почему скорее не нужно" };
    }
  }

  if (asString(data.q17).trim().length > 80) {
    return { ok: false, error: "Слишком длинное название города" };
  }
  return { ok: true, branch };
}

export const SURVEY_SHEET_HEADERS = [
  "timestamp",
  "telegram_id",
  "username",
  "first_name",
  "branch",
  "q1",
  "q_sex",
  "q_age",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
  "q13",
  "q14",
  "q15",
  "q16",
  "q17_city",
  "q1_id",
  "q_sex_id",
  "q_age_id",
  "q2_id",
  "q3_id",
  "q4_id",
  "q5_id",
  "q6_id",
  "q7_id",
  "q8_id",
  "q9_id",
  "q10_id",
  "q11_id",
  "q12_id",
  "q13_id",
  "q14_id",
  "q15_id",
  "q16_id",
] as const;

export function buildSurveySheetRow(input: {
  answers: SurveyAnswers;
  branch: InletBranch;
  telegramId?: number | null;
  username?: string | null;
  firstName?: string | null;
  timestamp?: Date;
}): { headers: string[]; values: string[] } {
  const { answers, branch } = input;
  const ids = (key: string) => {
    const value = answers[key];
    if (Array.isArray(value)) return value.join(" | ");
    return typeof value === "string" ? value : "";
  };
  return {
    headers: [...SURVEY_SHEET_HEADERS],
    values: [
      (input.timestamp ?? new Date()).toISOString(),
      input.telegramId != null ? String(input.telegramId) : "",
      input.username ?? "",
      input.firstName ?? "",
      branch,
      formatAnswerLabel("q1", answers),
      formatAnswerLabel("q_sex", answers),
      formatAnswerLabel("q_age", answers),
      formatAnswerLabel("q2", answers),
      formatAnswerLabel("q3", answers),
      formatAnswerLabel("q4", answers),
      formatAnswerLabel("q5", answers),
      formatAnswerLabel("q6", answers),
      formatAnswerLabel("q7", answers),
      formatAnswerLabel("q8", answers),
      formatAnswerLabel("q9", answers),
      formatAnswerLabel("q10", answers),
      formatAnswerLabel("q11", answers),
      formatAnswerLabel("q12", answers),
      formatAnswerLabel("q13", answers),
      formatAnswerLabel("q14", answers),
      formatAnswerLabel("q15", answers),
      formatAnswerLabel("q16", answers),
      asString(answers.q17).trim(),
      ids("q1"),
      ids("q_sex"),
      ids("q_age"),
      ids("q2"),
      ids("q3"),
      ids("q4"),
      ids("q5"),
      ids("q6"),
      ids("q7"),
      ids("q8"),
      ids("q9"),
      ids("q10"),
      ids("q11"),
      ids("q12"),
      ids("q13"),
      ids("q14"),
      ids("q15"),
      ids("q16"),
    ],
  };
}
