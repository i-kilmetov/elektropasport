export const RESEARCH_SURVEY_START_PARAMS = new Set(["research", "survey"]);

/** Payload after `/start` or `/start@bot`, e.g. `research`. */
export function parseTelegramStartCommand(text?: string | null): string | null {
  if (!text) return null;
  const match = text
    .trim()
    .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?$/i);
  return match?.[1]?.trim() || null;
}

export const RESEARCH_SURVEY_TOTAL_STEPS = 25;

export type SurveyQuestionKind = "single" | "multi" | "text";

export type SurveyTopic =
  | "about"
  | "knowledge"
  | "panel"
  | "appliances"
  | "help"
  | "priorities";

export const SURVEY_TOPIC_LABEL: Record<SurveyTopic, string> = {
  about: "О вас",
  knowledge: "Электрика",
  panel: "Щиток",
  appliances: "Техника",
  help: "Помощь",
  priorities: "Важно",
};

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
  topic?: SurveyTopic;
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

const PRIORITY_OPTIONS: SurveyOption[] = [
  {
    id: "principles",
    label: "Разобраться, как домашняя электрика работает в принципе",
  },
  { id: "own_panel", label: "Разобраться в своём щитке" },
  {
    id: "quick_help",
    label: "Иметь возможность быстро вызвать помощь",
  },
  {
    id: "manuals",
    label: "Каталог своей техники: все бумажки в одном месте",
  },
  {
    id: "load",
    label: "Понять, потянет ли сеть новую технику",
  },
  { id: "safety_now", label: "Понять, не опасно ли сейчас дома" },
];

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
    topic: "about",
    title: "Вы пользуетесь электричеством?",
    options: [{ id: "yes", label: "Да" }],
  },
  q_sex: {
    id: "q_sex",
    kind: "single",
    required: true,
    topic: "about",
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
    topic: "about",
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
  k1: {
    id: "k1",
    kind: "single",
    required: true,
    topic: "knowledge",
    title: "Насколько вы понимаете, как устроена электрика дома?",
    options: [
      { id: "explain", label: "Могу объяснить, как устроена схема" },
      {
        id: "general",
        label: "В общих чертах: автомат, УЗО, заземление",
      },
      {
        id: "where_panel",
        label: "Знаю, где щиток, но не как это работает",
      },
      { id: "avoid", label: "Стараюсь в это не лезть" },
      { id: "none", label: "Совсем не разбираюсь" },
    ],
  },
  k2: {
    id: "k2",
    kind: "multi",
    required: true,
    topic: "knowledge",
    title: "Что из этого можете объяснить своими словами?",
    hint: "Можно несколько вариантов.",
    exclusiveOptionId: "none",
    options: [
      { id: "breaker", label: "Зачем нужен автомат" },
      { id: "rcd", label: "Чем УЗО отличается от автомата" },
      { id: "earth", label: "Что такое заземление и зачем оно" },
      {
        id: "trip",
        label: "Почему выбивает автомат: перегруз или короткое замыкание",
      },
      { id: "none", label: "Ничего из этого" },
    ],
  },
  k3: {
    id: "k3",
    kind: "single",
    required: true,
    topic: "knowledge",
    title: "Если дома моргнул свет или выбило — вы скорее…",
    options: [
      { id: "check_panel", label: "Понимаю, что проверить в щитке" },
      { id: "search", label: "Поищу в интернете, что это значит" },
      { id: "ask", label: "Позову того, кто шарит" },
      { id: "wait", label: "Подожду, само пройдёт" },
      { id: "lost", label: "Не знаю, с чего начать" },
    ],
  },
  q2: {
    id: "q2",
    kind: "single",
    required: true,
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
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
        label:
          "Счётчик и автоматы на столбе / в щите на участке, в доме почти ничего нет",
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
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
    title:
      "Заглядывали ли вы вообще, откуда в жильё приходит кабель и что стоит на вводе?",
    options: [
      { id: "looked_got_it", label: "Да, смотрел и примерно понял" },
      { id: "looked_lost", label: "Открывал, ничего не понял" },
      { id: "never", label: "Нет, не лез" },
      { id: "afraid", label: "Боюсь туда лезть" },
    ],
  },
  q7: {
    id: "q7",
    kind: "single",
    required: true,
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
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
    topic: "panel",
    title: "Когда в последний раз меняли или серьёзно переделывали электрику?",
    options: [
      { id: "lt5", label: "До 5 лет назад" },
      { id: "5to15", label: "5–15 лет" },
      { id: "gt15", label: "15+ лет / не припомню, чтобы меняли" },
      { id: "newbuild", label: "Новостройка, заводская схема" },
      { id: "unknown", label: "Не знаю" },
    ],
  },
  a1: {
    id: "a1",
    kind: "single",
    required: true,
    topic: "appliances",
    title:
      "Когда покупаете крупную технику, думаете ли, потянет ли её проводка и автомат?",
    hint: "Стиральная, духовка, кондиционер, бойлер, посудомойка.",
    options: [
      { id: "check_pro", label: "Да, смотрю щиток или спрашиваю электрика" },
      { id: "sticker", label: "Смотрю мощность на ценнике — и дальше наугад" },
      { id: "plug_hope", label: "Включаю и смотрю, выбьет или нет" },
      { id: "never", label: "Не думал, что это связано" },
    ],
  },
  a2: {
    id: "a2",
    kind: "multi",
    required: true,
    topic: "appliances",
    title: "Что из этого про вашу технику уже было?",
    hint: "Можно несколько вариантов.",
    exclusiveOptionId: "none",
    options: [
      {
        id: "trips_with_load",
        label: "Выбивает автомат, когда включается стиральная / духовка / чайник",
      },
      { id: "tees", label: "На кухне живут удлинители и тройники" },
      {
        id: "unknown_load",
        label: "Не уверен, потянет ли сеть ещё одну крупную вещь",
      },
      {
        id: "wet_unsafe",
        label: "Не уверен, безопасно ли подключены стиральная / посудомойка / бойлер",
      },
      { id: "none", label: "Ничего из этого" },
    ],
  },
  a3: {
    id: "a3",
    kind: "single",
    required: true,
    topic: "appliances",
    title: "Где сейчас паспорта и инструкции к холодильнику, стиралке, духовке?",
    options: [
      { id: "folder", label: "Папка или ящик — быстро найду" },
      { id: "somewhere", label: "Где-то дома, искать придётся" },
      { id: "phone", label: "Фото и PDF в телефоне, вперемешку" },
      { id: "google", label: "Выкинул коробку, гуглю модель" },
      { id: "gone", label: "Даже модель не вспомню" },
    ],
  },
  h1: {
    id: "h1",
    kind: "single",
    required: true,
    topic: "help",
    title: "Если с электрикой что-то не так, что сделаете в первую очередь?",
    options: [
      { id: "google", label: "Погуглю / спрошу в чате" },
      { id: "friend", label: "Позову знакомого «кто шарит»" },
      { id: "call_pro", label: "Вызову электрика и отдам ему всё" },
      { id: "diy", label: "Полезю сам" },
      { id: "endure", label: "Буду терпеть, пока совсем не сломается" },
    ],
  },
  h2: {
    id: "h2",
    kind: "single",
    required: true,
    topic: "help",
    title: "Как обычно ищете, кому писать или звонить?",
    options: [
      { id: "aggregators", label: "Авито, Профи, Юду и похожие" },
      { id: "uk", label: "УК / диспетчер дома" },
      { id: "friends", label: "Знакомый мастер или рекомендация" },
      { id: "chats", label: "Чат дома, соседи, Telegram" },
      { id: "diy", label: "Никому: разбираюсь сам" },
      { id: "never", label: "Ещё не искал" },
    ],
  },
  h3: {
    id: "h3",
    kind: "single",
    required: true,
    topic: "help",
    title: "Как понимаете, что цена работы нормальная?",
    options: [
      { id: "quotes", label: "Сравниваю 2–3 предложения" },
      { id: "friends_paid", label: "Спрашиваю, сколько платили знакомые" },
      { id: "google_avg", label: "Смотрю «средние цены» в интернете" },
      { id: "trust_first", label: "Верю тому, кто приехал первым" },
      { id: "pay_fix", label: "Плачу сколько скажут, лишь бы сделали" },
      { id: "never_paid", label: "Пока не заказывал работы" },
    ],
  },
  h4: {
    id: "h4",
    kind: "single",
    required: true,
    topic: "help",
    title: "Если непонятно — выбивает, искра, новая техника — что удобнее?",
    options: [
      { id: "online", label: "Сначала короткий разбор онлайн, без визита" },
      { id: "visit", label: "Чтобы сразу приехал мастер" },
      { id: "instructions", label: "Разберусь сам по понятной инструкции" },
      { id: "cheap", label: "Неважно как, лишь бы дешевле" },
    ],
  },
  p1: {
    id: "p1",
    kind: "multi",
    required: true,
    topic: "priorities",
    title: "Что из этого для вас сейчас важнее?",
    hint: "Можно несколько вариантов.",
    options: PRIORITY_OPTIONS,
  },
  p2: {
    id: "p2",
    kind: "single",
    required: true,
    topic: "priorities",
    title: "А что одно — самое важное?",
    options: PRIORITY_OPTIONS,
  },
  q16: {
    id: "q16",
    kind: "single",
    required: true,
    topic: "about",
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
    topic: "about",
    title: "В каком городе это жильё?",
    hint: "Можно пропустить.",
    placeholder: "Москва, Казань…",
  },
};

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
  if (stepId === "p2") {
    const selected = new Set(asStringArray(answers.p1));
    const base = questions.p2!;
    const options = (base.options ?? []).filter((option) =>
      selected.has(option.id),
    );
    return { ...base, options: options.length > 0 ? options : base.options };
  }
  const question = questions[stepId];
  if (!question) throw new Error(`Unknown survey step: ${stepId}`);
  return question;
}

const NEXT_STEP: Record<string, string | "done"> = {
  q1: "q_sex",
  q_sex: "q_age",
  q_age: "k1",
  k1: "k2",
  k2: "k3",
  k3: "q2",
  q2: "q3",
  q3: "q4",
  q4: "q5",
  q5: "q7",
  q7: "q8",
  q8: "q9",
  q9: "q10",
  q10: "a1",
  a1: "a2",
  a2: "a3",
  a3: "h1",
  h1: "h2",
  h2: "h3",
  h3: "h4",
  h4: "p1",
  p2: "q16",
  q16: "q17",
  q17: "done",
};

export function nextSurveyStep(
  stepId: string,
  answers: SurveyAnswers,
): string | "done" {
  if (stepId === "p1") {
    return asStringArray(answers.p1).length > 1 ? "p2" : "q16";
  }
  return NEXT_STEP[stepId] ?? "done";
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

function hasOption(stepId: string, answers: SurveyAnswers): boolean {
  const question = getSurveyQuestion(stepId, answers);
  return Boolean(
    question.options?.some((option) => option.id === asString(answers[stepId])),
  );
}

function hasMulti(
  stepId: string,
  answers: SurveyAnswers,
  emptyError: string,
): string | null {
  const question = getSurveyQuestion(stepId, answers);
  const selected = asStringArray(answers[stepId]);
  if (selected.length === 0) return emptyError;
  if (selected.some((id) => !question.options?.some((option) => option.id === id))) {
    return "Некорректный ответ в списке";
  }
  return null;
}

export function validateSurveyAnswers(answers: unknown): SurveyValidation {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false, error: "Нет ответов" };
  }
  const data = answers as SurveyAnswers;
  if (asString(data.q1) !== "yes") {
    return { ok: false, error: "Не заполнен первый вопрос" };
  }
  if (!hasOption("q_sex", data)) return { ok: false, error: "Укажите пол" };
  if (!hasOption("q_age", data)) return { ok: false, error: "Укажите возраст" };
  if (!hasOption("k1", data)) {
    return { ok: false, error: "Ответьте, насколько понимаете электрику" };
  }
  const k2Error = hasMulti("k2", data, "Отметьте, что можете объяснить");
  if (k2Error) return { ok: false, error: k2Error };
  if (!hasOption("k3", data)) {
    return { ok: false, error: "Ответьте, что сделаете, если выбьет" };
  }
  if (asString(data.q2) !== "apartment" && asString(data.q2) !== "house") {
    return { ok: false, error: "Выберите тип жилья" };
  }
  if (!hasOption("q3", data)) {
    return { ok: false, error: "Выберите, как организован ввод" };
  }
  const branch = resolveInletBranch(data);
  if (!branch) return { ok: false, error: "Не удалось определить ветку опроса" };

  for (const stepId of [
    "q4",
    "q5",
    "q7",
    "q8",
    "q10",
    "a1",
    "a3",
    "h1",
    "h2",
    "h3",
    "h4",
    "q16",
  ]) {
    if (!hasOption(stepId, data)) {
      return { ok: false, error: "Ответьте на все обязательные вопросы" };
    }
  }

  const q9Error = hasMulti("q9", data, "Отметьте, что из этого с вами было");
  if (q9Error) return { ok: false, error: q9Error };
  const a2Error = hasMulti("a2", data, "Отметьте, что из этого было с техникой");
  if (a2Error) return { ok: false, error: a2Error };
  const p1Error = hasMulti("p1", data, "Отметьте, что для вас важнее");
  if (p1Error) return { ok: false, error: p1Error };

  if (asStringArray(data.p1).length > 1 && !hasOption("p2", data)) {
    return { ok: false, error: "Выберите, что одно самое важное" };
  }

  if (asString(data.q17).trim().length > 80) {
    return { ok: false, error: "Слишком длинное название города" };
  }
  return { ok: true, branch };
}

const LABEL_STEPS = [
  "q1",
  "q_sex",
  "q_age",
  "k1",
  "k2",
  "k3",
  "q2",
  "q3",
  "q4",
  "q5",
  "q7",
  "q8",
  "q9",
  "q10",
  "a1",
  "a2",
  "a3",
  "h1",
  "h2",
  "h3",
  "h4",
  "p1",
  "p2",
  "q16",
] as const;

export const SURVEY_SHEET_HEADERS = [
  "timestamp",
  "telegram_id",
  "username",
  "first_name",
  "branch",
  ...LABEL_STEPS,
  "q17_city",
  ...LABEL_STEPS.map((step) => `${step}_id`),
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
      ...LABEL_STEPS.map((step) => formatAnswerLabel(step, answers)),
      asString(answers.q17).trim(),
      ...LABEL_STEPS.map((step) => ids(step)),
    ],
  };
}
