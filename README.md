# can-drink-this — Energy Drink Review Database

A comprehensive, community-driven database of energy drink and beverage reviews. This vault documents the characteristics, flavors, design, and availability of energy drinks from brands like Monster, RedBull, Nonstop, Battery, and many others.

## 📁 Project Structure

- **`content/reviews/`** — Detailed reviews organized by brand and reviewer:
  - `friendly/` — Reviews from invited contributors
  - `own/` — Personal reviews
  - `subscribers/` — Community submissions
- **`content/posts/`** — Thematic collections and comparisons (e.g., "Top 10 Most Reviewed", "Zero Sugar Selection", "Caffeine Anomalies")
- **`content/assets/`** — Product images organized by brand
- **`bases/`** — Obsidian database views filtering reviews by status, types, owner, etc.
- **`templates/`** — Standardized templates for new reviews (standard, friendly, subscriber, new format)

## 🎯 Review Guidelines

Each review covers:
- **Flavor & Aroma** — Taste and smell impressions
- **Design & Packaging** — Visual appeal and line consistency
- **Technical specs** — Volume, caffeine (mg/100ml), energy value (kJ/kcal), carbohydrates, sweeteners
- **Origin & Import** — Manufacturing location, language options, availability rating (0-5 scale)
- **Container** — Manufacturer (AG, AMP, BALL, CanPack, etc.)
- **Conclusion** — Recommendations and related reviews

See [guide.md](guide.md) for detailed writing instructions.

## 🌐 Deployment & Syncing

This Obsidian vault syncs to the **content** branch of the [can-drink-this repository](https://github.com/pepethelis/can-drink-this). Only `content/` is synced; vault metadata (`.obsidian/`, `guide.md`, `todo.md`, canvases) stays local.

### Publishing changes:

```sh
# from D:\Obsidian\can-drink-this
git add -A
git commit -m "update content: [description]"
git push origin main
```

The site rebuilds automatically every day at 04:00 (Europe/Kyiv) or manually via GitHub Actions [Publish workflow](https://github.com/pepethelis/can-drink-this/actions/workflows/publish.yml).

The `site` branch contains the website code; both branches merge at build time.

## 📊 Key Stats

- **40+ Energy Drink Brands** covered
- **200+ Detailed Reviews** from multiple authors
- **Curated Collections** — Comparisons, selections, brand overviews
- **Multi-language Support** — Primarily Ukrainian with international references
