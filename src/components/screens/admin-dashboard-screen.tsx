"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MapPin,
  Shield,
  UserRound,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { AdminDashboardData } from "@/lib/admin-db";
import {
  adminAddAdmin,
  adminRemoveAdmin,
  adminSetRequestStatus,
  adminSetRole,
  fetchAdminDashboard,
} from "@/lib/user-data";
import { installStatusLabels, type InstallRequestStatus } from "@/types";
import { cn } from "@/lib/utils";

type Section = "overview" | "users" | "requests" | "masters" | "admins";

const SECTIONS: Array<{ id: Section; title: string; icon: typeof Shield }> = [
  { id: "overview", title: "Обзор", icon: LayoutDashboard },
  { id: "users", title: "Пользователи", icon: Users },
  { id: "requests", title: "Заявки", icon: ClipboardList },
  { id: "masters", title: "Мастера", icon: Wrench },
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
                <h1 className="mt-2 text-[20px] font-semibold">Админка</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="mt-8 hidden items-center gap-2 text-[13px] text-white/55 hover:text-white lg:flex"
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
                  "flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-medium lg:rounded-[14px] lg:px-3 lg:py-2.5",
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
            <p className="text-[15px] text-zinc-500">{error ?? "Нет данных"}</p>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
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
                />
              )}
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
    { label: "Щитки", value: data.stats.panelsCount, icon: Zap, section: "users" as const },
    { label: "Заявки", value: data.stats.requestsCount, icon: ClipboardList, section: "requests" as const },
    { label: "Мастера", value: data.stats.mastersCount, icon: Wrench, section: "masters" as const },
  ];
  const maxRequestCity = Math.max(
    ...data.stats.requestsByCity.map((row) => row.count),
    1,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
          Панель управления
        </h2>
        <p className="mt-1 text-[15px] text-zinc-500">
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
              <div className="text-[32px] font-semibold tabular-nums leading-none text-zinc-950">
                {item.value}
              </div>
              <div className="mt-2 text-[13px] text-zinc-500">{item.label}</div>
            </GlassCard>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 text-[16px] font-semibold text-zinc-900">
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
                <div className="text-[22px] font-semibold tabular-nums">
                  {data.stats.byStatus[id] ?? 0}
                </div>
                <div className="text-[13px] text-zinc-500">{label}</div>
              </button>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 text-[16px] font-semibold text-zinc-900">
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
              <p className="text-[13px] text-zinc-400">Пока нет заявок</p>
            )}
          </div>
        </GlassCard>
      </div>
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-zinc-900">
            Заявки на мастера
          </h3>
          <span className="text-[13px] text-zinc-500">
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
          <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
            Пользователи
          </h2>
          <p className="mt-1 text-[15px] text-zinc-500">
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
                      <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
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
          <p className="px-4 py-8 text-center text-[14px] text-zinc-400">
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
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
            Заявки
          </h2>
          <p className="mt-1 text-[15px] text-zinc-500">
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
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Код</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Город / адрес</th>
              <th className="px-4 py-3 font-medium">Работа</th>
              <th className="px-4 py-3 font-medium">Мастер</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-black/6 align-top">
                <td className="px-4 py-3 font-semibold text-zinc-900">
                  {item.publicCode || "—"}
                  <div className="mt-0.5 text-[12px] font-normal text-zinc-400">
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
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-[14px] text-zinc-400">
            Нет заявок по фильтру
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
          <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
            Мастера
          </h2>
          <p className="mt-1 text-[15px] text-zinc-500">
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
            <div className="text-[13px] text-zinc-500">{row.city}</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums">
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
        <h3 className="mb-3 text-[18px] font-semibold text-zinc-900">
          Заявки «Стать мастером»
        </h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.applications.map((item) => (
            <GlassCard key={item.id} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-900">{item.name}</div>
                  <div className="text-[13px] text-zinc-500">
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
                <p className="text-[13px] leading-relaxed text-zinc-600">
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
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
          Администраторы
        </h2>
        <p className="mt-1 text-[15px] text-zinc-500">
          Автор бота всегда админ и не может быть удалён. Других можно добавить
          по Telegram ID — человек должен хотя бы раз открыть приложение.
        </p>
      </div>
      <GlassCard className="p-5">
        <div className="mb-2 text-[13px] font-medium text-zinc-600">
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
                  <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                    Автор бота
                  </span>
                )}
              </div>
              <div className="text-[13px] text-zinc-500">
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
