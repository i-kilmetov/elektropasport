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
  ToggleLeft,
  User,
  Wrench,
} from "lucide-react";

export type NoPanelSetupId =
  | "plug_fuses"
  | "packet_switch"
  | "floor_panel_only"
  | "meter_only"
  | "temporary_wiring"
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
  | "action";

export interface NoPanelSetup {
  id: NoPanelSetupId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
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
  person: { icon: User, className: "text-sky-300 bg-sky-500/15" },
  fire: {
    icon: FireExtinguisher,
    className: "text-orange-300 bg-orange-500/15",
  },
  load: { icon: Gauge, className: "text-violet-300 bg-violet-500/15" },
  ops: { icon: Wrench, className: "text-zinc-300 bg-zinc-500/15" },
  norms: { icon: Scale, className: "text-emerald-300 bg-emerald-500/15" },
  control: {
    icon: ClipboardList,
    className: "text-cyan-300 bg-cyan-500/15",
  },
  reliability: {
    icon: ShieldCheck,
    className: "text-teal-300 bg-teal-500/15",
  },
  durability: {
    icon: Lightbulb,
    className: "text-amber-300 bg-amber-500/15",
  },
  action: { icon: LayoutGrid, className: "text-[var(--accent)] bg-[var(--accent)]/15" },
};

/** Типичные схемы без современного квартирного щитка с автоматами. */
export const noPanelSetups: NoPanelSetup[] = [
  {
    id: "plug_fuses",
    title: "Пробки (предохранители)",
    subtitle: "Керамические или автоматические «пробки» вместо линейных автоматов",
    icon: CircleDot,
    iconClass: "from-amber-500/30 to-amber-700/10 text-amber-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "Нет защиты от утечки тока (УЗО/дифавтомат). При повреждении изоляции или касании токоведущих частей риск поражения электрическим током выше.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Пробки часто «усиливают» жучками или ставят больший номинал. Перегрузка проводки не отключается вовремя — нагрев, оплавление изоляции, возгорание.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Обычно 1–2 группы на всю квартиру. Современная техника (духовка, стиральная, кондиционер) легко перегружает одну линию.",
      },
      {
        category: "ops",
        title: "Эксплуатация",
        text: "После срабатывания нужно искать и менять вставку. Нет понятной схемы линий — сложно понять, что именно обесточено.",
      },
    ],
  },
  {
    id: "packet_switch",
    title: "Пакетный выключатель",
    subtitle: "Старый «пакетник» у счётчика — только ручное включение/отключение",
    icon: ToggleLeft,
    iconClass: "from-rose-500/30 to-rose-800/10 text-rose-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "Пакетник не отключает сеть при КЗ и утечке. Он лишь коммутирует питание и сам по себе не защищает человека.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Контакты со временем подгорают, греются и искрят. Без современных автоматов короткое замыкание гасится медленнее и опаснее для проводки.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Нет селективной защиты по комнатам/линиям. Авария на одной розетке может обесточить или повредить всю квартиру.",
      },
      {
        category: "norms",
        title: "Нормы",
        text: "В современном жилье пакетник считается устаревшим решением; его обычно заменяют вводным автоматом и полноценным щитом.",
      },
    ],
  },
  {
    id: "floor_panel_only",
    title: "Только этажный / подъездный щит",
    subtitle: "В квартире нет своего щитка — всё питание из общего щита на площадке",
    icon: Building2,
    iconClass: "from-slate-400/30 to-slate-700/10 text-slate-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "Сложно быстро обесточить квартиру. Доступ к этажному щиту может быть ограничен, а внутри квартиры нет локального отключения линий.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Защита часто стоит одна на всю квартиру и может быть завышена по номиналу. Внутренняя проводка остаётся без адекватной селективной защиты.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Нет разделения на кухню, ванную, освещение и силовые розетки. Перегруз одной ветки влияет на всё жилище.",
      },
      {
        category: "control",
        title: "Учёт и контроль",
        text: "Труднее контролировать состояние своей сети, вести паспорт щита и вовремя замечать проблемные линии.",
      },
    ],
  },
  {
    id: "meter_only",
    title: "Только счётчик",
    subtitle: "Есть прибор учёта, но почти нет вводной и линейной защиты",
    icon: Gauge,
    iconClass: "from-cyan-500/30 to-cyan-800/10 text-cyan-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "При аварии или работах сложно безопасно обесточить линии. Нет устройств защиты от утечки тока.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Счётчик не защищает проводку от перегрузки и КЗ. Без автоматов риск нагрева и пожара существенно выше.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Вся мощность идёт «скопом». Невозможно корректно выделить мощные потребители на отдельные линии.",
      },
      {
        category: "reliability",
        title: "Надёжность",
        text: "Любая неисправность может привести к отключению всего объекта или повреждению кабелей и техники.",
      },
    ],
  },
  {
    id: "temporary_wiring",
    title: "Временная схема / удлинители",
    subtitle: "Питание через переноски, разветвители, «времянки» без стационарного щита",
    icon: Cable,
    iconClass: "from-orange-500/30 to-orange-800/10 text-orange-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "Открытые соединения, скрутки и перегруженные удлинители повышают риск поражения током, особенно во влажных зонах.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Одна из частых причин бытовых пожаров: нагрев разветвителей, тонкий кабель переноски и плохой контакт.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Нет проектных линий. Несколько мощных приборов в одной переноске — перегруз и падение напряжения.",
      },
      {
        category: "durability",
        title: "Долговечность",
        text: "Временная схема со временем «приживается», хотя не рассчитана на постоянную эксплуатацию.",
      },
    ],
  },
  {
    id: "other",
    title: "Другое",
    subtitle: "Нестандартная или смешанная схема, которой нет в списке",
    icon: HelpCircle,
    iconClass: "from-violet-500/30 to-violet-800/10 text-violet-300",
    risks: [
      {
        category: "person",
        title: "Безопасность человека",
        text: "Без понятного щита и схемы линий сложно оценить риски поражения током и правильно обесточить объект.",
      },
      {
        category: "fire",
        title: "Пожаробезопасность",
        text: "Скрытые скрутки, самодельные соединения и неизвестные номиналы защиты — типичные факторы возгорания.",
      },
      {
        category: "load",
        title: "Распределение нагрузок",
        text: "Невозможно гарантировать, что мощные потребители разведены по отдельным защищённым линиям.",
      },
      {
        category: "action",
        title: "Что делать",
        text: "Оптимальный шаг — установить современный щиток с вводным автоматом, УЗО/дифами и раздельными линиями под реальную нагрузку.",
      },
    ],
  },
];

export function getNoPanelSetup(id: NoPanelSetupId): NoPanelSetup {
  return noPanelSetups.find((s) => s.id === id) ?? noPanelSetups[noPanelSetups.length - 1]!;
}
