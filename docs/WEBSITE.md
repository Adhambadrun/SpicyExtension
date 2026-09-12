# The SpicyExtension website — spicyextension.vercel.app

The `site/` folder is the source of the public website. It exists primarily because the Chrome Web
Store **requires a reachable privacy policy URL** before an item can be published, and because the
listing's Homepage and Support URLs should lead somewhere real rather than to a 404.

```text
site/index.html      → https://spicyextension.vercel.app/
site/privacy.html    → https://spicyextension.vercel.app/privacy.html   (Privacy tab)
site/support.html    → https://spicyextension.vercel.app/support.html   (Support URL)
site/styles.css      → SpicyTerminal tokens copied from the extension theme
site/assets/         → the store icon and four of the generated store screenshots
site/robots.txt, site/sitemap.xml
vercel.json          → output directory, caching and security headers
```

## Deploying from GitHub

`vercel.json` does all the configuration:

```json
{
  "framework": null,
  "installCommand": "echo 'Static site: no dependencies to install.'",
  "buildCommand": "echo 'Static site: nothing to build; publishing site/ as-is.'",
  "outputDirectory": "site"
}
```

1. In Vercel, choose **Add New… → Project** and import `Adhambadrun/SpicyExtension`.
2. Framework preset: **Other**. Leave the Build and Install command overrides **switched
   off** — `vercel.json` supplies them, and a UI override beats the file.
3. Deploy. A healthy log prints *"Static site: nothing to build"* and uploads from `site`.
4. Under **Settings → Domains**, confirm the project answers on `spicyextension.vercel.app`.
5. Every push to the production branch redeploys automatically.

### If the build fails

**`No Output Directory named "public" found`** means Vercel ran the repository's
`npm run build`, which is the *extension* bundler (it writes `dist/spicyextension`), and
then looked for a `public/` folder. Two causes:

- **The deployed commit predates `vercel.json`.** Check the "Cloning … Commit:" line at the
  top of the log against the commit that added this file, and make sure the Production
  Branch in **Settings → Git** is the branch that actually contains it.
- **The project has UI command overrides saved.** Clear them in
  **Settings → Build & Deployment** so `vercel.json` takes effect.

Redeploy with "Use existing Build Cache" unticked, then confirm:

```bash
curl -sSI https://spicyextension.vercel.app/ | head -1
curl -sSI https://spicyextension.vercel.app/privacy.html | head -1
curl -sSI https://spicyextension.vercel.app/support.html | head -1
```

Nothing secret is involved: the site is static, sets no cookies, loads no third-party script, font or
tracker, and makes no network requests of its own. `vercel.json` sends `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options`, a restrictive `Permissions-Policy`, and a
`Content-Security-Policy` of `default-src 'none'` with only same-origin images and inline styles
allowed.

## Keeping it honest

The site repeats the same claims as the extension's own help page and the store listing: one host
permission, no uploads, no storage, no background capture, and redaction that is explicitly
described as best effort rather than anonymization. If the extension's behaviour changes, update
these three surfaces together — `extension/pages/help.html`, `docs/CHROME_WEB_STORE.md` and
`site/`.

The screenshots in `site/assets/` are copies of the generated store screenshots. Refresh them with:

```bash
npm run shots:gen
cp store/screenshots/1-expanded-input-output.png   site/assets/shot-expanded.png
cp store/screenshots/2-select-one-result-area.png  site/assets/shot-select.png
cp store/screenshots/3-review-before-sharing.png   site/assets/shot-review.png
cp store/screenshots/4-toolbar-popup.png           site/assets/shot-popup.png
```

`site/assets/icon-128.png` is likewise a copy — of the store icon, which the site uses as its
favicon and header mark. Refresh it whenever the store art is regenerated, so the listing and the
site never show two versions of the brand:

```bash
npm run store:gen
cp store/icon-128.png site/assets/icon-128.png
```

## Verifying the domain for the listing

The Dashboard's **Official URL** dropdown only offers domains you own in
[Google Search Console](https://www.google.com/webmasters/tools). Add `spicyextension.vercel.app`
there and verify it (DNS TXT record, or the HTML-file method by dropping the verification file into
`site/`). Verification is optional — it is what produces the verified-publisher mark — and its
absence does not block publishing.

## Local preview

```bash
python3 -m http.server 3000 --directory site
```

Then open `http://localhost:3000/`. The pages are plain HTML and CSS, so no toolchain is required.
