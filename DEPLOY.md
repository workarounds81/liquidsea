# Deploying liquidsea.net

The site auto-builds and deploys via GitHub Actions on every push to `main`
(plus a weekly scheduled rebuild so past events move to the archive on their
own). You only need to do the steps below **once**.

## 1. Turn on GitHub Pages

1. Push this repo to GitHub and merge to `main`.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push any commit to `main` (or run the "Build and deploy to GitHub Pages"
   workflow from the Actions tab). The site appears at
   `https://<your-username>.github.io/<repo>/` first, and at the custom domain
   after step 2 below.

## 1.5 Switch off the free-preview link prefix once you buy the domain

Right now `.github/workflows/deploy.yml` builds with `GITHUB_PAGES_PROJECT_URL: "1"`,
which makes every internal link start with `/liquidsea/` so the free
`workarounds81.github.io/liquidsea/` address works correctly while you're still
deciding on a domain. **Once you've bought liquidsea.net and completed step 2
below**, delete that `env:` block (the two lines under `- run: npm run build`)
in `.github/workflows/deploy.yml` and push — this switches every link back to
plain root paths, which is what the custom domain needs.

## 2. Point liquidsea.net at GitHub Pages

In the same **Settings → Pages** screen, enter `liquidsea.net` under
**Custom domain** and save (the repo also ships a `CNAME` file). Then add these
records at your domain registrar's DNS panel:

### Apex domain (liquidsea.net) — four A records + four AAAA records

| Type | Host/Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

### www subdomain

| Type | Host/Name | Value |
| --- | --- | --- |
| CNAME | `www` | `<your-username>.github.io.` |

DNS can take up to a few hours to propagate. Back in **Settings → Pages**,
wait for the DNS check to pass, then tick **Enforce HTTPS**.

## 3. Email forwarding (hello@liquidsea.net) — ImprovMX

Email is handled separately from the website. Create a free
[ImprovMX](https://improvmx.com) account, add the domain `liquidsea.net`, set
the forward to your real inbox, and add these records at your registrar:

| Type | Host/Name | Priority | Value |
| --- | --- | --- | --- |
| MX | `@` | `10` | `mx1.improvmx.com` |
| MX | `@` | `20` | `mx2.improvmx.com` |
| TXT | `@` | — | `v=spf1 include:spf.improvmx.com ~all` |

MX records don't conflict with the A/AAAA records above — web and mail
coexist on the same apex domain.

## 4. Newsletter form (Web3Forms)

1. Get your free access key at [web3forms.com](https://web3forms.com) using
   hello@liquidsea.net.
2. Open `src/data/site.json` and replace the value of `"web3formsKey"`
   (currently `PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE`) with your key.
3. Commit and push. That's the only place the key lives; the form on the home
   page picks it up automatically. (The key is public by design — Web3Forms
   keys are meant to be embedded in static sites.)

## Rebuilding without a code change

**Actions tab → Build and deploy to GitHub Pages → Run workflow.** The
scheduled Monday-morning rebuild does this automatically each week.
