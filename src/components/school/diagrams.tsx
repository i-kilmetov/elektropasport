import type { CSSProperties } from "react";
import type { DiagramId } from "@/lib/school/types";

type SketchChip = {
  title: string;
  note?: string;
  x: string;
  y: string;
};

const SKETCHES: Record<
  DiagramId,
  { alt: string; chips: SketchChip[] }
> = {
  "water-analogy": {
    alt: "Насос — напряжение, труба — сопротивление, поток воды — ток",
    chips: [
      { title: "Насос = напряжение", note: "U, вольты", x: "22%", y: "64%" },
      { title: "Труба = сопротивление", note: "R, омы", x: "50%", y: "26%" },
      { title: "Поток = ток", note: "I, амперы", x: "80%", y: "72%" },
    ],
  },
  "units-trio": {
    alt: "Розетка — напряжение, поток — ток, лампа — мощность",
    chips: [
      { title: "Розетка = напряжение", note: "U, вольты", x: "18%", y: "78%" },
      { title: "Поток = ток", note: "I, амперы", x: "50%", y: "82%" },
      { title: "Лампа = мощность", note: "P, ватты", x: "82%", y: "78%" },
    ],
  },
  "power-kettle": {
    alt: "Чайник берёт мощность из розетки как ток",
    chips: [
      { title: "Чайник = мощность", note: "P, 2,3 кВт", x: "32%", y: "22%" },
      { title: "Из розетки = ток", note: "I ≈ 10 А", x: "78%", y: "72%" },
    ],
  },
  "three-wires": {
    alt: "Три жилы: коричневая фаза, синий ноль, жёлто-зелёная земля",
    chips: [
      { title: "Коричневый = фаза", note: "L", x: "72%", y: "28%" },
      { title: "Синий = ноль", note: "N", x: "72%", y: "50%" },
      { title: "Жёлто-зелёный = земля", note: "PE", x: "72%", y: "74%" },
    ],
  },
  "socket-wiring": {
    alt: "Розетка: слева ноль, справа фаза, скобы — земля",
    chips: [
      { title: "Скобы = земля", note: "PE", x: "28%", y: "22%" },
      { title: "Левое гнездо = ноль", note: "N", x: "18%", y: "58%" },
      { title: "Правое гнездо = фаза", note: "L", x: "42%", y: "58%" },
    ],
  },
  "switch-wiring": {
    alt: "Выключатель рвёт фазу, ноль идёт к лампе напрямую",
    chips: [
      { title: "Выключатель = рвёт фазу", note: "L", x: "38%", y: "22%" },
      { title: "Лампа = нагрузка", x: "82%", y: "38%" },
      { title: "Нижний провод = ноль", note: "N, напрямую", x: "50%", y: "86%" },
    ],
  },
  overload: {
    alt: "Тройник перегревается от нескольких мощных приборов",
    chips: [
      { title: "Три прибора = нагрузка", note: "сумма ватт", x: "50%", y: "16%" },
      { title: "Колодка = перегрев", note: "ток больше 16 А", x: "50%", y: "78%" },
    ],
  },
  "panel-anatomy": {
    alt: "Щиток: вводной, УЗО, групповые автоматы, шины",
    chips: [
      { title: "Слева сверху = вводной", note: "главный автомат", x: "22%", y: "18%" },
      { title: "С кнопкой = УЗО", note: "утечка, мА", x: "52%", y: "18%" },
      { title: "Нижний ряд = группы", note: "линии квартиры", x: "42%", y: "78%" },
      { title: "Шины справа = N и PE", x: "82%", y: "48%" },
    ],
  },
  "breaker-cutaway": {
    alt: "Автомат внутри: рычаг, тепловая, электромагнит",
    chips: [
      { title: "Зелёный блок = рычаг", note: "вкл / выкл", x: "78%", y: "22%" },
      { title: "Тяга = тепловая", note: "медленно, от нагрева", x: "78%", y: "48%" },
      { title: "Катушка = электромагнит", note: "мгновенно при КЗ", x: "78%", y: "78%" },
    ],
  },
  "rcd-leak": {
    alt: "Утечка через человека, УЗО сравнивает фазу и ноль",
    chips: [
      { title: "Коробка = УЗО", note: "фаза ≠ ноль", x: "38%", y: "18%" },
      { title: "Пунктир = утечка", note: "через человека", x: "62%", y: "42%" },
    ],
  },
  "diff-vs-rcd": {
    alt: "Одно УЗО на несколько автоматов против дифавтоматов",
    chips: [
      { title: "Слева = одно УЗО", note: "на несколько линий", x: "22%", y: "14%" },
      { title: "Автоматы снизу = группы", x: "22%", y: "86%" },
      { title: "Справа = дифавтоматы", note: "УЗО + автомат в одном", x: "78%", y: "50%" },
    ],
  },
  "cable-amp": {
    alt: "Чем толще жила, тем больший ток без перегрева",
    chips: [
      { title: "Тонкий = свет", note: "1,5 мм² · 10 А", x: "78%", y: "22%" },
      { title: "Средний = розетки", note: "2,5 мм² · 16 А", x: "78%", y: "50%" },
      { title: "Толстый = плита", note: "6 мм² · 32 А", x: "78%", y: "78%" },
    ],
  },
  "curve-bcd": {
    alt: "Кривые B, C и D как пружины разной жёсткости",
    chips: [
      { title: "Слабая пружина = B", note: "свет", x: "18%", y: "86%" },
      { title: "Средняя = C", note: "квартира", x: "50%", y: "86%" },
      { title: "Жёсткая = D", note: "моторы", x: "82%", y: "86%" },
    ],
  },
  "read-panel": {
    alt: "Человек читает маркировку приборов в щитке",
    chips: [
      { title: "Палец = читаем подписи", note: "не цвет корпуса", x: "38%", y: "22%" },
      { title: "Рычаги = номиналы", note: "C16, C10, 30 мА", x: "78%", y: "28%" },
    ],
  },
  "din-modules": {
    alt: "DIN-рейка и модули разной ширины",
    chips: [
      { title: "Рейка = DIN", note: "посадка приборов", x: "50%", y: "18%" },
      { title: "Узкий = 1 модуль", note: "18 мм", x: "18%", y: "78%" },
      { title: "Средний = 2 модуля", note: "36 мм", x: "48%", y: "78%" },
      { title: "Широкий = 3 модуля", note: "54 мм", x: "80%", y: "78%" },
    ],
  },
  "n-pe-bus": {
    alt: "Общая шина PE и отдельные шины N после УЗО",
    chips: [
      { title: "Зелёная шина = PE", note: "одна на всех", x: "22%", y: "14%" },
      { title: "Синие шины = N", note: "своя после каждого УЗО", x: "72%", y: "14%" },
    ],
  },
  "apt-scheme": {
    alt: "Цепочка щитка: ввод, защита, группы",
    chips: [
      { title: "Зелёный = ввод", x: "12%", y: "22%" },
      { title: "Цепочка = защита", note: "автомат → реле → УЗО", x: "52%", y: "18%" },
      { title: "Три снизу = группы", note: "линии квартиры", x: "78%", y: "78%" },
    ],
  },
  selectivity: {
    alt: "При аварии отключается только своя линия, ввод остаётся",
    chips: [
      { title: "Верхний = ввод", note: "остаётся включён", x: "50%", y: "12%" },
      { title: "Правый = авария", note: "отключилась эта линия", x: "78%", y: "48%" },
      { title: "Левая лампа = соседняя", note: "работает", x: "28%", y: "82%" },
    ],
  },
  "comb-bar": {
    alt: "Гребёнка раздаёт фазу на ряд автоматов",
    chips: [
      { title: "Жёлтая планка = гребёнка", note: "фаза на весь ряд", x: "50%", y: "16%" },
      { title: "Низ = отходящие линии", note: "каждая своя", x: "50%", y: "86%" },
    ],
  },
  "assemble-steps": {
    alt: "Сборка щитка на столе, без напряжения",
    chips: [
      { title: "Стол = без напряжения", note: "собираем на столе", x: "50%", y: "88%" },
      { title: "Корпус = рейки", note: "сначала место", x: "48%", y: "22%" },
      { title: "Слева = приборы", note: "потом посадка", x: "18%", y: "22%" },
    ],
  },
  "common-mistakes": {
    alt: "Слева свалка жил, справа раздельные шины PE и N",
    chips: [
      { title: "Слева = как нельзя", note: "свалка жил", x: "22%", y: "14%" },
      { title: "Справа = как надо", note: "PE и N раздельно", x: "78%", y: "14%" },
    ],
  },
  "test-panel": {
    alt: "Прозвонка, включение по одной линии, тест УЗО",
    chips: [
      { title: "Прибор = прозвонка", note: "нет ли КЗ", x: "18%", y: "86%" },
      { title: "Палец = включение", note: "по одной линии", x: "50%", y: "86%" },
      { title: "Кнопка Т = тест УЗО", note: "должна отключить", x: "82%", y: "86%" },
    ],
  },
};

export const SCHOOL_SKETCH_ORDER: { id: DiagramId; title: string }[] = [
  { id: "water-analogy", title: "Электричество как вода" },
  { id: "units-trio", title: "Вольты, амперы, ватты" },
  { id: "power-kettle", title: "Мощность в быту" },
  { id: "three-wires", title: "Фаза, ноль, земля" },
  { id: "socket-wiring", title: "Розетка" },
  { id: "switch-wiring", title: "Выключатель" },
  { id: "overload", title: "Перегруз" },
  { id: "panel-anatomy", title: "Что такое щиток" },
  { id: "breaker-cutaway", title: "Автомат внутри" },
  { id: "rcd-leak", title: "УЗО и утечка" },
  { id: "diff-vs-rcd", title: "УЗО и дифавтомат" },
  { id: "cable-amp", title: "Сечение кабеля" },
  { id: "curve-bcd", title: "Кривые B, C, D" },
  { id: "read-panel", title: "Читаем щиток" },
  { id: "din-modules", title: "DIN и модули" },
  { id: "n-pe-bus", title: "Шины N и PE" },
  { id: "apt-scheme", title: "Схема квартиры" },
  { id: "selectivity", title: "Селективность" },
  { id: "comb-bar", title: "Гребёнка" },
  { id: "assemble-steps", title: "Сборка на столе" },
  { id: "common-mistakes", title: "Типичные ошибки" },
  { id: "test-panel", title: "Проверка щитка" },
];

function SketchChipLabel({ chip }: { chip: SketchChip }) {
  return (
    <div
      className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-black/[0.08] bg-white/92 px-3 py-1.5 text-center shadow-[0_1px_4px_rgba(17,17,19,0.08)] backdrop-blur-sm"
      style={{ left: chip.x, top: chip.y }}
    >
      <div className="text-[12px] font-semibold leading-none text-zinc-900">
        {chip.title}
      </div>
      {chip.note ? (
        <div className="mt-1 text-[11px] leading-none text-zinc-500">{chip.note}</div>
      ) : null}
    </div>
  );
}

export function SchoolDiagram({
  id,
  className,
  style,
}: {
  id: DiagramId;
  className?: string;
  style?: CSSProperties;
}) {
  const sketch = SKETCHES[id];
  return (
    <div className={className} style={style}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/school/${id}.png`}
          alt={sketch.alt}
          className="block h-auto w-full select-none rounded-[20px] bg-white"
          draggable={false}
        />
        {sketch.chips.map((chip) => (
          <SketchChipLabel key={`${chip.title}-${chip.x}`} chip={chip} />
        ))}
      </div>
    </div>
  );
}
