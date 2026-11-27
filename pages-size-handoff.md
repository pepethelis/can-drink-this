# Handoff: зменшити `dist` нижче за ліміт GitHub Pages (галерея через `getImage`)

Документ для агента, який вноситиме зміни в код сайту (гілка `site`). Діагностику вже зроблено, тут зібрано все, що відомо. Рішення погоджене з власником: **оригінали фото на сторінках замінюємо оптимізованими версіями через `getImage()` з `astro:assets`**. Вихідні файли у вольті (`content/assets`) не чіпаємо.

Дата: 2026-11-25.

---

## 1. Симптом

Workflow `Publish site` (`main:.github/workflows/publish.yml`) падає на кроці `Deploy to GitHub Pages`:

```
Fetching artifact metadata for "github-pages" in this workflow run
Found 0 artifact(s)
Error: No artifacts named "github-pages" were found for this workflow run.
```

Невдалі запуски: `45386959766` (schedule, 24.11, ще Astro 5) і `45524409578` (workflow_dispatch, 25.11, вже Astro 7). Останній успішний запуск: `45151600851` (23.11).

## 2. Причина

- Крок `Upload Pages artifact` проходить успішно, але артефакт `github-pages` важить **1 132 850 770 байт (≈1,13 ГБ)**. Опублікований сайт на GitHub Pages не може бути більшим за **1 ГБ**. Помилка `Found 0 artifact(s)` у deploy-pages є наслідком перевищення цього ліміту, сам артефакт на місці.
- Зміни CI (кеш `node_modules/.astro`, setup-node) тут ні до чого: кеш у `dist` не потрапляє, а запуск 24.11 впав ще до них.

### Що роздуває `dist`

Розбивка за списком файлів із лога `Upload Pages artifact` (run `45524409578`), усього 7331 файл:

| Що | Кількість | Коментар |
|---|---|---|
| `_astro/*.webp` | 4595 | оптимізовані варіанти (нормально) |
| `_astro/*.jpg` / `*.jpeg` | 277 / 175 | **оригінали фото з телефона без змін** |
| `reviews/*/index.png`, `preview.jpg`, `og/*.png` | ~777 | згенеровані OG і превʼю (нормально) |
| `pagefind/*` | 571 | пошуковий індекс |

У `content/assets` лежить 447 jpg/jpeg загальним обсягом **~749 МБ**, 176 з них більші за 2 МБ. У `dist/_astro` потрапило 452 jpg/jpeg, тобто **майже всі оригінали без жодної обробки**. Саме вони й переповнюють ліміт.

### Звідки беруться оригінали (гілка `site`)

Astro копіює оригінал зображення в `dist`, якщо код посилається на нього напряму: через імпорт `?url` або через доступ до властивостей `ImageMetadata`, наприклад `.src`. Імпортований `ImageMetadata` в Astro обгорнутий у Proxy, і будь-який доступ до властивості, крім `fsPath` і `clone`, позначає оригінал як використаний. Перевір це в `node_modules/astro/dist/assets/utils/node/emitAsset.js` (або поруч, шукай `referencedImages`). Невикористані оригінали Astro після збірки видаляє.

Місця в коді, знайдені через `git grep` по `origin/site`:

1. **`src/components/Gallery.astro`**. Це основне джерело.
   - `import.meta.glob("/src/data/**/*.{png,jpg,jpeg,webp,avif,gif,svg}", { eager: true, query: "?url", import: "default" })`. Eager-glob з `?url` змушує Vite емітити **кожен** файл, що збігається з шаблоном, навіть якщо його ніде не показують.
   - `getSrc()` для `ImageMetadata` повертає `image.src`, тобто оригінал.
   - Рендер іде через звичайний `<img src={src}>`: у каруселі висотою `h-80` (320 px) і одним фото на всю ширину з `max-h-130`.
2. **`src/layouts/ReviewDetails.astro`** (рядки ~70–100) і **`src/layouts/PostDetails.astro`** (рядки ~53–85).
   - `productPhotoUrl` / `rawPhotoUrl` = `resolved.src` / `initOgImage.src`, тобто URL оригіналу.
   - Цей рядок іде першим елементом `galleryItems` → `<Gallery>`, отже обкладинка в галереї теж оригінал.
   - Він же є fallback для `og:image`, коли `SITE.dynamicOgImage` вимкнено. Зараз увімкнено, тож для meta використовується згенерований `index.png`.
3. **`src/utils/generateOgImages.ts`** (`resolveOgImageBase64`, ~рядок 66) і **`src/utils/generatePreviewImage.ts`** (`resolveCoverFilePath`, ~рядок 17) читають `(cover as { src: string }).src`, щоб дістати імʼя файлу. Через Proxy це теж може позначати оригінал як використаний, навіть якщо в HTML його немає.

Що вже правильно і змінювати не треба: `CardReview.astro`, `CardPost.astro`, `ReviewGrid.astro`, `DrinkGroupCard.astro` для `ImageMetadata` рендерять `<Image>` з розмірами. Картинки в тілі markdown (`remark-obsidian-image.ts` перетворює `![[...]]` на звичайні markdown-зображення) Astro оптимізує сам.

---

## 3. Що зробити

Робоча гілка: відгалузься від `site` (наприклад, `fix/pages-size`). Злиття в `site` погоджується з власником. Не комітити в `main`, на `main` лежить вольт.

### 3.1 `Gallery.astro`: оптимізувати через `getImage`

- Прибрати eager-glob `?url` для зображень. Замість нього glob **без** `?url` (`{ eager: true, import: "default" }`), як уже зроблено в `ReviewDetails.astro`, щоб отримувати `ImageMetadata`. Для резолву рядкових посилань (`[[file.jpg]]`) використовувати наявний `resolveImageAsset` з `src/utils.ts`.
- Для кожного зображення, яке зрезолвилось у `ImageMetadata`, у frontmatter компонента викликати `getImage()`:

  ```ts
  import { getImage } from "astro:assets";

  const optimized = await getImage({
    src: meta,          // ImageMetadata
    width: 1600,        // не більше за оригінал; getImage сам не збільшує
    format: "webp",
    quality: 80,
  });
  // optimized.src -> URL у /_astro/*.webp
  ```

  Варіант: `widths: [800, 1600]` + `optimized.srcSet.attribute` у `srcset`. Тоді на мобільних вантажиться менше. Головне, щоб у HTML не лишилось посилання на оригінал.
- `<img>` у розмітці лишити зі старими класами і передавати `src={optimized.src}` (і `srcset`, якщо використовуєш), а також `width`/`height` з `optimized.attributes`, щоб не було CLS.
- **Відео** (`videoAssets`, glob `?url` для `mp4/webm/ogg`) лишити як є. Зараз у `content/assets` відео немає, glob просто порожній.
- Рядки, що починаються з `http` або `/`, віддавати як є, без `getImage`.
- Якщо рядок не зрезолвився в `ImageMetadata` (файлу немає), поведінка має лишитися як зараз: віддати рядок.

### 3.2 `ReviewDetails.astro` і `PostDetails.astro`: не передавати `.src` в галерею

- У `galleryItems` першим елементом передавати сам `ImageMetadata` обкладинки (`resolved` / `initOgImage`), а не `productPhotoUrl` / `rawPhotoUrl`. Тоді `Gallery` оптимізує його так само, як решту.
- `productPhotoUrl` / `rawPhotoUrl` потрібні тільки для fallback `og:image`. Там теж замінити `.src` на `(await getImage({ src: meta, width: 1200, format: "jpg" })).src`, бо для OG краще jpg/png, ніж webp. Або обчислювати fallback тільки коли `!SITE.dynamicOgImage`, щоб оригінал не позначався як використаний за замовчуванням.

### 3.3 Генератори OG і превʼю: не чіпати `.src` у `ImageMetadata`

У `generateOgImages.ts` (`resolveOgImageBase64`) і `generatePreviewImage.ts` (`resolveCoverFilePath`) імʼя файлу береться з `.src`. Спершу **перевір**, чи доступ до `.src` справді позначає оригінал (див. Proxy в розділі 2). Якщо так:

- брати шлях з `fsPath` (не позначає оригінал): `(cover as { fsPath?: string }).fsPath`, з fallback на поточну логіку для рядків;
- або перевести ці функції на сирий рядок з frontmatter (`post.data.cover` до резолву schema). Це складніше, бо в schema стоїть `image()`.

**Увага:** `src/utils/imageCacheKey.ts` хешує вміст файлу обкладинки для `cacheKey` інкрементальної збірки. Якщо він теж бере шлях через `.src`, змінюй його синхронно, інакше `cacheKey` розійдеться з тим, що реально малює генератор.

### 3.4 Чого НЕ робити

- Не змінювати й не стискати файли в `content/assets` на `main`.
- Не вимикати `parallelPrerender` / `incrementalBuild`.
- Не змінювати `publish.yml` в межах цієї задачі (див. розділ 5).
- Не виносити фото на сторонній хостинг чи CDN без окремого погодження.

---

## 4. Як перевірити

1. Локально синхронізувати контент так само, як CI: скопіювати `content/posts`, `content/reviews` і `content/assets` з `main` у `site/src/data/`. Потім `bun install` і `bun run build`.
2. Оригінали зникли:
   ```sh
   find dist/_astro -iname '*.jpg' -o -iname '*.jpeg' | wc -l   # очікувано ~0 (було 452)
   du -sh dist                                                  # має бути < 1 ГБ, бажано з великим запасом (<500 МБ)
   ```
   Якщо jpg/jpeg лишились, знайди за хешем у назві, хто на них посилається: `grep -rl "<назва>" dist --include=*.html`. Якщо в HTML посилання немає, оригінал позначив Proxy (розділ 3.3).
3. Ніде немає посилань на оригінали: `grep -rhoE '/_astro/[^"]+\.(jpe?g|JPG)' dist --include=*.html | sort -u` має повернути порожньо.
4. Візуальна перевірка (`bun run preview`):
   - сторінка огляду з кількома фото: карусель, фото чіткі, без стрибків верстки;
   - огляд з одним фото: велике фото на всю ширину;
   - пост із галереєю;
   - картки на головній і в списках не змінились;
   - `/reviews/<…>/index.png` і `/reviews/<…>/preview.jpg` генеруються як раніше.
5. `astro check` без помилок (входить у `bun run build`).
6. Після злиття в `site` запустити `Publish site` вручну: deploy має пройти. У лозі `Upload Pages artifact` фінальний розмір (`Final size is … bytes`) має бути помітно меншим за 1 ГБ.

---

## 5. Опційно: запобіжник у CI (на `main`, окремо)

Щоб ліміт не спливав знову непомітно, можна додати в `publish.yml` перед `Upload Pages artifact` крок, який падає з зрозумілим повідомленням:

```yaml
      - name: Check site size (GitHub Pages limit 1 GB)
        run: |
          size=$(du -sb site/dist | cut -f1)
          echo "dist size: $size bytes"
          if [ "$size" -gt 1000000000 ]; then
            echo "::error::site/dist is $size bytes, over the 1 GB GitHub Pages limit"
            exit 1
          fi
          if [ "$size" -gt 800000000 ]; then
            echo "::warning::site/dist is $size bytes, approaching the 1 GB limit"
          fi
```

Це зміна на `main`. Її треба погодити з власником окремо і комітити тільки цей файл.

---

## 6. Критерії готовності

- [ ] У `dist/_astro` немає оригінальних jpg/jpeg з `content/assets` (або лишились тільки свідомо потрібні).
- [ ] `du -sh dist` < 1 ГБ із запасом.
- [ ] Галерея на сторінках оглядів і постів показує оптимізовані webp, вигляд і верстка не змінились.
- [ ] OG (`index.png`) і превʼю (`preview.jpg`) генеруються як раніше, `cacheKey` інкрементальної збірки узгоджений з джерелом шляху до обкладинки.
- [ ] `bun run build` проходить без помилок `astro check`.
- [ ] Після злиття в `site` workflow `Publish site` успішно деплоїть.
