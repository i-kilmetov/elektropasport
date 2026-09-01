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
    alt: "Напряжение, ток и мощность",
    chips: [
      { title: "Напряжение", note: "U, вольты", x: "18%", y: "78%" },
      { title: "Ток", note: "I, амперы", x: "50%", y: "82%" },
      { title: "Мощность", note: "P, ватты", x: "82%", y: "78%" },
    ],
  },
  "power-kettle": {
    alt: "Чайник включён в розетку",
    chips: [
      { title: "Чайник 2,3 кВт", x: "32%", y: "22%" },
      { title: "≈ 10 А из розетки", x: "78%", y: "72%" },
    ],
  },
  "three-wires": {
    alt: "Коричневая, синяя и жёлто-зелёная жилы",
    chips: [
      { title: "Фаза L", note: "коричневый", x: "72%", y: "28%" },
      { title: "Ноль N", note: "синий", x: "72%", y: "50%" },
      { title: "Земля PE", note: "жёлто-зелёный", x: "72%", y: "74%" },
    ],
  },
  "socket-wiring": {
    alt: "Розетка и вилка: фаза, ноль, земля",
    chips: [
      { title: "Земля PE", x: "28%", y: "22%" },
      { title: "Ноль N", x: "18%", y: "58%" },
      { title: "Фаза L", x: "42%", y: "58%" },
    ],
  },
  "switch-wiring": {
    alt: "Выключатель в фазе, ноль к лампе напрямую",
    chips: [
      { title: "Выключатель", note: "рвёт фазу", x: "38%", y: "22%" },
      { title: "Лампа", x: "82%", y: "38%" },
      { title: "Ноль", note: "к лампе напрямую", x: "50%", y: "86%" },
    ],
  },
  overload: {
    alt: "Чайник, утюг и фен в одной колодке",
    chips: [
      { title: "Чайник, утюг, фен", x: "50%", y: "16%" },
      { title: "Колодка греется", note: "слишком большой ток", x: "50%", y: "78%" },
    ],
  },
  "panel-anatomy": {
    alt: "Открытый щиток с автоматами и шинами",
    chips: [
      { title: "Вводной", x: "22%", y: "18%" },
      { title: "УЗО", x: "52%", y: "18%" },
      { title: "Группы", x: "42%", y: "78%" },
      { title: "Шины N и PE", x: "82%", y: "48%" },
    ],
  },
  "breaker-cutaway": {
    alt: "Автомат в разрезе",
    chips: [
      { title: "Рычаг", x: "78%", y: "22%" },
      { title: "Тепловая", note: "от нагрева", x: "78%", y: "48%" },
      { title: "Электромагнит", note: "при коротком", x: "78%", y: "78%" },
    ],
  },
  "rcd-leak": {
    alt: "Человек касается стиралки, ток уходит мимо нуля",
    chips: [
      { title: "УЗО", x: "38%", y: "18%" },
      { title: "Утечка", note: "через человека", x: "62%", y: "42%" },
    ],
  },
  "diff-vs-rcd": {
    alt: "Одно УЗО на несколько автоматов и дифавтоматы",
    chips: [
      { title: "Одно УЗО", note: "на несколько линий", x: "22%", y: "14%" },
      { title: "Групповые автоматы", x: "22%", y: "86%" },
      { title: "Дифавтоматы", note: "каждый сам по себе", x: "78%", y: "50%" },
    ],
  },
  "cable-amp": {
    alt: "Три кабеля разной толщины",
    chips: [
      { title: "1,5 мм²", note: "свет, 10 А", x: "78%", y: "22%" },
      { title: "2,5 мм²", note: "розетки, 16 А", x: "78%", y: "50%" },
      { title: "6 мм²", note: "плита, 32 А", x: "78%", y: "78%" },
    ],
  },
  "curve-bcd": {
    alt: "Три автомата с пружинами разной жёсткости",
    chips: [
      { title: "Кривая B", note: "свет", x: "18%", y: "86%" },
      { title: "Кривая C", note: "квартира", x: "50%", y: "86%" },
      { title: "Кривая D", note: "моторы", x: "82%", y: "86%" },
    ],
  },
  "read-panel": {
    alt: "Человек смотрит на щиток",
    chips: [
      { title: "Читаем маркировку", x: "38%", y: "18%" },
    ],
  },
  "din-modules": {
    alt: "Приборы разной ширины на DIN-рейке",
    chips: [
      { title: "DIN-рейка", x: "50%", y: "18%" },
      { title: "1 модуль", note: "18 мм", x: "18%", y: "78%" },
      { title: "2 модуля", note: "36 мм", x: "48%", y: "78%" },
      { title: "3 модуля", note: "54 мм", x: "80%", y: "78%" },
    ],
  },
  "n-pe-bus": {
    alt: "Зелёная шина PE и две синие шины N",
    chips: [
      { title: "PE", note: "одна на всех", x: "22%", y: "14%" },
      { title: "N", note: "своя после каждого УЗО", x: "72%", y: "14%" },
    ],
  },
  "apt-scheme": {
    alt: "Цепочка от ввода к группам",
    chips: [
      { title: "Ввод", x: "12%", y: "22%" },
      { title: "Защита", note: "автомат, реле, УЗО", x: "52%", y: "18%" },
      { title: "Группы", x: "78%", y: "78%" },
    ],
  },
  selectivity: {
    alt: "Одна линия погасла, соседняя и ввод работают",
    chips: [
      { title: "Ввод", note: "остаётся включён", x: "50%", y: "12%" },
      { title: "Авария", note: "отключилась эта линия", x: "78%", y: "48%" },
      { title: "Соседняя линия", note: "горит", x: "28%", y: "82%" },
    ],
  },
  "comb-bar": {
    alt: "Жёлтая гребёнка на ряду автоматов",
    chips: [
      { title: "Гребёнка", note: "фаза на весь ряд", x: "50%", y: "16%" },
      { title: "К линиям", x: "50%", y: "86%" },
    ],
  },
  "assemble-steps": {
    alt: "Корпус, автоматы и инструмент на столе",
    chips: [
      { title: "Автоматы", x: "18%", y: "22%" },
      { title: "Корпус", x: "48%", y: "22%" },
      { title: "Собирать без напряжения", x: "50%", y: "88%" },
    ],
  },
  "common-mistakes": {
    alt: "Слева путаница жил, справа аккуратные шины",
    chips: [
      { title: "Так нельзя", x: "22%", y: "14%" },
      { title: "Так надо", note: "PE и N раздельно", x: "78%", y: "14%" },
    ],
  },
  "test-panel": {
    alt: "Мультиметр, включение рычага и кнопка тест на УЗО",
    chips: [
      { title: "Прозвонка", x: "18%", y: "86%" },
      { title: "Включать по одной", x: "50%", y: "86%" },
      { title: "Кнопка «Тест»", x: "82%", y: "86%" },
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
