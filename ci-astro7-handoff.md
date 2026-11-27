# Handoff: оновлення CI під Astro 7 і кеш інкрементальної збірки

Документ для агента, який вноситиме зміни в CI (`.github/workflows/publish.yml`) і, опційно, в `Dockerfile`. Тут зібрано все, що вже зроблено, виміряно й перевірено. Повторно це досліджувати не треба.

Дата: 2026-11-25.

---

## 1. Контекст репозиторію

Один репозиторій `pepethelis/can-drink-this` (публічний), кілька гілок з різною роллю:

| Гілка | Що в ній |
|---|---|
| `main` | Obsidian-вольт з контентом (`content/posts`, `content/reviews`, `content/assets`) **і** workflow публікації `.github/workflows/publish.yml`. Коміти типу "vault mobile backup …" робить синхронізація Obsidian. |
| `site` | Код сайту (форк AstroPaper). Саме його збирає й деплоїть CI. |
| `astro-paper-v7` | Гілка міграції на Astro 7, відгалужена від `site`. Містить два коміти, ще не злиті в `site` і не запушені. |

Коміти в `astro-paper-v7`:

- `0cdfad5` chore: migrate to Astro 7 (AstroPaper v7.2.1 baseline)
- `2e13b4b` perf(build): enable parallel prerender and incremental builds

Документація проєкту: `agents.md` у корені гілки `site` / `astro-paper-v7`. Розділи "Markdown processor (Astro 7)", "Astro 7 compatibility notes", "Build performance".

### Важливо про те, де живе workflow

- `publish.yml` лежить на **`main`**. Workflow-и за розкладом (`schedule`) і `workflow_dispatch` GitHub завжди бере з **default branch** (`main`). Тому зміни в CI треба комітити на `main`, а не на `site`.
- Workflow бере код з гілки **`site`** (`ref: site`). Доки `astro-paper-v7` не злитий у `site`, CI збиратиме ще стару версію (Astro 5), і змінена конфігурація кешу на неї ніяк не вплине: кеш просто буде пустим або невикористаним. Шкоди від цього немає.
- На `main` у робочому дереві лежить вольт. Не чіпай там нічого, крім `.github/workflows/publish.yml`.

---

## 2. Поточний workflow (`main:.github/workflows/publish.yml`)

```yaml
name: Publish site

on:
  schedule:
    - cron: "0 2 * * *" # 04:00/05:00 Kyiv time (winter/summer)
  workflow_dispatch: {}

concurrency:
  group: publish
  cancel-in-progress: true

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout content (main)
        uses: actions/checkout@v4
        with:
          ref: main
          path: vault

      - name: Checkout site code
        uses: actions/checkout@v4
        with:
          ref: site
          path: site

      - name: Sync content into site
        run: |
          rm -rf site/src/data/posts site/src/data/reviews site/src/data/assets
          mkdir -p site/src/data
          cp -r vault/content/posts site/src/data/posts
          cp -r vault/content/reviews site/src/data/reviews
          cp -r vault/content/assets site/src/data/assets

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        working-directory: site
        run: bun install --frozen-lockfile

      - name: Build site
        working-directory: site
        run: bun run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: site/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

(Коментарі з оригіналу тут скорочено, у файлі їх треба зберегти.)

Збірка: `bun run build` запускає
`astro check && astro build && pagefind --site dist && node -e "…cpSync('dist/pagefind','public/pagefind')…"`.
Останній крок копіює індекс у `public/` для dev-режиму. У CI він зайвий, але нешкідливий, тож не чіпай його.

---

## 3. Що змінилось у збірці після міграції

### 3.1 Node.js

- Astro 7.4 вимагає **Node `>=22.23.4`** (поле `engines` у `package.json`). Якщо версія нижча, Astro одразу падає з помилкою `Node.js vX is not supported by Astro!`.
- `bun run build` запускає бінарник `astro` через shebang `#!/usr/bin/env node`. Тобто в CI працює **системний Node раннера**, а не Bun.
- Зараз на `ubuntu-latest` (Ubuntu 24.04) стоїть Node **22.23.5**. Вимогу це виконує, але тільки поки GitHub не змінить образ. **Рекомендовано зафіксувати версію через `actions/setup-node`**, див. крок 4.1.
- Під рантаймом Bun (`bun --bun …`) перевірка версії Node не спрацьовує, і збірка працює. Так збирається Docker (див. розділ 6).

### 3.2 Паралельний рендер: `experimental.parallelPrerender: true`

- Сторінки рендеряться в пулі воркерів: усі ядра CPU мінус одне.
- Локально на 8 ядрах повна збірка скоротилась з 280 с до ~95 с. Під Bun: 93 с.
- У CI нічого налаштовувати не треба. Публічний репозиторій на `ubuntu-latest` має 4 vCPU, тобто 3 воркери. Прискорення буде меншим, ніж локально (оцінка: приблизно ×2, не виміряно). Пам'яті (16 ГБ) вистачає з запасом.
- Якщо раптом буде OOM: `experimental: { parallelPrerender: { workers: 2 } }` в `astro.config.ts` (на гілці `site`).

### 3.3 Інкрементальна збірка: `experimental.incrementalBuild: true`

- Кеш лежить у **`node_modules/.astro/`** (це `cacheDir` за замовчуванням). Там маніфест `incremental-build.json` і **копії готових файлів** у `node_modules/.astro/dist/`.
- Попередній `dist/` **не потрібен**: пропущені сторінки відновлюються з копій у кеші. Для CI це головне: досить зберегти одну теку.
- Розмір кешу: ~38 МБ.
- Astro сам скидає весь кеш, якщо змінився конфіг або lockfile. Сторінка роуту перерендериться, якщо змінився код роуту чи будь-який імпортований ним модуль.
- Пропускаються тільки роути, які повертають `cacheKey` з `getStaticPaths()`. Зараз це лише згенеровані картинки:
  - `/reviews/*/index.png` (OG огляду)
  - `/reviews/*/preview.jpg` (превʼю для hover-карток)
  - `/posts/*/index.png`
  - `/og/*.png`

  Разом ~777 файлів з ~1212. HTML-сторінки рендеряться завжди, і це навмисно: вони залежать від усієї колекції й від `Date.now()`.
- `cacheKey` рахує `src/utils/imageCacheKey.ts`: хеш полів, які малює картинка, плюс **хеш вмісту** файлу обкладинки. Саме вмісту, а не mtime, бо після `actions/checkout` mtime усіх файлів скидається.
- Виміряно локально: перша збірка з порожнім кешем ~109 с, повторна ~23 с (стабільно).
- Інвалідацію перевірено: після зміни `summary` одного огляду з кешу взято 776 файлів, а змінена OG-картинка перегенерувалась з новим текстом.

Без збереження `node_modules/.astro` між запусками CI **кожна збірка буде холодною**, і incremental нічого не дасть. Задача цього handoff саме в тому, щоб налаштувати це збереження.

---

## 4. Що треба зробити в `publish.yml` (на `main`)

### 4.1 Зафіксувати Node (рекомендовано)

Додати після `Setup Bun` (або перед ним):

```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
```

`"22"` підтягне останню 22.x, а вона зараз ≥ 22.23.4. Можна також `"24"`, бо Astro 7 підтримує й Node 24. Не став `"lts/*"` без потреби: версія може змінитися несподівано.

### 4.2 Відновлювати й зберігати кеш Astro

Додати **перед** `Install dependencies` (після checkout і sync контенту):

```yaml
      - name: Restore Astro build cache
        uses: actions/cache@v4
        with:
          path: site/node_modules/.astro
          key: astro-build-${{ runner.os }}-${{ github.run_id }}
          restore-keys: |
            astro-build-${{ runner.os }}-
```

Чому саме так:

- **Унікальний `key` (`run_id`) + `restore-keys` за префіксом.** Кеш у GitHub Actions незмінний: entry з уже наявним ключем не перезапишеться. Тому кожен запуск відновлює найсвіжіший попередній кеш за префіксом і зберігає новий під своїм ключем. Збереження відбувається в post-кроці і тільки якщо job успішний. Це правильно: зламана збірка не повинна потрапити в кеш.
- **Порядок відносно `bun install`.** `bun install --frozen-lockfile` не видаляє `node_modules/.astro`, тож кеш можна відновлювати до встановлення залежностей. Якщо відновлювати після, теж працюватиме. Головне, щоб це сталося до `Build site`.
- **Не додавай хеш lockfile в `key`.** Astro сам скидає кеш при зміні lockfile, а з хешем у ключі після кожного оновлення залежностей перший запуск не мав би навіть маніфесту. Це не критично, просто зайве.
- **Обсяг.** Щоденний запуск додає один entry на ~38 МБ. GitHub видаляє entries, до яких не зверталися 7 днів, а ліміт репозиторію 10 ГБ. Проблем не буде.

### 4.3 (Опційно) кеш завантажень Bun

На incremental це не впливає, тільки трохи пришвидшує `bun install`:

```yaml
      - name: Cache Bun downloads
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('site/bun.lock') }}
          restore-keys: |
            bun-${{ runner.os }}-
```

### 4.4 Чого НЕ робити

- Не додавай `--force` до збірки: він ігнорує кеш.
- Не комітить `node_modules/.astro` у git.
- Не міняй `ref: site` на `astro-paper-v7`, якщо власник явно цього не попросить. Злиття міграції в `site` — окреме рішення.
- Не чіпай вміст вольта на `main`.
- Не змінюй `concurrency`, розклад і permissions.

---

## 5. Як перевірити, що все працює

1. Після злиття `astro-paper-v7` → `site` запустити workflow вручну (`workflow_dispatch`) **двічі** поспіль.
2. **Перший запуск** (кеш порожній): у лозі кроку `Restore Astro build cache` буде `Cache not found`. Збірка повна, у post-кроці з'явиться `Cache saved with key: astro-build-Linux-<run_id>`.
3. **Другий запуск:**
   - `Restore Astro build cache` → `Cache restored from key: astro-build-Linux-<попередній run_id>`.
   - У лозі `Build site` пропущені сторінки позначено як **`(restored)`**, бо `dist/` у CI свіжий і файли відновлюються з кешу. Для порожнього `dist/` інша мітка, `(cached)`, з'явитись не повинна. Очікувано ~777 рядків `(restored)`, усі на `.png`/`.jpg`.
   - Рядок `[build] N page(s) built in …` має показати помітно менший час, ніж перший запуск.
4. Перевірити сайт після деплою: OG-картинка будь-якого огляду (`/reviews/<…>/index.png`) і hover-превʼю (`/reviews/<…>/preview.jpg`) мають віддаватися й виглядати як раніше.

Для детального звіту по фазах можна тимчасово запустити `bunx astro build --timings` замість `bun run build`. У кінці буде рядок `Slowest pages (… · N from cache)`. Після перевірки поверни `bun run build`: у ньому є `astro check` і pagefind.

---

## 6. Dockerfile (опційно, нижчий пріоритет)

`Dockerfile` у гілці `site` збирає на `oven/bun:1`. Node в образі немає, тож `astro` запускається рантаймом Bun. Перевірено: збірка й `parallelPrerender` під Bun працюють (93 с з нуля локально). Змінювати нічого **не обов'язково**.

Щоб у Docker теж працював incremental, можна використати BuildKit cache mount на кроці збірки:

```dockerfile
RUN --mount=type=cache,target=/app/node_modules/.astro \
    bun run build
```

Кеш тоді житиме в BuildKit на хості, де виконується збірка, між `docker compose build`. Це зміна в гілці `site`, а не на `main`. Її варто погодити з власником окремо.

---

## 7. Відомі обмеження та підводні камені

- **Новий параметр в OG-шаблоні.** Якщо шаблон у `src/utils/og-templates/*.js` почне малювати нове поле запису, його треба додати в `cacheKey` відповідного роуту (`src/pages/**/index.png.ts`, `preview.jpg.ts`). Інакше старі картинки не оновляться, доки не зміниться код шаблону. Зміна коду шаблону сама інвалідує весь роут.
- **Fallback OG закешується.** `generateOgImageForReview` при помилці (наприклад, коли не вдалося завантажити шрифт з Google) рендерить запасний шаблон. Така картинка потрапить у кеш і лишиться, доки огляд не зміниться. Скинути можна запуском із `--force` або видаленням кешу в Settings → Actions → Caches.
- **Ручне скидання кешу:** видалити entries `astro-build-*` в Settings → Actions → Caches (або `gh cache delete --all`), або один раз запустити збірку з `--force`.
- **`cacheKey` не враховує асети, крім обкладинки.** Зміна `src/assets/images/default.png` / `default2.png` (запасні картинки для `preview.jpg`) кеш не інвалідує. Після такої зміни потрібен `--force` або скидання кешу.
- **Попередження в лозі, на які можна не зважати:** `[glob-loader] No files found … src/data/posts` і `The collection "posts" does not exist or is empty`, якщо в `content/posts` на `main` порожньо (локально так і є).
- **Відкат.** Прибрати `parallelPrerender` та/або `incrementalBuild` з блоку `experimental` в `astro.config.ts` (гілка `site`). Кроки кешу в CI можна лишити: без incremental вони просто зберігатимуть нікому не потрібний кеш.

---

## 8. Критерії готовності

- [ ] `publish.yml` на `main` містить `actions/setup-node` (Node 22) і `actions/cache` для `site/node_modules/.astro` з ключем по `run_id` і `restore-keys` по префіксу.
- [ ] Решту workflow (розклад, permissions, concurrency, sync контенту, deploy) не змінено.
- [ ] Після злиття міграції в `site` два ручні запуски поспіль: другий відновлює кеш, у лозі ~777 рядків `(restored)`, і він помітно швидший.
- [ ] Сайт після деплою віддає OG і preview-картинки коректно.
