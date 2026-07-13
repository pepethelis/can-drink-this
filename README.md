# can-drink-this — content

This branch is the **content source** for the [can-drink-this](https://github.com/pepethelis/can-drink-this) site. It holds only the `content/` folder from the Obsidian vault (`content/posts/`, `content/reviews/`, `content/assets/`) — nothing else from the vault is synced here.

This branch's working directory *is* the Obsidian vault at `D:\Obsidian\can-drink-this` — `.obsidian/`, `guide.md`, `todo.md`, and `*.canvas` live alongside `content/` on disk but are gitignored, so they never get committed.

## Updating content

Edit the vault's `content/` folder locally, then push the changes here:

```sh
# from D:\Obsidian\can-drink-this, with this branch checked out
git add -A
git commit -m "update content"
git push origin main
```

Pushing here does **not** trigger a rebuild by itself. The site rebuilds and redeploys either:

- automatically every day at 04:00 (Europe/Kyiv), or
- manually: go to the [Actions tab](https://github.com/pepethelis/can-drink-this/actions/workflows/publish.yml) → **Publish site** → **Run workflow** (choose `main`).

The `site` branch (code) is a separate branch in this same repo — see `.github/workflows/publish.yml` for how the two are merged at build time.
