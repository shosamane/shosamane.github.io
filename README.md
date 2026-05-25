# Researcher portfolio — Quarto theme

An editorial-minimal Quarto theme for a researcher portfolio + blog, with
ambient walking stick figures + 10 choreographed sociotechnical scenarios
on the home page.

## What's in here

```
quarto/
├── _quarto.yml                 # site config — navbar, footer, fonts, theme wiring
├── theme.scss                  # light theme (SCSS variables + rules)
├── theme-dark.scss             # dark theme overrides
├── custom.css                  # CSS for things SCSS can't reach
├── partials/
│   └── title-block.html        # editorial article header (Pandoc template)
├── assets/
│   ├── logo.svg                # navbar logo (Friends Trio)
│   ├── logo-duo.svg            # fallback (Friends Duo)
│   ├── creatures.css           # ambient walking figures + gestures
│   ├── creatures.js            # walker primitives + 10 scenarios
│   └── favicon.svg
├── index.qmd                   # home page (loads creatures.* in header)
├── about.qmd                   # about / CV
└── writing/
    ├── _metadata.yml
    ├── index.qmd               # blog listing (chronological + categories)
    ├── file-formats.qmd        # sample long-form post
    ├── auditors.qmd
    └── default.qmd
```

## Requirements

- [Quarto](https://quarto.org) **≥ 1.4** (tested on 1.5)
- Web access to Google Fonts (or self-host — see *Self-hosting fonts*)

## Local build

From inside the `quarto/` directory:

```bash
quarto preview       # live preview on :4200
quarto render        # build to _site/
```

## Deployment

### GitHub Pages (recommended)

1. Push this folder to a GitHub repo (e.g. as the contents of the repo root).
2. Add a workflow at `.github/workflows/publish.yml`:

   ```yaml
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: quarto-dev/quarto-actions/setup@v2
         - uses: quarto-dev/quarto-actions/publish@v2
           with:
             target: gh-pages
   ```
3. In the repo's Settings → Pages, set the source to the `gh-pages` branch.

Your site will publish to `https://<username>.github.io/<repo>/`.

### Netlify / Vercel / any static host

```bash
quarto render
```

Upload the contents of `_site/` to your host. No build configuration on the
host side is needed — it's a static site.

For Netlify, add a `netlify.toml`:

```toml
[build]
  command = "quarto render"
  publish = "_site"
```

### Self-host

`quarto render` then serve `_site/` with any static file server
(`python -m http.server`, nginx, Caddy).

## Replacing the placeholder content

Search-and-replace the obvious bits — they're all clearly marked:

- **`Your Name`** — used throughout. One global S&R covers it.
- **`you@university.edu`** / **`@you@scholar.social`** — in `about.qmd`.
- **`yourname.example`** — in `_quarto.yml` (`site-url`).
- **The bio paragraphs** in `index.qmd` and `about.qmd`.
- **All four sample posts under `writing/`** — delete and add yours.

The "Now" panel on the home page is a `.now` definition list. The recent
writing list is wired to the `writing/` folder automatically (sorted by
date, four most recent).

## Walking figures (home page)

A vanilla-JS effect loaded ONLY on `index.qmd` via its front-matter
`include-in-header`. Files:

```
assets/
├── creatures.css   # ~11 KB — animations, layout, theme tokens
└── creatures.js    # ~20 KB — walker primitives + 10 scenarios
```

**Performance posture:**

- All motion is GPU-composited CSS animations / transitions
- JS only schedules occasional class toggles for scenario choreography (no rAF, no per-frame work)
- `prefers-reduced-motion: reduce` — figures are skipped entirely
- Tab-hidden pause — all animations stop when tab isn't visible (zero CPU)
- Home-page only — included via per-page front matter

**To disable entirely**, remove the `include-in-header` block from `index.qmd`.

**To customize**, edit `assets/creatures.js`:
- Adjust `PROCESSION` array for background walker count / sizes / speeds
- Adjust `REGISTRY` weights to make some scenarios more/less common
- Add new scenarios — copy any existing one as a template

## Customizing the design

### Color

Single accent variable in `theme.scss`:

```scss
$accent:       #2A4D6E;     // ink-blue
$accent-soft:  rgba(42, 77, 110, 0.08);
```

Four palettes:

| Mood        | Accent (light) | Accent (dark) |
|-------------|----------------|---------------|
| Ink blue    | `#2A4D6E`      | `#84ACD2`     |
| Oxblood     | `#7A2E2A`      | `#D08C88`     |
| Forest     | `#2E5A3F`      | `#88BCA0`     |
| Ochre       | `#A0782B`      | `#D6B26A`     |

Update `theme.scss` and `theme-dark.scss` together.

### Type

Three Google Font families:

- **Newsreader** — serif headlines + italic display
- **Inter Tight** — sans body
- **JetBrains Mono** — labels, metadata, code

Swap in `_quarto.yml` and `theme.scss`.

### Density

`linestretch` in `_quarto.yml` controls body leading (default `1.62`).

### Reading measure

`grid.body-width` in `_quarto.yml` (default `640px`).

## Authoring conventions

Pandoc fenced divs the theme styles:

- `## Heading {.rule}` — small-caps mono section divider with hairline
- `::: {.eyebrow} ... :::` — mono small-caps preamble
- `::: {.dropcap} ... :::` — drop-cap on the first paragraph
- `::: {.pullquote} ... :::` — large italic block-pull-quote
- `::: {.now} <dl> :::` — home-page "Now" panel layout
- `::: {.cv} <dl> :::` — CV-style two-column definition list
- `::: {.placeholder} ... :::` — striped figure placeholder

Front-matter knobs the title-block partial reads: `eyebrow`, `subtitle`,
`reading-time`, `author`, `doi`.

## Self-hosting fonts

Replace the Google Fonts `<link>` in `_quarto.yml` with `@font-face`
declarations pointing into `assets/fonts/`. Quarto copies any directory
referenced from your `.qmd` files automatically.

## Dark mode

Quarto's brightness toggle appears automatically when both `light` and
`dark` themes are declared in `_quarto.yml`. Disable by removing the
`dark:` line.

## RSS

`writing/index.qmd` has a `feed:` block; Quarto generates
`writing/index.xml` on render.

## License

The theme files (SCSS, CSS, JS, `_quarto.yml`, partials) are CC0. Sample
content under `writing/` and `about.qmd` is for demonstration — replace it.
