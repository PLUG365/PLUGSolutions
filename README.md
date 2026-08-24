# PLUG Solutions

PLUG Solutions is a field-first catalog for portable solutions created by individual makers. It starts from the Power Platform community and also covers web, mobile, desktop, AI, and open-source projects.

Repository: [PLUG365/PLUGSolutions](https://github.com/PLUG365/PLUGSolutions)

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

## Validation and static export

```bash
npm run check
```

The static site is exported to `out/`. Azure Static Web Apps should deploy that directory without rebuilding it.

Production deployment runs only after the `CI` workflow succeeds for a push to protected `main`. The deployment job uses the `production` environment and waits for approval from `minoru365` before it can access the Azure deployment token.

## Catalog records

Add one approved public record per solution under `catalog/solutions/<slug>.json`. The public schema is documented in `catalog/schema.json` and enforced by `npm run validate:catalog`.

Private Forms responses, review notes, email addresses, consent records, and candidate thumbnail URLs must never be copied into this repository. Only aggregate reactions belong in `catalog/reactions.json`.

### Process an approved thumbnail

After a human has checked the public source URL, usage rights, sensitive content, and personal information, save the source image locally and run:

```bash
npm run thumbnail -- path/to/source.png solution-slug
```

The command accepts PNG, JPEG, or WebP files up to 10 MB and 25 MP. It creates a metadata-free 1200×675 WebP at `public/images/solutions/<slug>.webp`. Use the resulting `/images/solutions/<slug>.webp` value in the approved catalog record. Do not run this command directly against an unreviewed remote URL.

## Forms and analytics

Copy `.env.example` to `.env.local` and fill only the public Forms URLs when they are ready. Application Insights remains disabled until its collection settings, retention, region, and cost receive human review.

## Project links

- [PLUG Guide](https://plug365.github.io/PLUGGuide/)
- [PLUG on connpass](https://plug.connpass.com/)

PLUG Solutions is operated personally by minoru365 and is not an official Microsoft service.
