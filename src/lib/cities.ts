/** Города-миллионники России (население ≈ 1 млн+) */
export const millionCities = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Красноярск",
  "Самара",
  "Уфа",
  "Ростов-на-Дону",
  "Омск",
  "Краснодар",
  "Воронеж",
  "Пермь",
  "Волгоград",
] as const;

export type MillionCity = (typeof millionCities)[number];

export function filterCities(query: string, limit = 8): string[] {
  const q = query.trim().toLocaleLowerCase("ru-RU");
  if (!q) return [...millionCities].slice(0, limit);
  return millionCities
    .filter((city) => city.toLocaleLowerCase("ru-RU").includes(q))
    .slice(0, limit);
}
