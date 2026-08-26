import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Cable,
  CircleDot,
  ClipboardList,
  FireExtinguisher,
  Gauge,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

export type NoPanelSetupId =
  | "plug_fuses"
  | "floor_panel_only"
  | "inlet_cable"
  | "other";

export type RiskCategory =
  | "person"
  | "fire"
  | "load"
  | "ops"
  | "norms"
  | "control"
  | "reliability"
  | "durability"
  | "action"
  | "opportunity";

export interface NoPanelSetup {
  id: NoPanelSetupId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
  /** alarm = scare into action; opportunity = rough-finish / inlet cable */
  tone: "alarm" | "opportunity";
  banner: string;
  risks: {
    category: RiskCategory;
    title: string;
    text: string;
  }[];
}

export const riskCategoryMeta: Record<
  RiskCategory,
  { icon: LucideIcon; className: string }
> = {
  person: { icon: User, className: "text-[#111113] bg-[#D3DA00]" },
  fire: {
    icon: FireExtinguisher,
    className: "text-[#111113] bg-[#D3DA00]",
  },
  load: { icon: Gauge, className: "text-[#111113] bg-zinc-100" },
  ops: { icon: Wrench, className: "text-[#111113] bg-zinc-100" },
  norms: { icon: Scale, className: "text-[#111113] bg-zinc-100" },
  control: {
    icon: ClipboardList,
    className: "text-[#111113] bg-zinc-100",
  },
  reliability: {
    icon: ShieldCheck,
    className: "text-[#111113] bg-zinc-100",
  },
  durability: {
    icon: Lightbulb,
    className: "text-[#111113] bg-zinc-100",
  },
  action: {
    icon: LayoutGrid,
    className: "text-white bg-[#111113]",
  },
  opportunity: {
    icon: Sparkles,
    className: "text-[#111113] bg-[#D3DA00]",
  },
};

/** Типичные схемы без современного квартирного щитка. */
export const noPanelSetups: NoPanelSetup[] = [
  {
    id: "plug_fuses",
    title: "Пробки (предохранители)",
    subtitle: "Керамические или автоматические «пробки» вместо линейных автоматов",
    icon: CircleDot,
    iconClass: "from-amber-500/20 to-amber-100 text-amber-600",
    tone: "alarm",
    banner:
      "Такое исполнение часто встречается в старом жилом фонде. Для современной нагрузки и бытовой техники это уже небезопасно.",
    risks: [
      {
        category: "person",
        title: "Небезопасно",
        text: "Нет защиты от утечки тока (УЗО/дифавтомат). При повреждении изоляции или касании токоведущих частей риск поражения током заметно выше.",
      },
      {
        category: "fire",
        title: "Пожароопасно",
        text: "Пробки часто «усиливают» жучками или ставят больший номинал. Перегрузка проводки не отключается вовремя — нагрев, оплавление изоляции, возгорание.",
      },
      {
        category: "load",
        title: "Не выдержит нагрузку",
        text: "Обычно 1–2 группы на всю квартиру. Духовка, стиральная и кондиционер легко перегружают одну линию.",
      },
      {
        category: "ops",
        title: "Непредсказуемо",
        text: "После срабатывания нужно искать и менять вставку. Нет понятной схемы линий — сложно понять, что именно обесточено.",
      },
    ],
  },
  {
    id: "floor_panel_only",
    title: "Только этажный щит",
    subtitle: "В квартире нет своего щитка — питание идёт из общего щита на площадке",
    icon: Building2,
    iconClass: "from-slate-400/20 to-slate-100 text-slate-600",
    tone: "alarm",
    banner:
      "Частая схема в старых домах: в квартире нет своего щитка, всё завязано на этажный. Это ограничивает безопасность и контроль.",
    risks: [
      {
        category: "person",
        title: "Небезопасно",
        text: "Сложно быстро обесточить квартиру. Доступ к этажному щиту может быть ограничен, а внутри нет локального отключения линий.",
      },
      {
        category: "fire",
        title: "Пожароопасно",
        text: "Защита часто одна на всю квартиру и может быть завышена по номиналу. Внутренняя проводка остаётся без адекватной селективной защиты.",
      },
      {
        category: "load",
        title: "Перегрузка сети",
        text: "Нет разделения на кухню, ванную, освещение и силовые розетки. Авария или перегруз одной ветки бьёт по всему жилищу.",
      },
      {
        category: "control",
        title: "Нет контроля",
        text: "Труднее контролировать свою сеть, понимать состояние линий и вовремя замечать проблемные участки.",
      },
    ],
  },
  {
    id: "inlet_cable",
    title: "Есть только вводной кабель",
    subtitle: "Квартира или дом в черновом исполнении — щитка ещё нет",
    icon: Cable,
    iconClass: "from-emerald-500/20 to-emerald-100 text-emerald-600",
    tone: "opportunity",
    banner:
      "В квартирах и домах с черновым ремонтом это классическое исполнение. В этом есть свои плюсы: можно заранее грамотно проложить все трассы и собрать щиток максимально правильно.",
    risks: [
      {
        category: "opportunity",
        title: "Чистый старт",
        text: "Нет устаревшей «наследия» проводки и самодельных решений. Можно сразу заложить современную схему под реальные нагрузки.",
      },
      {
        category: "opportunity",
        title: "Грамотные трассы",
        text: "На этапе черновой отделки проще развести кабели по комнатам, влажным зонам и мощным потребителям без лишних переделок.",
      },
      {
        category: "opportunity",
        title: "Правильный щиток",
        text: "Щиток собирается с нуля: вводной автомат, УЗО/дифы, раздельные линии и запас под будущую технику и умный дом.",
      },
      {
        category: "action",
        title: "Важно не откладывать",
        text: "Пока ремонта нет — лучший момент спроектировать электрику. После чистовой отделки ошибки исправлять дороже и сложнее.",
      },
    ],
  },
  {
    id: "other",
    title: "Другое / Не знаю",
    subtitle: "Нестандартная схема или пока непонятно, как устроена электрика",
    icon: HelpCircle,
    iconClass: "from-violet-500/20 to-violet-100 text-violet-600",
    tone: "alarm",
    banner:
      "Если схема неизвестна или смешанная, риски оценить сложнее — а значит, выше вероятность скрытых проблем.",
    risks: [
      {
        category: "person",
        title: "Небезопасно",
        text: "Без понятного щита и схемы линий сложно оценить риск поражения током и правильно обесточить объект при аварии.",
      },
      {
        category: "fire",
        title: "Пожароопасно",
        text: "Скрытые скрутки, самодельные соединения и неизвестные номиналы защиты — типичные факторы возгорания.",
      },
      {
        category: "load",
        title: "Непредсказуемая нагрузка",
        text: "Нельзя быть уверенным, что мощные потребители разведены по отдельным защищённым линиям.",
      },
      {
        category: "action",
        title: "Нужна диагностика",
        text: "Лучший шаг — разобрать текущую схему с электриком и собрать современный щиток под реальную нагрузку.",
      },
    ],
  },
];

export function getNoPanelSetup(id: NoPanelSetupId): NoPanelSetup {
  return (
    noPanelSetups.find((s) => s.id === id) ??
    noPanelSetups[noPanelSetups.length - 1]!
  );
}
