# reviews-test — content

This branch is the **content source** for the [reviews-test](https://github.com/pepethelis/reviews-test) site. It holds only the `content/` folder from the Obsidian vault (`posts/`, `reviews/`, `assets/`) — nothing else from the vault is synced here.

## Updating content

Edit the vault's `content/` folder locally, then push the changes here:

```sh
# from the vault's content/ folder, with this branch checked out
git add -A
git commit -m "update content"
git push origin main
```

Pushing here does **not** trigger a rebuild by itself. The site rebuilds and redeploys either:

- automatically every day at 04:00 (Europe/Kyiv), or
- manually: go to the [`site` repo's Actions tab](https://github.com/pepethelis/reviews-test/actions/workflows/publish.yml) → **Publish site** → **Run workflow**.

The `site` branch (code) is a separate branch in this same repo — see `.github/workflows/publish.yml` for how the two are merged at build time.
