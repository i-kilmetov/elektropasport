"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import type { AdminDashboardData } from "@/lib/admin-db";
import {
  adminAddAdmin,
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminDeleteRequest,
  adminRemoveAdmin,
  adminSendPush,
  adminSetRequestStatus,
  adminSetRole,
  adminUpdatePromoCode,
  fetchAdminDashboard,
  fetchAdminPanel,
  fetchAdminPromoCodes,
  fetchAdminPushAudience,
  type AdminPromoCode,
  type AdminPushAudience,
} from "@/lib/user-data";
import { SCHOOL_GRADE_PAYMENT_TITLE } from "@/lib/school/access";
import {
  installStatusLabels,
  type InstallRequestStatus,
  type PanelObject,
} from "@/types";
import { cn } from "@/lib/utils";

type Section =
  | "overview"
  | "users"
  | "panels"
  | "requests"
  | "invites"
  | "launch"
  | "masters"
  | "admins"
  | "push"
  | "promos";

const SECTIONS: Array<{ id: Section; title: string; icon: typeof Shield }> = [
  { id: "overview", title: "Обзор", icon: LayoutDashboard },
  { id: "users", title: "Пользователи", icon: Users },
  { id: "panels", title: "Щитки", icon: Zap },
  { id: "requests", title: "Заявки", icon: ClipboardList },
  { id: "launch", title: "Открытие", icon: Phone },
  { id: "invites", title: "Приглашения", icon: UserPlus },
  { id: "masters", title: "Мастера", icon: Wrench },
  { id: "push", title: "Пуши", icon: Bell },
  { id: "promos", title: "Промокоды", icon: Tag },
  { id: "admins", title: "Администраторы", icon: Shield },
];

function displayName(first: string, last: string, fallback = "—") {
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || fallback;
}

export function AdminDashboardScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userQuery, setUserQuery] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [viewPanel, setViewPanel] = useState<PanelObject | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const reload = useCallback(async () => {
    const next = await fetchAdminDashboard();
    setData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAdminDashboard();
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (key: string, op: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await op();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!data) return [];
    return data.requests.filter((item) => {
      if (cityFilter !== "all" && item.city !== cityFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [data, cityFilter, statusFilter]);

  const filteredMasters = useMemo(() => {
    if (!data) return [];
    if (cityFilter === "all") return data.masters;
    return data.masters.filter((item) => item.city === cityFilter);
  }, [data, cityFilter]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userQuery.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter((item) => {
      const name = displayName(item.firstName, item.lastName).toLowerCase();
      return (
        name.includes(q) ||
        String(item.telegramId).includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.phone.includes(q)
      );
    });
  }, [data, userQuery]);

  const cities = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const row of data.stats.requestsByCity) set.add(row.city);
    for (const row of data.stats.mastersByCity) set.add(row.city);
    return [...set].sort();
  }, [data]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col bg-[#f4f5f7]"
    >
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-black/6 bg-zinc-950 text-white lg:flex lg:w-[260px] lg:flex-col lg:border-b-0 lg:border-r lg:border-white/8">
          <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white lg:hidden"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <BrandLogo className="h-7" onDark />
                <h1 className="mt-2 ty-title">Админка</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="mt-8 hidden items-center gap-2 ty-note text-white/55 hover:text-white lg:flex"
            >
              <ArrowLeft className="h-4 w-4" />
              На главную
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-1 lg:px-4 lg:pb-6">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 ty-label lg:rounded-[14px] lg:px-3 lg:py-2.5",
                  section === item.id
                    ? "bg-white text-zinc-950"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 lg:px-10 lg:py-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-300" />
            </div>
          ) : !data ? (
            <p className="ty-body">{error ?? "Нет данных"}</p>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 ty-body text-rose-700">
                  {error}
                </div>
              )}
              {section === "overview" && (
                <Overview data={data} onOpen={setSection} />
              )}
              {section === "users" && (
                <UsersSection
                  users={filteredUsers}
                  total={data.users.length}
                  query={userQuery}
                  onQuery={setUserQuery}
                />
              )}
              {section === "panels" && (
                <PanelsSection
                  panels={data.panels}
                  busy={busy}
                  panelLoading={panelLoading}
                  onOpen={async (id) => {
                    setPanelLoading(true);
                    setError(null);
                    try {
                      const panel = await fetchAdminPanel(id);
                      setViewPanel(panel);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Не удалось открыть щиток",
                      );
                    } finally {
                      setPanelLoading(false);
                    }
                  }}
                />
              )}
              {section === "requests" && (
                <RequestsSection
                  data={data}
                  cities={cities}
                  cityFilter={cityFilter}
                  statusFilter={statusFilter}
                  onCity={setCityFilter}
                  onStatus={setStatusFilter}
                  rows={filteredRequests}
                  busy={busy}
                  onStatusChange={(id, status) =>
                    run(`req-${id}`, () => adminSetRequestStatus(id, status))
                  }
                  onDelete={(id) =>
                    run(`del-req-${id}`, () => adminDeleteRequest(id))
                  }
                />
              )}
              {section === "invites" && <InvitesSection data={data} />}
              {section === "launch" && <LaunchWaitlistSection data={data} />}
              {section === "masters" && (
                <MastersSection
                  data={data}
                  cities={cities}
                  cityFilter={cityFilter}
                  onCity={setCityFilter}
                  masters={filteredMasters}
                  busy={busy}
                  onSetRole={(id, role) =>
                    run(`role-${id}`, () => adminSetRole(id, role))
                  }
                />
              )}
              {section === "push" && <PushSection />}
              {section === "promos" && <PromoCodesSection />}
              {section === "admins" && (
                <AdminsSection
                  data={data}
                  newAdminId={newAdminId}
                  onNewAdminId={setNewAdminId}
                  busy={busy}
                  onAdd={() => {
                    const id = Number(newAdminId.replace(/\D/g, ""));
                    if (!id) return;
                    void run("add-admin", async () => {
                      await adminAddAdmin(id);
                      setNewAdminId("");
                    });
                  }}
                  onRemove={(id) =>
                    run(`del-admin-${id}`, () => adminRemoveAdmin(id))
                  }
                />
              )}
            </>
          )}
        </div>
      </div>

      {viewPanel && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f5f7]">
          <SchemeScreen
            title={viewPanel.title}
            panelId={viewPanel.id}
            photoDataUrl={viewPanel.photoDataUrl}
            sharedPreview
            onBack={() => setViewPanel(null)}
            onRename={() => undefined}
            onDelete={() => undefined}
            devices={viewPanel.devices}
            wires={viewPanel.wires}
            safetyScore={viewPanel.safety}
            phases={viewPanel.phases}
            powerKw={viewPanel.powerKw}
            hasGround={viewPanel.hasGround}
            railCount={viewPanel.railCount}
            houseSnapshot={viewPanel.houseSnapshot}
          />
        </div>
      )}
    </motion.section>
  );
}

function Overview({
  data,
  onOpen,
}: {
  data: AdminDashboardData;
  onOpen: (section: Section) => void;
}) {
  const stats = [
    { label: "Пользователи", value: data.stats.usersCount, icon: Users, section: "users" as const },
    { label: "Щитки", value: data.stats.panelsCount, icon: Zap, section: "panels" as const },
    { label: "Заявки", value: data.stats.requestsCount, icon: ClipboardList, section: "requests" as const },
    {
      label: "На открытие",
      value: data.stats.launchWaitlistCount,
      icon: Phone,
      section: "launch" as const,
    },
  ];
  const maxRequestCity = Math.max(
    ...data.stats.requestsByCity.map((row) => row.count),
    1,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h2 className="ty-display text-zinc-950">
          Панель управления
        </h2>
        <p className="mt-1 ty-body">
          Сводка по сервису, заявкам и мастерам.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onOpen(item.section)}
            className="text-left"
          >
            <GlassCard className="h-full p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] bg-zinc-100 text-zinc-700">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="ty-display tabular-nums leading-none text-zinc-950">
                {item.value}
              </div>
              <div className="mt-2 ty-note">{item.label}</div>
            </GlassCard>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 ty-heading">
            Статусы заявок
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["new", "Новые"],
                ["in_progress", "В работе"],
                ["done", "Выполнено"],
                ["cancelled", "Отменены"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpen("requests")}
                className="rounded-[16px] bg-zinc-50 px-4 py-3 text-left"
              >
                <div className="ty-title tabular-nums">
                  {data.stats.byStatus[id] ?? 0}
                </div>
                <div className="ty-note">{label}</div>
              </button>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 ty-heading">
            Заявки по городам
          </h3>
          <div className="space-y-3">
            {data.stats.requestsByCity.slice(0, 8).map((row) => (
              <div key={row.city}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="text-zinc-700">{row.city}</span>
                  <span className="tabular-nums text-zinc-500">{row.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${(row.count / maxRequestCity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {data.stats.requestsByCity.length === 0 && (
              <p className="ty-meta">Пока нет заявок</p>
            )}
          </div>
        </GlassCard>
      </div>
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="ty-heading">
            Заявки на мастера
          </h3>
          <span className="ty-note">
            {data.stats.applicationsCount}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-zinc-400">
              <tr>
                <th className="pb-2 font-medium">Имя</th>
                <th className="pb-2 font-medium">Город</th>
                <th className="pb-2 font-medium">Telegram ID</th>
                <th className="pb-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.applications.slice(0, 6).map((item) => (
                <tr key={item.id} className="border-t border-black/6">
                  <td className="py-2.5 font-medium text-zinc-900">{item.name}</td>
                  <td className="py-2.5 text-zinc-600">{item.city}</td>
                  <td className="py-2.5 tabular-nums text-zinc-500">
                    {item.telegramId}
                  </td>
                  <td className="py-2.5">
                    {item.isMaster ? "Мастер" : "Ожидает"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function UsersSection({
  users,
  total,
  query,
  onQuery,
}: {
  users: AdminDashboardData["users"];
  total: number;
  query: string;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ty-display text-zinc-950">
            Пользователи
          </h2>
          <p className="mt-1 ty-body">
            {users.length} из {total} · последние 200 регистраций
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Имя, @username или Telegram ID"
          className="h-11 w-full max-w-sm rounded-[14px] border border-black/8 bg-white px-4 text-[14px] outline-none focus:border-zinc-300"
        />
      </div>
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Щитки</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.telegramId} className="border-t border-black/6">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">
                    {displayName(item.firstName, item.lastName, "Без имени")}
                    {item.isAdmin && (
                      <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 ty-badge text-white">
                        Админ
                      </span>
                    )}
                  </div>
                  <div className="tabular-nums text-zinc-400">
                    {item.telegramId}
                    {item.username ? ` · @${item.username}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {item.role === "master" ? "Мастер" : "Пользователь"}
                </td>
                <td className="px-4 py-3 tabular-nums">{item.panelsCount}</td>
                <td className="px-4 py-3 text-zinc-600">{item.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center ty-meta">
            Никого не найдено
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function RequestsSection({
  data,
  cities,
  cityFilter,
  statusFilter,
  onCity,
  onStatus,
  rows,
  busy,
  onStatusChange,
  onDelete,
}: {
  data: AdminDashboardData;
  cities: string[];
  cityFilter: string;
  statusFilter: string;
  onCity: (value: string) => void;
  onStatus: (value: string) => void;
  rows: AdminDashboardData["requests"];
  busy: string | null;
  onStatusChange: (id: string, status: InstallRequestStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ty-display text-zinc-950">
            Заявки
          </h2>
          <p className="mt-1 ty-body">
            {rows.length} из {data.requests.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={cityFilter}
            onChange={(e) => onCity(e.target.value)}
            className="h-11 rounded-[14px] border border-black/8 bg-white px-3 text-[14px]"
          >
            <option value="all">Все города</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => onStatus(e.target.value)}
            className="h-11 rounded-[14px] border border-black/8 bg-white px-3 text-[14px]"
          >
            <option value="all">Все статусы</option>
            {Object.entries(installStatusLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[1040px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Код</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Город / адрес</th>
              <th className="px-4 py-3 font-medium">Работа</th>
              <th className="px-4 py-3 font-medium">Мастер</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-black/6 align-top">
                <td className="px-4 py-3 font-semibold text-zinc-900">
                  {item.publicCode || "—"}
                  <div className="mt-0.5 ty-meta">
                    {item.createdAt}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{item.name}</div>
                  <div className="text-zinc-500">{item.phone || "—"}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span>
                      {item.city}
                      {item.exactAddress ? `, ${item.exactAddress}` : ""}
                    </span>
                  </div>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-zinc-600">
                  {item.setupTitle || item.subtitle}
                </td>
                <td className="px-4 py-3 text-zinc-600">{item.masterName}</td>
                <td className="px-4 py-3">
                  <select
                    value={item.status}
                    disabled={busy === `req-${item.id}`}
                    onChange={(e) =>
                      onStatusChange(
                        item.id,
                        e.target.value as InstallRequestStatus,
                      )
                    }
                    className="h-9 rounded-[10px] border border-black/8 bg-white px-2 text-[13px]"
                  >
                    {Object.entries(installStatusLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy === `del-req-${item.id}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Удалить заявку ${item.publicCode || item.id}?`,
                        )
                      ) {
                        onDelete(item.id);
                      }
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 ty-badge text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center ty-meta">
            Нет заявок по фильтру
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function PanelsSection({
  panels,
  busy,
  panelLoading,
  onOpen,
}: {
  panels: AdminDashboardData["panels"];
  busy: string | null;
  panelLoading: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4">
      <div>
        <h2 className="ty-display text-zinc-950">
          Щитки
        </h2>
        <p className="mt-1 ty-body">
          {panels.length} последних · откройте схему любого пользователя
        </p>
      </div>
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Щиток</th>
              <th className="px-4 py-3 font-medium">Владелец</th>
              <th className="px-4 py-3 font-medium">Адрес</th>
              <th className="px-4 py-3 font-medium">Безопасность</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {panels.map((item) => (
              <tr key={item.id} className="border-t border-black/6">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{item.title}</div>
                  <div className="text-zinc-400">
                    {item.deviceCount} устройств · {item.breakers} автоматов
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{item.ownerName}</div>
                  <div className="tabular-nums text-zinc-400">
                    {item.telegramUserId}
                    {item.ownerUsername ? ` · @${item.ownerUsername}` : ""}
                  </div>
                </td>
                <td className="max-w-[240px] px-4 py-3 text-zinc-600">
                  {item.address || "—"}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700">
                  {item.safety != null ? `${item.safety}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={panelLoading || busy != null}
                    onClick={() => onOpen(item.id)}
                  >
                    Схема
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {panels.length === 0 && (
          <p className="px-4 py-8 text-center ty-meta">
            Щитков пока нет
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function LaunchWaitlistSection({ data }: { data: AdminDashboardData }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h2 className="ty-display text-zinc-950">Открытие tokom.ru</h2>
        <p className="mt-1 ty-body">
          Заявки на новость об открытии сайта · {data.stats.launchWaitlistCount}{" "}
          номеров
        </p>
      </div>

      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="px-4 py-3 font-medium">Telegram</th>
              <th className="px-4 py-3 font-medium">Когда</th>
            </tr>
          </thead>
          <tbody>
            {data.launchWaitlist.map((row) => (
              <tr key={row.id} className="border-t border-black/6">
                <td className="px-4 py-3">
                  <a
                    href={`tel:${row.phone}`}
                    className="font-medium tabular-nums text-zinc-900 hover:underline"
                  >
                    {row.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.telegramUserId ? (
                    <>
                      <div className="font-medium text-zinc-900">
                        {row.userName || "Без имени"}
                      </div>
                      <div className="tabular-nums text-zinc-400">
                        {row.telegramUserId}
                        {row.username ? ` · @${row.username}` : ""}
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-400">Анонимно</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(row.createdAt).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.launchWaitlist.length === 0 && (
          <p className="px-5 py-6 ty-meta">Пока нет заявок на открытие</p>
        )}
      </GlassCard>
    </div>
  );
}

function InvitesSection({ data }: { data: AdminDashboardData }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h2 className="ty-display text-zinc-950">
          Приглашения
        </h2>
        <p className="mt-1 ty-body">
          Кто кого привёл · {data.stats.creditedInvites} засчитанных ·{" "}
          {data.stats.pendingInviteOpens} открыли ссылку, но ещё не вошли
        </p>
      </div>

      <GlassCard className="p-5">
        <h3 className="mb-3 ty-heading">
          Открыли ссылку, но не авторизовались
        </h3>
        <p className="mb-4 ty-note">
          Фиксируется при открытии invite-ссылки до входа в сервис.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-zinc-400">
              <tr>
                <th className="pb-2 font-medium">Кто пригласил</th>
                <th className="pb-2 font-medium">Токен</th>
                <th className="pb-2 font-medium">Открыто</th>
              </tr>
            </thead>
            <tbody>
              {data.invitePending.map((row) => (
                <tr key={row.id} className="border-t border-black/6">
                  <td className="py-2.5">
                    <div className="font-medium text-zinc-900">
                      {row.inviterName}
                    </div>
                    <div className="tabular-nums text-zinc-400">
                      {row.inviterId}
                      {row.inviterUsername ? ` · @${row.inviterUsername}` : ""}
                    </div>
                  </td>
                  <td className="py-2.5 font-mono text-[12px] text-zinc-600">
                    {row.inviteToken}
                  </td>
                  <td className="py-2.5 text-zinc-600">
                    {new Date(row.openedAt).toLocaleString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.invitePending.length === 0 && (
            <p className="py-4 ty-meta">
              Пока нет незавершённых переходов по ссылкам
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard className="overflow-x-auto p-0">
        <div className="border-b border-black/6 px-5 py-4">
          <h3 className="ty-heading">
            Зарегистрированные приглашения
          </h3>
        </div>
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Пригласил</th>
              <th className="px-4 py-3 font-medium">Пришёл</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Когда</th>
            </tr>
          </thead>
          <tbody>
            {data.inviteEdges.map((row) => (
              <tr
                key={`${row.inviterId}-${row.inviteeId}`}
                className="border-t border-black/6"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">
                    {row.inviterName}
                  </div>
                  <div className="tabular-nums text-zinc-400">
                    {row.inviterId}
                    {row.inviterUsername ? ` · @${row.inviterUsername}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">
                    {row.inviteeName}
                  </div>
                  <div className="tabular-nums text-zinc-400">
                    {row.inviteeId}
                    {row.inviteeUsername ? ` · @${row.inviteeUsername}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.outcome === "credited" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 ty-badge text-emerald-700">
                      Новый пользователь
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 ty-badge text-zinc-600">
                      Уже был в сервисе
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(row.createdAt).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.inviteEdges.length === 0 && (
          <p className="px-4 py-8 text-center ty-meta">
            Пока никто никого не пригласил
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function MastersSection({
  data,
  cities,
  cityFilter,
  onCity,
  masters,
  busy,
  onSetRole,
}: {
  data: AdminDashboardData;
  cities: string[];
  cityFilter: string;
  onCity: (value: string) => void;
  masters: AdminDashboardData["masters"];
  busy: string | null;
  onSetRole: (id: number, role: "user" | "master") => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ty-display text-zinc-950">
            Мастера
          </h2>
          <p className="mt-1 ty-body">
            Выдать или забрать роль, заявки по городам.
          </p>
        </div>
        <select
          value={cityFilter}
          onChange={(e) => onCity(e.target.value)}
          className="h-11 rounded-[14px] border border-black/8 bg-white px-3 text-[14px]"
        >
          <option value="all">Все города</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.mastersByCity.map((row) => (
          <GlassCard key={row.city} className="p-4">
            <div className="ty-note">{row.city}</div>
            <div className="mt-1 ty-title tabular-nums">
              {row.count}
            </div>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Мастер</th>
              <th className="px-4 py-3 font-medium">Город</th>
              <th className="px-4 py-3 font-medium">Контакт</th>
              <th className="px-4 py-3 font-medium">Заказы</th>
              <th className="px-4 py-3 font-medium">Роль</th>
            </tr>
          </thead>
          <tbody>
            {masters.map((item) => (
              <tr key={item.telegramId} className="border-t border-black/6">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">
                    {displayName(item.firstName, item.lastName, "Без имени")}
                  </div>
                  <div className="tabular-nums text-zinc-400">
                    {item.telegramId}
                    {item.username ? ` · @${item.username}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{item.city}</td>
                <td className="px-4 py-3 text-zinc-600">{item.phone || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{item.ordersCount}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant={item.isMaster ? "secondary" : "default"}
                    disabled={busy === `role-${item.telegramId}`}
                    onClick={() =>
                      onSetRole(item.telegramId, item.isMaster ? "user" : "master")
                    }
                  >
                    {item.isMaster ? "Забрать роль" : "Сделать мастером"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
      <div>
        <h3 className="mb-3 ty-title">
          Заявки «Стать мастером»
        </h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.applications.map((item) => (
            <GlassCard key={item.id} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-900">{item.name}</div>
                  <div className="ty-note">
                    {item.city} · {item.telegramId}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={item.isMaster ? "secondary" : "default"}
                  disabled={busy === `role-${item.telegramId}`}
                  onClick={() =>
                    onSetRole(item.telegramId, item.isMaster ? "user" : "master")
                  }
                >
                  {item.isMaster ? "Забрать" : "Назначить"}
                </Button>
              </div>
              {item.about && (
                <p className="ty-note">
                  {item.about}
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminsSection({
  data,
  newAdminId,
  onNewAdminId,
  busy,
  onAdd,
  onRemove,
}: {
  data: AdminDashboardData;
  newAdminId: string;
  onNewAdminId: (value: string) => void;
  busy: string | null;
  onAdd: () => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[880px] space-y-6">
      <div>
        <h2 className="ty-display text-zinc-950">
          Администраторы
        </h2>
        <p className="mt-1 ty-body">
          Автор бота всегда админ и не может быть удалён. Других можно добавить
          по Telegram ID — человек должен хотя бы раз открыть приложение.
        </p>
      </div>
      <GlassCard className="p-5">
        <div className="mb-2 ty-label text-zinc-600">
          Добавить администратора
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newAdminId}
            onChange={(e) => onNewAdminId(e.target.value)}
            placeholder="Telegram ID"
            className="h-12 flex-1 rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
          />
          <Button
            size="sm"
            className="h-12 px-5"
            disabled={!newAdminId.trim() || busy === "add-admin"}
            onClick={onAdd}
          >
            Добавить
          </Button>
        </div>
      </GlassCard>
      <div className="space-y-3">
        {data.admins.map((admin) => (
          <GlassCard key={admin.telegramId} className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
              {admin.isOwner ? (
                <Shield className="h-5 w-5" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-zinc-900">
                {displayName(admin.firstName, admin.lastName, "Администратор")}
                {admin.isOwner && (
                  <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 ty-badge text-white">
                    Автор бота
                  </span>
                )}
              </div>
              <div className="ty-note">
                ID {admin.telegramId}
                {admin.username ? ` · @${admin.username}` : ""}
              </div>
            </div>
            {!admin.isOwner && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === `del-admin-${admin.telegramId}`}
                onClick={() => onRemove(admin.telegramId)}
              >
                Удалить
              </Button>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function PushSection() {
  const [audience, setAudience] = useState<AdminPushAudience | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [title, setTitle] = useState("Током");
  const [text, setText] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [scope, setScope] = useState<"all" | "one">("all");

  const reload = useCallback(async () => {
    const next = await fetchAdminPushAudience();
    setAudience(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAdminPushAudience();
        if (!cancelled) setAudience(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const id = Number(telegramId.replace(/\D/g, ""));
      const data = await adminSendPush({
        title,
        body: text,
        telegramId: scope === "one" ? id : undefined,
      });
      setResult(
        `Отправлено: ${data.sent} на ${data.users} ${data.users === 1 ? "пользователя" : "пользователей"}`,
      );
      setText("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-5">
      <div>
        <h2 className="ty-display text-zinc-950">
          Пуш-уведомления
        </h2>
        <p className="mt-1 ty-body">
          Приходят только тем, кто установил Током на Домой и включил
          уведомления. Заявки (мастер принял, смена статуса) уходят сами.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <div className="ty-display tabular-nums text-zinc-950">
            {audience?.userCount ?? 0}
          </div>
          <div className="mt-1 ty-note">Подписчиков</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="ty-display tabular-nums text-zinc-950">
            {audience?.deviceCount ?? 0}
          </div>
          <div className="mt-1 ty-note">Устройств</div>
        </GlassCard>
      </div>

      <GlassCard className="space-y-4 p-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={cn(
              "rounded-full px-3 py-1.5 ty-label",
              scope === "all"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600",
            )}
          >
            Всем
          </button>
          <button
            type="button"
            onClick={() => setScope("one")}
            className={cn(
              "rounded-full px-3 py-1.5 ty-label",
              scope === "one"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600",
            )}
          >
            Одному
          </button>
        </div>
        {scope === "one" && (
          <label className="block">
            <span className="mb-1.5 block ty-note">
              Telegram ID
            </span>
            <input
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="например 123456789"
              className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block ty-note">
            Заголовок
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block ty-note">Текст</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Коротко, что случилось"
            className="w-full resize-none rounded-[16px] border border-black/8 bg-zinc-50 px-4 py-3 text-[15px] outline-none focus:border-zinc-300"
          />
          <span className="mt-1 block text-right ty-meta">
            {text.length}/200
          </span>
        </label>
        {error && (
          <p className="ty-note text-rose-600">{error}</p>
        )}
        {result && (
          <p className="ty-note text-emerald-700">{result}</p>
        )}
        <Button
          className="w-full"
          disabled={sending || !title.trim() || !text.trim() || (scope === "one" && !telegramId.replace(/\D/g, ""))}
          onClick={() => void send()}
        >
          {sending ? "Отправляем…" : scope === "all" ? "Отправить всем" : "Отправить"}
        </Button>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <div className="border-b border-black/6 px-4 py-3 ty-heading">
          Кто подписан
        </div>
        {(audience?.subscribers.length ?? 0) === 0 ? (
          <p className="px-4 py-8 text-center ty-meta">
            Пока никто не включил пуши
          </p>
        ) : (
          <ul>
            {audience?.subscribers.map((item) => (
              <li
                key={item.telegramId}
                className="flex items-center justify-between gap-3 border-t border-black/6 px-4 py-3 first:border-t-0"
              >
                <div className="min-w-0">
                  <div className="truncate ty-subtitle text-zinc-900">
                    {displayName(item.firstName, item.lastName, "Без имени")}
                    {item.username ? ` · @${item.username}` : ""}
                  </div>
                  <div className="ty-meta tabular-nums">
                    {item.telegramId} · устройств: {item.devices}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScope("one");
                    setTelegramId(String(item.telegramId));
                  }}
                  className="shrink-0 ty-label text-zinc-500 underline-offset-2 hover:underline"
                >
                  Этому
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function formatPromoDiscount(item: AdminPromoCode): string {
  if (item.discountType === "free") return "Бесплатно";
  if (item.discountType === "percent") return `−${item.discountValue}%`;
  return `−${item.discountValue.toLocaleString("ru-RU")} ₽`;
}

function formatPromoGrades(item: AdminPromoCode): string {
  if (!item.gradeIds || item.gradeIds.length === 0) return "Все классы";
  return item.gradeIds.map((id) => SCHOOL_GRADE_PAYMENT_TITLE[id]).join(", ");
}

function formatPromoPeriod(item: AdminPromoCode): string {
  const from = item.validFrom
    ? new Date(item.validFrom).toLocaleDateString("ru-RU")
    : null;
  const until = item.validUntil
    ? new Date(item.validUntil).toLocaleDateString("ru-RU")
    : null;
  if (from && until) return `${from} — ${until}`;
  if (from) return `с ${from}`;
  if (until) return `до ${until}`;
  return "Без ограничения по сроку";
}

function PromoCodesSection() {
  const [items, setItems] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] =
    useState<AdminPromoCode["discountType"]>("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [gradeScope, setGradeScope] = useState<"all" | "1" | "2" | "3" | "4">(
    "all",
  );
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    const next = await fetchAdminPromoCodes();
    setItems(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAdminPromoCodes();
        if (!cancelled) setItems(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createPromo = async () => {
    if (busy) return;
    setBusy("create");
    setError(null);
    try {
      await adminCreatePromoCode({
        code,
        discountType,
        discountValue:
          discountType === "free" ? 0 : Number(discountValue.replace(",", ".")),
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        gradeIds:
          gradeScope === "all"
            ? null
            : [Number(gradeScope) as 1 | 2 | 3 | 4],
        note: note.trim() || null,
      });
      setCode("");
      setDiscountValue("20");
      setValidFrom("");
      setValidUntil("");
      setMaxUses("");
      setNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (item: AdminPromoCode) => {
    setBusy(`toggle-${item.id}`);
    setError(null);
    try {
      await adminUpdatePromoCode(item.id, { active: !item.active });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить");
    } finally {
      setBusy(null);
    }
  };

  const removePromo = async (item: AdminPromoCode) => {
    if (!window.confirm(`Удалить промокод ${item.code}?`)) return;
    setBusy(`delete-${item.id}`);
    setError(null);
    try {
      await adminDeletePromoCode(item.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-6">
      <div>
        <h2 className="ty-display text-zinc-950">Промокоды школы</h2>
        <p className="mt-1 ty-body">
          Скидка в процентах, фиксированная сумма или бесплатный доступ к классу.
        </p>
      </div>

      <GlassCard className="space-y-4 p-5">
        <h3 className="ty-heading">Новый промокод</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block ty-note">Код</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TOKOM2026"
              className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] uppercase outline-none placeholder:normal-case focus:border-zinc-300"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block ty-note">Тип скидки</span>
            <select
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as AdminPromoCode["discountType"])
              }
              className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[14px]"
            >
              <option value="percent">Процент</option>
              <option value="fixed">Сумма в ₽</option>
              <option value="free">Бесплатно</option>
            </select>
          </label>
          {discountType !== "free" ? (
            <label className="block">
              <span className="mb-1.5 block ty-note">
                {discountType === "percent" ? "Процент" : "Сумма, ₽"}
              </span>
              <input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                inputMode="decimal"
                className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
              />
            </label>
          ) : (
            <div className="flex items-end pb-1 ty-note text-zinc-500">
              Курс откроется без оплаты
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block ty-note">Действует с</span>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block ty-note">Действует до</span>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block ty-note">Лимит использований</span>
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
              placeholder="Без лимита"
              className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block ty-note">Класс</span>
            <select
              value={gradeScope}
              onChange={(e) =>
                setGradeScope(e.target.value as typeof gradeScope)
              }
              className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[14px]"
            >
              <option value="all">Все классы</option>
              <option value="1">1 класс</option>
              <option value="2">2 класс</option>
              <option value="3">3 класс</option>
              <option value="4">Продленка</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block ty-note">Заметка</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Для кого или зачем"
              className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] outline-none focus:border-zinc-300"
            />
          </label>
        </div>
        {error ? <p className="ty-note text-rose-600">{error}</p> : null}
        <Button
          className="w-full sm:w-auto"
          disabled={!code.trim() || busy === "create"}
          onClick={() => void createPromo()}
        >
          {busy === "create" ? "Создаём…" : "Создать промокод"}
        </Button>
      </GlassCard>

      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Код</th>
              <th className="px-4 py-3 font-medium">Скидка</th>
              <th className="px-4 py-3 font-medium">Класс</th>
              <th className="px-4 py-3 font-medium">Срок</th>
              <th className="px-4 py-3 font-medium">Использований</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-black/6">
                <td className="px-4 py-3">
                  <div className="font-mono font-semibold text-zinc-900">
                    {item.code}
                  </div>
                  {item.note ? (
                    <div className="ty-meta text-zinc-500">{item.note}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{formatPromoDiscount(item)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatPromoGrades(item)}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatPromoPeriod(item)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {item.usesCount}
                  {item.maxUses != null ? ` / ${item.maxUses}` : ""}
                </td>
                <td className="px-4 py-3">
                  {item.active ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 ty-badge text-emerald-700">
                      Активен
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 ty-badge text-zinc-600">
                      Выключен
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === `toggle-${item.id}`}
                      onClick={() => void toggleActive(item)}
                    >
                      {item.active ? "Выключить" : "Включить"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === `delete-${item.id}`}
                      onClick={() => void removePromo(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center ty-meta">Промокодов пока нет</p>
        ) : null}
      </GlassCard>
    </div>
  );
}
