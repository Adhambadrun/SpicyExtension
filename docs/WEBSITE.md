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

1. In Vercel, choose **Add New… → Project** and import `Adhambadrun/SpicyExtension`.
2. Framework preset: **Other**. There is no build step — `vercel.json` sets
   `"outputDirectory": "site"`, so Vercel publishes the folder as static files.
3. Leave the build command empty and deploy.
4. Under **Settings → Domains**, confirm the project answers on `spicyextension.vercel.app`.
5. Every push to the default branch redeploys automatically.

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
