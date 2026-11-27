# Handoff: валідація дат у схемі контенту (гілка `site`)

Документ для агента, який вноситиме зміни в код сайту на гілці `site`. Тут описано баг, його причину, вже зроблене виправлення контенту і що саме треба змінити в коді. Повторно розслідувати причину не треба.

Дата: 2026-11-27.

---

## 1. Що сталося

На https://reviews.pepethelis.top/stats/ у секції **Publications by year** з'явився **1920** рік.

### Причина

У файлі `content/reviews/friendly/decepti_on/Battery frsh.md` (гілка `main`) було:

```yaml
publishedAt: 0020-09-08
```

Рік `0020` замість `2025`: одрук при ручному заповненні, внесений комітом `64f1a9e` (vault backup 2026-09-19).

Ланцюжок:

1. YAML-парсер створює дату через `Date.UTC(20, 8, 8)`. JavaScript трактує роки `0–99` як `1900 + рік`, тож виходить `1920-09-08`.
2. Схема `publishedAt: z.date().nullish()` у `src/content.config.ts` приймає будь-яку дату, тому помилка проходить без попередження.
3. `src/utils/getReviewStats.ts` (рядок ~127) бере `publishedAt.getFullYear()`, і в `publicationYearData` потрапляє ключ `"1920"`.

### Побічні ефекти того самого запису (теж зникнуть після фіксу)

- `timeData` у `getReviewStats.ts` (рядки ~148–158) заповнює кожен місяць від першого до останнього ключа. З 1920-09 це ~1270 точок, здебільшого нулі. Графік «reviews over time» розтягнутий.
- `src/pages/archives/index.astro` групує за `publishedAt.getFullYear()`, тому в архіві теж був розділ 1920.
- Сортування (`getSortedPosts.ts`, `groupReviewsByDrink.ts`) ставило цей огляд у самий кінець.

---

## 2. Що вже зроблено (гілка `main`, контент)

- Дату виправлено на `publishedAt: 2025-09-08`. Її виведено з номера Telegram-посту: у огляду `t.me/sonechkin_rzekich/33618`, сусіди: 33595 → 2025-08-28 (Hunter original), 33627 → 2025-09-09 (Monster juiced aussie style lemonade).
- Інших дат із роком не `20xx` у `createdAt` / `publishedAt` / `updatedAt` по всьому `content/` немає (перевірено grep-ом).
- Найраніша реальна дата в контенті: **2023** рік (`publishedAt`), для `createdAt` це 2024.

> ⚠️ **Станом на написання документа виправлення на `main` ще НЕ закомічене.** Його комітить і пушить власник вольта (або Obsidian-синхронізація). Див. розділ 5: порядок важливий.

---

## 3. Контекст репозиторію (коротко)

| Гілка | Що в ній |
|---|---|
| `main` | Obsidian-вольт (`content/posts`, `content/reviews`, `content/assets`) + `.github/workflows/publish.yml`. **Не чіпай.** |
| `site` | Код сайту (форк AstroPaper, Astro 7, Bun). Саме тут працюєш. |

- Локальної гілки `site` немає, є лише `origin/site`. Основне робоче дерево сидить на `main` з вольтом, тому працюй в окремому worktree:
  ```sh
  git fetch origin site
  git worktree add ../can-drink-this-site -b site origin/site
  ```
- CI (`publish.yml` на `main`) щодня о 04:00 Kyiv копіює `main:content/{posts,reviews,assets}` у `site/src/data/...` і запускає `bun run build`.
- Документація коду: `agents.md` у корені гілки `site`. Розділи «Content Collections» і «Stats Page».
- Unit-тестів немає. Перевірки: `bun run typecheck`, `astro check` (входить у `bun run build`), `bun run lint`, `bun run format:check`.
- Стиль комітів: conventional commits (`fix(stats): …`, `fix(content): …`, `perf(build): …`).

---

## 4. Що треба зробити

### 4.1. Спільний валідатор дати (`src/schemas.ts`)

Додай один тип для всіх дат контенту з нижньою межею. Так одрук на зразок `0020-…` / `0202-…` валить збірку з назвою файлу, а не тихо потрапляє на сайт.

```ts
// Earliest plausible date for any content timestamp. Real content starts in
// 2023; anything earlier is a typo (e.g. `0020-09-08`, which JS turns into 1920).
export const MIN_CONTENT_DATE = new Date("2020-01-01T00:00:00Z");

export const contentDate = z
  .date()
  .min(MIN_CONTENT_DATE, {
    message: "Date is before 2020-01-01. Likely a typo in the year (e.g. 0020 instead of 2025)",
  });
```

- Перевір, яка версія Zod іде з `astro/zod` в Astro 7. У Zod 4 параметр кастомного повідомлення називається `error` (`{ error: "..." }`), `message` лишився як deprecated alias. Використай той варіант, з яким `bun run typecheck` проходить без попереджень.
- **Верхньої межі не став.** `postFilter.ts` підтримує відкладені публікації (дата в майбутньому), і `max` їх зламає.

### 4.2. Застосувати в `src/content.config.ts`

Заміни `z.date().nullish()` на `contentDate.nullish()` для:

- `reviews`: `createdAt`, `publishedAt`, `updatedAt`
- `posts`: `publishedAt`, `updatedAt`

і додай `contentDate` до імпорту з `./schemas`.

### 4.3. Оновити `agents.md` (гілка `site`)

У розділі «Content Collections» (або «Content Authoring Notes») додай рядок: дати контенту валідуються через `contentDate` у `schemas.ts` з мінімумом `MIN_CONTENT_DATE` (2020-01-01). Збірка падає на даті з неправильним роком. Мета: щоб наступний агент не послабив валідатор, не розібравшись.

### 4.4. Не робити

- Не додавати фільтрацію або «тихе» відкидання поганих дат у `getReviewStats.ts` чи `archives/index.astro`. Валідація має бути одна, у схемі, і падати голосно.
- Не міняти `publish.yml` і нічого на `main`.
- Не чіпати `src/data/` у коміті. Це лише dev-копія контенту, CI її перезаписує.

---

## 5. Порядок викатки (важливо)

Нова схема **валить збірку**, якщо в контенті лишилась погана дата. Тому:

1. Спершу на `origin/main` має потрапити виправлена дата в `Battery frsh.md` (розділ 2). Перевір:
   ```sh
   git fetch origin main
   git show origin/main:"content/reviews/friendly/decepti_on/Battery frsh.md" | grep publishedAt
   # очікується: publishedAt: 2025-09-08
   ```
2. Лише після цього пушити зміни на `site`. Якщо на `origin/main` досі `0020-09-08`, зупинись і скажи про це користувачу, не пуш.

Коміт на `site` роби, а **пуш лише після підтвердження користувача**.

---

## 6. Перевірка

У worktree `site`:

1. Підтягни актуальний контент так само, як CI:
   ```sh
   rm -rf src/data/posts src/data/reviews src/data/assets
   mkdir -p src/data
   mkdir -p /tmp/cdt-content
   git -C <шлях до основного репо> archive origin/main content | tar -x -C /tmp/cdt-content
   cp -r /tmp/cdt-content/content/{posts,reviews,assets} src/data/
   ```
   (або скопіюй `content/*` напряму з робочого дерева `main`, якщо фікс там ще не запушений, але вже є локально).
2. `bun install --frozen-lockfile && bun run typecheck && bun run lint && bun run build`. Усе має пройти.
3. **Негативна перевірка:** тимчасово постав у будь-якому `src/data/reviews/**.md` `publishedAt: 0020-09-08` і запусти `bun run build`. Збірка має впасти з повідомленням валідатора і шляхом до файлу. Поверни файл назад.
4. Після збірки перевір `dist/stats/index.html` (або `bun run preview` → `/stats/`): у «Publications by year» немає 1920, графік «over time» починається з 2023. Також `/archives/` без розділу 1920.
5. Перед комітом: `git status` має показувати зміни лише в `src/schemas.ts`, `src/content.config.ts`, `agents.md`. `src/data/` не має потрапити в коміт.

Пропонований коміт:

```
fix(content): reject content dates before 2020 in schema

A `publishedAt: 0020-09-08` typo was parsed as 1920 and showed up as a
"1920" bucket on /stats and /archives. Validate all content dates with a
shared `contentDate` schema so such typos fail the build with the file path.
```

---

## 7. Звіт користувачу

Після роботи коротко напиши: що змінено (файли), результати `typecheck`/`build` і негативної перевірки, стан `origin/main` (чи там уже виправлена дата), а також чи запушено `site` чи коміт чекає підтвердження.
