import type { CSSProperties, ReactNode } from "react";
import type { DiagramId } from "@/lib/school/types";

const PHASE = "#C2410C";
const NEUTRAL = "#2563EB";
const EARTH = "#65A30D";
const INK = "#18181B";
const MUTED = "#71717A";
const LIME = "#D3DA00";
const CARD = "#FAFAF9";

function Frame({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <svg
      viewBox={wide ? "0 0 360 200" : "0 0 320 180"}
      className="h-auto w-full"
      role="img"
    >
      <rect
        x="0.75"
        y="0.75"
        width={wide ? 358.5 : 318.5}
        height={wide ? 198.5 : 178.5}
        rx="18"
        fill={CARD}
        stroke="rgba(17,17,19,0.08)"
      />
      {children}
    </svg>
  );
}

function Label({
  x,
  y,
  children,
  fill = MUTED,
  size = 10,
  anchor = "middle",
  weight = 600,
}: {
  x: number | string;
  y: number | string;
  children: string;
  fill?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      {children}
    </text>
  );
}

function WaterAnalogy() {
  return (
    <Frame>
      <rect x="28" y="36" width="52" height="70" rx="8" fill="#E4E4E7" />
      <rect x="36" y="28" width="36" height="14" rx="4" fill="#A1A1AA" />
      <Label x="54" y="122" fill={INK}>
        Насос
      </Label>
      <Label x="54" y="136">U, вольты</Label>
      <path
        d="M80 58 H128 C140 58 140 88 160 88 H292"
        fill="none"
        stroke={NEUTRAL}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M80 58 H128 C140 58 140 88 160 88 H250"
        fill="none"
        stroke="#93C5FD"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="118" cy="58" r="4" fill="white" />
      <circle cx="170" cy="88" r="4" fill="white" />
      <circle cx="230" cy="88" r="4" fill="white" />
      <rect x="188" y="74" width="44" height="28" rx="6" fill="#FEF08A" stroke={LIME} />
      <Label x="210" y="92" fill={INK} size={9}>
        кран
      </Label>
      <Label x="210" y="128" fill={INK}>
        Ток I
      </Label>
      <Label x="210" y="142">амперы</Label>
      <Label x="88" y="46" size={9} fill={NEUTRAL} anchor="start">
        труба = провод
      </Label>
    </Frame>
  );
}

function UnitsTrio() {
  const cells = [
    { x: 24, title: "U", sub: "вольты", note: "давление", color: "#FDBA74" },
    { x: 120, title: "I", sub: "амперы", note: "поток", color: "#93C5FD" },
    { x: 216, title: "P", sub: "ватты", note: "работа", color: LIME },
  ];
  return (
    <Frame>
      {cells.map((cell) => (
        <g key={cell.title}>
          <rect x={cell.x} y="36" width="80" height="108" rx="16" fill={cell.color} />
          <Label x={cell.x + 40} y="78" fill={INK} size={28} weight={800}>
            {cell.title}
          </Label>
          <Label x={cell.x + 40} y="102" fill={INK} size={12}>
            {cell.sub}
          </Label>
          <Label x={cell.x + 40} y="122" fill={INK} size={10} weight={500}>
            {cell.note}
          </Label>
        </g>
      ))}
      <Label x="160" y="28" fill={INK} size={12}>
        P = U × I
      </Label>
    </Frame>
  );
}

function PowerKettle() {
  return (
    <Frame>
      <rect x="36" y="40" width="70" height="88" rx="12" fill="#E4E4E7" />
      <path d="M106 70 h22 v28 h-10" fill="none" stroke={INK} strokeWidth="3" />
      <Label x="71" y="88" fill={INK} size={12}>
        2300 Вт
      </Label>
      <Label x="71" y="148">чайник</Label>
      <path d="M130 84 H168" stroke={INK} strokeWidth="2" markerEnd="url(#arrow)" />
      <rect x="176" y="48" width="112" height="72" rx="14" fill={LIME} />
      <Label x="232" y="80" fill={INK} size={18} weight={800}>
        ≈ 10 А
      </Label>
      <Label x="232" y="102" fill={INK} size={11}>
        2300 / 230
      </Label>
      <Label x="232" y="148">столько берёт из розетки</Label>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={INK} />
        </marker>
      </defs>
    </Frame>
  );
}

function ThreeWires() {
  const wires = [
    { y: 48, color: PHASE, name: "L фаза", note: "коричневый / чёрный" },
    { y: 90, color: NEUTRAL, name: "N ноль", note: "синий" },
    { y: 132, color: EARTH, name: "PE земля", note: "жёлто-зелёный" },
  ];
  return (
    <Frame>
      {wires.map((wire) => (
        <g key={wire.name}>
          <rect x="28" y={wire.y - 14} width="264" height="28" rx="14" fill={wire.color} />
          <Label x="48" y={wire.y + 4} fill="white" size={12} anchor="start" weight={700}>
            {wire.name}
          </Label>
          <Label x="276" y={wire.y + 4} fill="white" size={10} anchor="end" weight={500}>
            {wire.note}
          </Label>
        </g>
      ))}
    </Frame>
  );
}

function SocketWiring() {
  return (
    <Frame>
      <rect x="96" y="28" width="128" height="124" rx="18" fill="#F4F4F5" stroke={INK} strokeWidth="2" />
      <circle cx="132" cy="88" r="12" fill="white" stroke={NEUTRAL} strokeWidth="4" />
      <circle cx="188" cy="88" r="12" fill="white" stroke={PHASE} strokeWidth="4" />
      <path
        d="M132 44 h56"
        fill="none"
        stroke={EARTH}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Label x="160" y="38" fill={EARTH} size={10}>
        PE
      </Label>
      <Label x="132" y="128" fill={NEUTRAL} size={11}>
        N слева
      </Label>
      <Label x="188" y="128" fill={PHASE} size={11}>
        L справа
      </Label>
    </Frame>
  );
}

function SwitchWiring() {
  return (
    <Frame wide>
      <Label x="48" y="32" fill={PHASE} size={11} anchor="start">
        фаза L
      </Label>
      <path d="M24 44 H110" stroke={PHASE} strokeWidth="4" />
      <rect x="110" y="28" width="64" height="44" rx="10" fill="#F4F4F5" stroke={INK} />
      <path d="M122 50 H162" stroke={INK} strokeWidth="3" />
      <circle cx="122" cy="50" r="4" fill={PHASE} />
      <circle cx="162" cy="50" r="4" fill={PHASE} />
      <Label x="142" y="88" fill={INK} size={10}>
        выключатель
      </Label>
      <path d="M174 44 H250" stroke={PHASE} strokeWidth="4" />
      <circle cx="268" cy="92" r="28" fill="#FEF9C3" stroke="#CA8A04" strokeWidth="2" />
      <path d="M268 72 v20 M258 100 h20" stroke="#CA8A04" strokeWidth="2" />
      <Label x="268" y="132" fill={INK} size={10}>
        лампа
      </Label>
      <path d="M24 150 H268" stroke={NEUTRAL} strokeWidth="4" />
      <path d="M268 120 V150" stroke={NEUTRAL} strokeWidth="4" />
      <Label x="48" y="170" fill={NEUTRAL} size={11} anchor="start">
        ноль N напрямую
      </Label>
    </Frame>
  );
}

function Overload() {
  return (
    <Frame>
      <rect x="24" y="40" width="90" height="70" rx="12" fill="#FEE2E2" />
      <Label x="69" y="72" fill={INK} size={11}>
        тройник
      </Label>
      <Label x="69" y="90" fill="#B91C1C" size={10}>
        перегрев
      </Label>
      {[
        { x: 140, t: "чайник" },
        { x: 204, t: "утюг" },
        { x: 268, t: "фен" },
      ].map((item) => (
        <g key={item.t}>
          <rect x={item.x - 28} y="48" width="56" height="54" rx="10" fill="#E4E4E7" />
          <Label x={item.x} y="80" fill={INK} size={10}>
            {item.t}
          </Label>
        </g>
      ))}
      <path d="M114 75 H112" stroke={INK} strokeWidth="2" />
      <Label x="160" y="140" fill="#B91C1C" size={12}>
        2 + 2 + 1,8 кВт ≫ 16 А
      </Label>
    </Frame>
  );
}

function Module({
  x,
  y,
  w,
  label,
  fill,
  textFill = INK,
}: {
  x: number | string;
  y: number | string;
  w: number | string;
  label: string;
  fill: string;
  textFill?: string;
}) {
  const nx = Number(x);
  const ny = Number(y);
  const nw = Number(w);
  return (
    <g>
      <rect x={nx} y={ny} width={nw} height="44" rx="6" fill={fill} stroke="rgba(17,17,19,0.12)" />
      <Label x={nx + nw / 2} y={ny + 27} fill={textFill} size={9}>
        {label}
      </Label>
    </g>
  );
}

function PanelAnatomy() {
  return (
    <Frame wide>
      <rect x="20" y="24" width="320" height="152" rx="16" fill="#F4F4F5" />
      <Module x="36" y="40" w="52" label="ввод" fill={INK} textFill="white" />
      <Module x="94" y="40" w="52" label="реле U" fill="#EDE9FE" />
      <Module x="152" y="40" w="64" label="УЗО 30мА" fill="#DCFCE7" />
      <Module x="36" y="96" w="36" label="C16" fill="#FDE68A" />
      <Module x="78" y="96" w="36" label="C16" fill="#FDE68A" />
      <Module x="120" y="96" w="36" label="C10" fill="#FDE68A" />
      <Module x="162" y="96" w="36" label="C16" fill="#FDE68A" />
      <rect x="268" y="40" width="18" height="100" rx="4" fill={EARTH} />
      <rect x="292" y="40" width="18" height="100" rx="4" fill={NEUTRAL} />
      <Label x="277" y="158" fill={EARTH} size={9}>
        PE
      </Label>
      <Label x="301" y="158" fill={NEUTRAL} size={9}>
        N
      </Label>
      <Label x="100" y="162" fill={MUTED} size={10}>
        группы
      </Label>
    </Frame>
  );
}

function BreakerCutaway() {
  return (
    <Frame>
      <rect x="90" y="24" width="140" height="132" rx="12" fill="#E4E4E7" stroke={INK} />
      <rect x="148" y="36" width="24" height="36" rx="4" fill={LIME} />
      <Label x="160" y="58" fill={INK} size={9}>
        рычаг
      </Label>
      <rect x="118" y="84" width="84" height="22" rx="6" fill="#FDBA74" />
      <Label x="160" y="99" fill={INK} size={9}>
        тепловая
      </Label>
      <rect x="118" y="114" width="84" height="22" rx="6" fill="#93C5FD" />
      <Label x="160" y="129" fill={INK} size={9}>
        электромагнит
      </Label>
    </Frame>
  );
}

function RcdLeak() {
  return (
    <Frame>
      <path d="M40 50 H140" stroke={PHASE} strokeWidth="5" />
      <path d="M40 120 H140" stroke={NEUTRAL} strokeWidth="5" />
      <rect x="140" y="40" width="70" height="90" rx="12" fill="#DCFCE7" stroke={EARTH} />
      <Label x="175" y="88" fill={INK} size={12}>
        УЗО
      </Label>
      <path d="M210 50 H280" stroke={PHASE} strokeWidth="5" />
      <path d="M210 120 H240" stroke={NEUTRAL} strokeWidth="5" />
      <path d="M280 50 L300 90 L260 150" stroke={PHASE} strokeWidth="3" strokeDasharray="4 3" />
      <circle cx="260" cy="158" r="12" fill="#FECACA" />
      <Label x="260" y="162" fill={INK} size={9}>
        !
      </Label>
      <Label x="80" y="40" fill={PHASE} size={10}>
        10 А
      </Label>
      <Label x="80" y="142" fill={NEUTRAL} size={10}>
        9,97 А
      </Label>
      <Label x="175" y="168" fill="#B91C1C" size={11}>
        разница = утечка
      </Label>
    </Frame>
  );
}

function DiffVsRcd() {
  return (
    <Frame wide>
      <rect x="20" y="28" width="150" height="144" rx="14" fill="#F4F4F5" />
      <Label x="95" y="50" fill={INK} size={11}>
        УЗО + автоматы
      </Label>
      <Module x="36" y="62" w="118" label="УЗО 30 мА" fill="#DCFCE7" />
      <Module x="36" y="114" w="34" label="16" fill="#FDE68A" />
      <Module x="76" y="114" w="34" label="16" fill="#FDE68A" />
      <Module x="116" y="114" w="34" label="10" fill="#FDE68A" />
      <rect x="190" y="28" width="150" height="144" rx="14" fill="#F4F4F5" />
      <Label x="265" y="50" fill={INK} size={11}>
        дифавтоматы
      </Label>
      <Module x="206" y="70" w="118" label="C16 / 30 мА" fill="#BBF7D0" />
      <Module x="206" y="122" w="118" label="C16 / 30 мА" fill="#BBF7D0" />
    </Frame>
  );
}

function CableAmp() {
  const rows = [
    { y: 40, w: 8, t: "1,5 мм²", n: "10 А свет" },
    { y: 78, w: 12, t: "2,5 мм²", n: "16 А розетки" },
    { y: 116, w: 16, t: "6 мм²", n: "32 А плита" },
  ];
  return (
    <Frame>
      {rows.map((row) => (
        <g key={row.t}>
          <rect x="28" y={row.y} width={row.w * 8} height="24" rx="12" fill="#FDBA74" />
          <Label x="150" y={row.y + 16} fill={INK} size={12} anchor="start">
            {row.t}
          </Label>
          <Label x="230" y={row.y + 16} fill={MUTED} size={11} anchor="start">
            {row.n}
          </Label>
        </g>
      ))}
    </Frame>
  );
}

function CurveBcd() {
  const items = [
    { x: 28, l: "B", n: "свет, «спокойные»" },
    { x: 120, l: "C", n: "квартира, розетки" },
    { x: 212, l: "D", n: "моторы, пуск" },
  ];
  return (
    <Frame>
      {items.map((item, index) => (
        <g key={item.l}>
          <rect
            x={item.x}
            y="36"
            width="80"
            height="108"
            rx="16"
            fill={index === 1 ? LIME : "#E4E4E7"}
          />
          <Label x={item.x + 40} y="86" fill={INK} size={28} weight={800}>
            {item.l}
          </Label>
          <Label x={item.x + 40} y="122" fill={INK} size={9} weight={500}>
            {item.n}
          </Label>
        </g>
      ))}
    </Frame>
  );
}

function ReadPanel() {
  return <PanelAnatomy />;
}

function DinModules() {
  return (
    <Frame>
      <rect x="24" y="80" width="272" height="10" rx="3" fill="#A1A1AA" />
      <Module x="36" y="48" w="36" label="1" fill={LIME} />
      <Module x="78" y="48" w="72" label="2 мод" fill="#EDE9FE" />
      <Module x="156" y="48" w="108" label="3 модуля" fill="#FDE68A" />
      <Label x="160" y="122" fill={INK} size={12}>
        1 модуль = 18 мм
      </Label>
      <Label x="160" y="148" fill={MUTED} size={11}>
        считайте ширину до покупки корпуса
      </Label>
    </Frame>
  );
}

function NpeBus() {
  return (
    <Frame>
      <rect x="36" y="36" width="28" height="110" rx="6" fill={EARTH} />
      <Label x="50" y="160" fill={EARTH} size={11}>
        PE
      </Label>
      <rect x="92" y="36" width="28" height="50" rx="6" fill={NEUTRAL} />
      <rect x="132" y="36" width="28" height="50" rx="6" fill="#93C5FD" />
      <Label x="106" y="102" fill={NEUTRAL} size={10}>
        N1
      </Label>
      <Label x="146" y="102" fill={NEUTRAL} size={10}>
        N2
      </Label>
      <Label x="200" y="70" fill={INK} size={11} anchor="start">
        PE — общая
      </Label>
      <Label x="200" y="92" fill={INK} size={11} anchor="start">
        N — своя после
      </Label>
      <Label x="200" y="114" fill={INK} size={11} anchor="start">
        каждого УЗО
      </Label>
    </Frame>
  );
}

function AptScheme() {
  const box = (x: number, y: number, t: string, w = 70) => (
    <g>
      <rect x={x} y={y} width={w} height="28" rx="8" fill="white" stroke={INK} />
      <Label x={x + w / 2} y={y + 18} fill={INK} size={9}>
        {t}
      </Label>
    </g>
  );
  return (
    <Frame wide>
      {box(20, 40, "ввод")}
      {box(110, 40, "автомат")}
      {box(200, 40, "реле U")}
      {box(290, 40, "УЗО")}
      {box(70, 110, "C16 кухня", 80)}
      {box(160, 110, "C16 комнаты", 88)}
      {box(258, 110, "C10 свет", 72)}
      <path d="M90 68 V110 M180 68 V110 M235 68 V96 H294 V110" fill="none" stroke={INK} strokeWidth="2" />
      <path d="M90 54 H110 M180 54 H200 M270 54 H290" fill="none" stroke={INK} strokeWidth="2" />
    </Frame>
  );
}

function Selectivity() {
  return (
    <Frame>
      <rect x="120" y="24" width="80" height="36" rx="8" fill={INK} />
      <Label x="160" y="46" fill="white" size={11}>
        ввод 50 А
      </Label>
      <path d="M160 60 V88" stroke={INK} strokeWidth="2" />
      <rect x="40" y="88" width="80" height="36" rx="8" fill="#FDE68A" />
      <rect x="200" y="88" width="80" height="36" rx="8" fill="#FECACA" stroke="#B91C1C" />
      <Label x="80" y="110" fill={INK} size={10}>
        C16 ок
      </Label>
      <Label x="240" y="110" fill={INK} size={10}>
        КЗ C16
      </Label>
      <Label x="160" y="152" fill="#B91C1C" size={12}>
        гаснет только эта линия
      </Label>
    </Frame>
  );
}

function CombBar() {
  return (
    <Frame>
      <rect x="36" y="48" width="248" height="14" rx="4" fill={PHASE} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={48 + i * 46}
          y="62"
          width="28"
          height="56"
          rx="6"
          fill="#FDE68A"
        />
      ))}
      <Label x="160" y="140" fill={INK} size={12}>
        гребёнка питает ряд
      </Label>
    </Frame>
  );
}

function AssembleSteps() {
  const steps = ["рейки", "приборы", "гребёнки", "L", "N", "PE", "маркировка", "прозвонка"];
  return (
    <Frame wide>
      {steps.map((step, index) => {
        const x = 18 + (index % 4) * 86;
        const y = 36 + Math.floor(index / 4) * 72;
        return (
          <g key={step}>
            <circle cx={x + 16} cy={y + 16} r="14" fill={LIME} />
            <Label x={x + 16} y={y + 21} fill={INK} size={11}>
              {String(index + 1)}
            </Label>
            <Label x={x + 38} y={y + 21} fill={INK} size={11} anchor="start">
              {step}
            </Label>
          </g>
        );
      })}
    </Frame>
  );
}

function CommonMistakes() {
  return (
    <Frame>
      <rect x="20" y="28" width="132" height="124" rx="14" fill="#FEE2E2" />
      <Label x="86" y="56" fill="#991B1B" size={12}>
        нельзя
      </Label>
      <Label x="86" y="84" fill={INK} size={10}>
        N + PE
      </Label>
      <Label x="86" y="104" fill={INK} size={10}>
        2 жилы / винт
      </Label>
      <Label x="86" y="124" fill={INK} size={10}>
        автомат &gt; кабель
      </Label>
      <rect x="168" y="28" width="132" height="124" rx="14" fill="#DCFCE7" />
      <Label x="234" y="56" fill="#166534" size={12}>
        нужно
      </Label>
      <Label x="234" y="84" fill={INK} size={10}>
        раздельные шины
      </Label>
      <Label x="234" y="104" fill={INK} size={10}>
        НШВИ
      </Label>
      <Label x="234" y="124" fill={INK} size={10}>
        номинал по проводу
      </Label>
    </Frame>
  );
}

function TestPanel() {
  return (
    <Frame>
      <circle cx="70" cy="80" r="36" fill="#EDE9FE" />
      <Label x="70" y="76" fill={INK} size={11}>
        Ω
      </Label>
      <Label x="70" y="94" fill={INK} size={10}>
        КЗ?
      </Label>
      <circle cx="160" cy="80" r="36" fill={LIME} />
      <Label x="160" y="84" fill={INK} size={12}>
        I вкл
      </Label>
      <circle cx="250" cy="80" r="36" fill="#DCFCE7" />
      <Label x="250" y="84" fill={INK} size={12}>
        Т
      </Label>
      <Label x="70" y="140" fill={MUTED} size={10}>
        прозвонка
      </Label>
      <Label x="160" y="140" fill={MUTED} size={10}>
        по одной
      </Label>
      <Label x="250" y="140" fill={MUTED} size={10}>
        тест УЗО
      </Label>
    </Frame>
  );
}

const DIAGRAMS: Record<DiagramId, () => ReactNode> = {
  "water-analogy": WaterAnalogy,
  "units-trio": UnitsTrio,
  "power-kettle": PowerKettle,
  "three-wires": ThreeWires,
  "socket-wiring": SocketWiring,
  "switch-wiring": SwitchWiring,
  overload: Overload,
  "panel-anatomy": PanelAnatomy,
  "breaker-cutaway": BreakerCutaway,
  "rcd-leak": RcdLeak,
  "diff-vs-rcd": DiffVsRcd,
  "cable-amp": CableAmp,
  "curve-bcd": CurveBcd,
  "read-panel": ReadPanel,
  "din-modules": DinModules,
  "n-pe-bus": NpeBus,
  "apt-scheme": AptScheme,
  selectivity: Selectivity,
  "comb-bar": CombBar,
  "assemble-steps": AssembleSteps,
  "common-mistakes": CommonMistakes,
  "test-panel": TestPanel,
};

export function SchoolDiagram({
  id,
  className,
  style,
}: {
  id: DiagramId;
  className?: string;
  style?: CSSProperties;
}) {
  const Node = DIAGRAMS[id];
  return (
    <div className={className} style={style}>
      <Node />
    </div>
  );
}
