export const EGG_LANES = 4;
export const EGG_ROWS = 9;
export const EGG_TICK_MS = 220;
export const EGG_START_LIVES = 3;
export const EGG_SPAWN_EVERY = 5;

export type EggKind = "good" | "bad";

export type EggScenario = {
  label: string;
  kind: EggKind;
  explain: string;
};

export type EggItem = {
  id: string;
  lane: number;
  row: number;
  scenario: EggScenario;
};

export type EggFeedback = {
  text: string;
  ok: boolean;
};

export type EggCatchState = {
  wolfSide: 0 | 1;
  eggs: EggItem[];
  score: number;
  lives: number;
  caught: number;
  alive: boolean;
  gameOver: boolean;
  feedback: EggFeedback | null;
  tick: number;
  nextId: number;
};

export const EGG_SCENARIOS: EggScenario[] = [
  {
    label: "УЗО",
    kind: "good",
    explain: "УЗО в ванной и на кухне защищает от ударов током — это правильно.",
  },
  {
    label: "PE",
    kind: "good",
    explain: "Заземление (PE) уводит опасный ток — его нужно подключать.",
  },
  {
    label: "Автомат",
    kind: "good",
    explain: "Автомат на каждую линию ограничивает ток и защищает проводку.",
  },
  {
    label: "Сечение",
    kind: "good",
    explain: "Кабель берут по нагрузке: тонкий провод при перегрузке греется.",
  },
  {
    label: "РН",
    kind: "good",
    explain: "Реле напряжения отключает технику при скачках в сети.",
  },
  {
    label: "УЗИП",
    kind: "good",
    explain: "УЗИП принимает импульс перенапряжения и бережёт электронику.",
  },
  {
    label: "Диф",
    kind: "good",
    explain: "Дифавтомат совмещает защиту линии и от утечки тока.",
  },
  {
    label: "Маркировка",
    kind: "good",
    explain: "Подписи на автоматах помогают быстро найти нужную линию.",
  },
  {
    label: "Скрутка",
    kind: "bad",
    explain: "Скрутка без клеммника — слабый контакт, искра и нагрев.",
  },
  {
    label: "N на корпус",
    kind: "bad",
    explain: "Ноль на корпус опасен: корпус может стать под напряжением.",
  },
  {
    label: "Без PE",
    kind: "bad",
    explain: "Розетка без заземления в новой проводке — нарушение и риск.",
  },
  {
    label: "Перегруз",
    kind: "bad",
    explain: "Тройник на всё сразу перегружает линию и греет провод.",
  },
  {
    label: "Самодел",
    kind: "bad",
    explain: "Самодельный удлинитель без нормальной изоляции — частая причина пожаров.",
  },
  {
    label: "Мокрые руки",
    kind: "bad",
    explain: "Влажные руки у розетки резко повышают риск поражения током.",
  },
  {
    label: "Авт 63А",
    kind: "bad",
    explain: "Слишком «сильный» автомат не защитит тонкий кабель от перегрева.",
  },
  {
    label: "Al+Cu",
    kind: "bad",
    explain: "Соединять алюминий и медь напрямую нельзя — контакт разрушается.",
  },
];

function laneSide(lane: number): 0 | 1 {
  return lane < 2 ? 0 : 1;
}

function pickScenario(rnd: () => number): EggScenario {
  return EGG_SCENARIOS[Math.floor(rnd() * EGG_SCENARIOS.length)]!;
}

export function createEggCatchGame(
  rnd: () => number = Math.random,
): EggCatchState {
  let state: EggCatchState = {
    wolfSide: 0,
    eggs: [],
    score: 0,
    lives: EGG_START_LIVES,
    caught: 0,
    alive: true,
    gameOver: false,
    feedback: null,
    tick: 0,
    nextId: 1,
  };
  state = { ...state, eggs: [spawnEgg(state, rnd)], nextId: 2 };
  state = { ...state, eggs: [...state.eggs, spawnEgg(state, rnd)], nextId: 3 };
  return state;
}

export function setEggWolfSide(
  state: EggCatchState,
  side: 0 | 1,
): EggCatchState {
  if (!state.alive || state.gameOver) return state;
  if (state.wolfSide === side) return state;
  return { ...state, wolfSide: side, feedback: null };
}

function spawnEgg(state: EggCatchState, rnd: () => number): EggItem {
  const lane = Math.floor(rnd() * EGG_LANES);
  return {
    id: `e-${state.nextId}`,
    lane,
    row: 0,
    scenario: pickScenario(rnd),
  };
}

function resolveEgg(
  state: EggCatchState,
  egg: EggItem,
  covered: boolean,
): Pick<EggCatchState, "score" | "lives" | "caught" | "feedback"> {
  const { kind, explain } = egg.scenario;
  if (covered) {
    if (kind === "good") {
      return {
        score: state.score + 10,
        lives: state.lives,
        caught: state.caught + 1,
        feedback: { text: `Верно! ${explain}`, ok: true },
      };
    }
    return {
      score: state.score,
      lives: Math.max(0, state.lives - 1),
      caught: state.caught,
      feedback: { text: `Ошибка! ${explain}`, ok: false },
    };
  }
  if (kind === "good") {
    return {
      score: state.score,
      lives: Math.max(0, state.lives - 1),
      caught: state.caught,
      feedback: { text: `Пропустили! ${explain}`, ok: false },
    };
  }
  return {
    score: state.score + 5,
    lives: state.lives,
    caught: state.caught,
    feedback: { text: `Молодец — не ловили. ${explain}`, ok: true },
  };
}

export function stepEggCatchGame(
  state: EggCatchState,
  rnd: () => number = Math.random,
): EggCatchState {
  if (!state.alive || state.gameOver) return state;

  const catchRow = EGG_ROWS - 1;
  const arriving: EggItem[] = [];
  const moving: EggItem[] = [];

  for (const egg of state.eggs) {
    const row = egg.row + 1;
    if (row >= catchRow) {
      arriving.push({ ...egg, row: catchRow });
    } else {
      moving.push({ ...egg, row });
    }
  }

  let score = state.score;
  let lives = state.lives;
  let caught = state.caught;
  let feedback: EggFeedback | null = state.feedback;

  for (const egg of arriving) {
    const covered = laneSide(egg.lane) === state.wolfSide;
    const result = resolveEgg({ ...state, score, lives, caught }, egg, covered);
    score = result.score;
    lives = result.lives;
    caught = result.caught;
    feedback = result.feedback;
  }

  let eggs = moving;
  const tick = state.tick + 1;
  let nextId = state.nextId;

  if (
    tick % EGG_SPAWN_EVERY === 0 &&
    eggs.length < EGG_LANES &&
    rnd() > 0.12
  ) {
    eggs = [...eggs, spawnEgg({ ...state, nextId }, rnd)];
    nextId += 1;
  }

  const gameOver = lives <= 0;
  return {
    ...state,
    eggs,
    score,
    lives,
    caught,
    feedback,
    tick,
    nextId,
    alive: !gameOver,
    gameOver,
  };
}
