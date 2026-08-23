# yvettege.xyz

Portfolio of Yanqin (Yvette) Ge. Static site, no build step, no dependencies.
Published by GitHub Pages from the root of `main`.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Home. Uses `styles-v2.css` and `script-v2.js`. |
| `*-case.html` | Ten project pages. Nine are rendered from `project-data.js` by `project-page.js`; `chula-case.html` is hand written. |
| `writing-*.html` | Seven academic writing pages, rendered from `writing-data.js` by `writing-page.js`. |
| `styles.css` / `script.js` | Shared by every case and writing page. |
| `contact-stage.js` | The closing television, used by the home page and every case page. |
| `web-assets/` | Every image and video the site references, and nothing else. |
| `404.html`, `CNAME`, `.nojekyll` | GitHub Pages plumbing. |
| `_originals/` | Not published, not committed. Full-resolution sources, unused assets, internal notes, superseded tooling. |

## Working on it

Serve the folder over HTTP rather than opening the files directly, or the
pages that fetch data will be blocked by the file:// origin rules.

```
python3 -m http.server 8899
```

Then open http://localhost:8899.

## Assets

Videos are H.264 in an MP4 container, encoded for the web. GitHub rejects any
single file over 100 MB, so the originals live in `_originals/` and only the
encoded versions are committed. If a source video is replaced, re-encode it
rather than committing the camera file.
