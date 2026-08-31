# Agent Guidelines for can-drink-this

## 📋 Role & Purpose

Agents assist in maintaining quality, consistency, and completeness of the energy drink review database. Responsibilities include:
- Reviewing and editing submissions for completeness and accuracy
- Enforcing template standards and formatting guidelines
- Fact-checking technical specifications (caffeine, calories, etc.)
- Ensuring consistent voice and tone across reviews
- Managing asset organization and image placement
- Quality control on comparisons and curated posts

## ✅ Content Quality Standards

### Mandatory Review Sections
Every review **must** include:
1. **Official flavor name** — From product packaging (if unavailable, explicitly state it)
2. **Flavor & aroma description** — Personal sensory impressions
3. **Design & packaging notes** — Visual quality, consistency with brand line
4. **Color coding analysis** — Whether product follows brand's design system
5. **Top & key design** — Description of lid/pull-tab (default vs. special)
6. **Liquid color** — Color of the beverage
7. **Volume** — Container size in liters (note any other available sizes)
8. **Caffeine content** — mg/100ml (primary measurement)
9. **Energy value** — kJ/kcal per 100ml
10. **Carbohydrates & sugars** — Total carbs and sugar content per 100ml
11. **Sweeteners** — Complete list from ingredients (sugar, aspartame, sucralose, acesulfame K, erythritol, etc.)
12. **Origin & market** — Manufacturing location, language(s) on packaging, regional availability
13. **Container manufacturer** — AG, AMP, BALL, CanPack, BagPack, Quality, etc. (not beverage brand)
14. **Availability rating** — 0–5 scale:
    - 0: Unavailable, limited series, discontinued
    - 1: Extremely rare; requires significant effort to find
    - 2: Available in specific regions only; limited/no import to Ukraine
    - 3: Regional availability + some import with limitations
    - 4: Fairly available; good import status (e.g., Nonstop, MonsterUA)
    - 5: Widely available everywhere (e.g., Vivachyk Apple)
15. **Conclusion** — Recommendations, comparisons, flavor parallels, overall recommendation

### Writing Standards

- **Product names**: Use official branding (manufacturer's exact spelling)
  - ✅ Good: "Battery mix", "Burn apple-kiwi (Björn зелений)"
  - ❌ Bad: "Мфнстер зелений" (non-standard transliteration)
- **Tone**: Descriptive, personal, honest — avoid extreme hyperbole
- **Cross-references**: Link to at least one related review when possible
- **Specifications**: Always cite source (e.g., "per nutrition label on back")

## 🚫 Misspelling Allowlist

The following terms/spellings are **intentional** and should NOT be flagged as errors:

**Ukrainian dialect/slang:**
- `доречі`, `зроз`, `пон`, `іпсо`, `реалє`, `чюваки`, `повучаєцця`
- `львувське` / `у львуві` (L'viv regional style)
- `сексасною` or stylized variations
- `гої` or variations
- `омерика` or variations (deliberate spelling for effects/radlers)
- `хз`, `аутистичний`, `сраку` as intentional informal/slang usage in context

**Brand styling:**
- `мфнстер` — intentional stylization of "Monster" (visual/design reference)

## 🎨 Asset Organization

- Images placed in `/content/assets/[BRAND]/`
- Naming convention: lowercase, hyphens for multi-word brands
  - ✅ `monster/`, `red-bull/`, `dark-dog/`
- Minimum 1 image per review; ideally multiple angles (front, back, top)
- Fallback images: `default.png`, `default2.png`

## 📝 Database Metadata (Frontmatter)

Reviews should include YAML frontmatter:
```yaml
status: Published | Draft | Prebuild
tags: [brand, taste, types]
externalUrl: (optional link to brand site or source)
brand: [Brand Name]
types: [Energy Drink | Alco-Energy | Pre-Workout | Other]
taste: [Official flavor from packaging]
postedAt: [Date]
favorite: [true/false]
container: [Volume, e.g., "0.5L"]
sweeteners: [List of sweetening agents]
```

## 🔍 Editorial Checklist

Before approving a review:
- [ ] All mandatory sections present
- [ ] Specifications match official sources (packaging, manufacturer website)
- [ ] Flavor name matches official branding
- [ ] Availability rating justified with reasoning
- [ ] At least one related review linked
- [ ] Images organized in correct asset folder
- [ ] No typos or formatting inconsistencies
- [ ] Tone appropriate (honest, informative, not overly opinionated)
- [ ] No misleading claims (verify caffeine, calories, ingredients)

## 👥 Reviewer Categories

- **Own** — Primary reviewer(s)' personal reviews
- **Friendly** — Invited/trusted contributors
- **Subscribers** — Community submissions

All categories follow the same quality standards. Subscriber reviews may need additional fact-checking.
