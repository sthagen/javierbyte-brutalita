# Brutalita

[![brutalita](https://raw.githubusercontent.com/javierbyte/brutalita/HEAD/public/brutalita-cover.svg)](https://brutalita.com/)

Brutalita is an experimental font and font editor, edit in your browser and download OTF.

The name means "little brutal" in spanish. Made with SVG and Opentype.JS

## Download

These links always point at the latest release.

| Weight | Desktop | Web |
| --- | --- | --- |
| Light | [Brutalita-Light.otf](https://brutalita.com/font/Brutalita-Light.otf) | [Brutalita-Light.woff2](https://brutalita.com/font/Brutalita-Light.woff2) |
| Regular | [Brutalita-Regular.otf](https://brutalita.com/font/Brutalita-Regular.otf) | [Brutalita-Regular.woff2](https://brutalita.com/font/Brutalita-Regular.woff2) |
| Bold | [Brutalita-Bold.otf](https://brutalita.com/font/Brutalita-Bold.otf) | [Brutalita-Bold.woff2](https://brutalita.com/font/Brutalita-Bold.woff2) |

```css
@font-face {
  font-family: 'Brutalita';
  src: url('https://brutalita.com/font/Brutalita-Regular.woff2') format('woff2');
  font-weight: 400;
}
```

## CLI

Compile a font source to `.otf` without opening the editor. The source is the
same JSON the editor exports — `{ "config": {...}, "chars": {...} }` — where
each glyph is a list of polylines on a 2×4 half-step grid.

```sh
pnpm dlx brutalita build my-font.json -o MyFont.otf
```

With no source argument it looks for `./font.json`, then `./src/font.json`, then
falls back to the copy of Brutalita bundled with the CLI.

### Commands

| Command | What it does |
| --- | --- |
| `build` | Compile a font source to `.otf` |
| `render` | Render text to a single-stroke `.svg` |
| `validate` | Check a font source for errors |
| `info` | Describe a font source, or read a built `.otf` back |
| `init` | Create a starter font source |
| `watch` | Rebuild whenever the source changes |

Run `brutalita help <command>` for the full option list.

```sh
# every weight at once, into a directory
brutalita build src/font.json -d public/font -w all

# pipe the bytes somewhere else
brutalita build src/font.json -w 700 -o - > Bold.otf

# a specimen image
brutalita render src/font.json -t "Hello\nWorld" --background "#111" --width 800 -o hello.svg

# check a font you are editing by hand
brutalita validate my-font.json --strict
brutalita info my-font.json
```

Diagnostics always go to stderr, so `--out -` and `--json` stay pipeable.
Exit codes: `0` success, `1` usage or I/O error, `2` invalid font source.

## Development

```sh
pnpm dev         # the editor at localhost:3000
pnpm cli         # run the CLI from source
pnpm assets      # regenerate every committed artifact (fonts + banner)
pnpm fonts       # just public/font/Brutalita-{Light,Regular,Bold}.{otf,woff2}
pnpm cover       # just the banner above
pnpm test        # unit tests + golden font/SVG regression tests
pnpm typecheck
pnpm build:cli   # bundle the CLI to dist/cli/brutalita.mjs
```

The generated files are committed: the `.otf` files are the golden reference for the
build tests, and GitHub serves the banner above straight from the repo. `pnpm assets`
rebuilds them byte-for-byte, so a clean `git status` afterwards means they are current.

To release a new version of the typeface, bump `config.version` in `src/font.json` and
the `--timestamp` in `fonts:otf`, then run `pnpm assets`.

The CLI bundles to a single dependency-free file, so `dist/cli/brutalita.mjs` is
the only thing published. The font-building core (`src/font-maker.ts`,
`src/svg-export.ts`, `src/font-validate.ts`) is shared with the browser editor
and stays free of DOM access.
