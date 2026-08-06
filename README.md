# Электропаспорт

Telegram Mini App для оцифровки электрических щитков квартир и частных домов.

## Стек

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui (Button, Progress + glass-компоненты)
- Framer Motion
- `@tma.js/sdk` / `@tma.js/sdk-react` (мок вне Telegram, без Bot API)

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Экраны

1. Приветствие — «Создайте цифровой паспорт своего щитка»
2. Список объектов — квартира / дом / гараж / дача
3. Фотографирование щитка
4. Анализ изображения (прогресс + найденные устройства)
5. Интерактивная схема DIN-рейки

Все данные фиктивные: без OpenAI, БД, сервера и платежей.
