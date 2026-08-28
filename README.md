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

Production deployment is started manually from the `Deploy production` workflow after changes have accumulated on protected `main`. The selected `main` commit is checked again with `npm run check`, then the deployment job waits for approval from `minoru365` before it can access the Azure deployment token.

## Catalog records

The `Sync catalog lifecycle` workflow reads approved rows from the private Forms-linked SharePoint list and prepares the matching record under `catalog/solutions/<slug>.json` (including a processed thumbnail when available). Do not hand-edit a synced record; review and merge the generated PR so the SharePoint row remains the source of truth. The public schema is documented in `catalog/schema.json` and enforced by `npm run validate:catalog`.

Private Forms responses, review notes, email addresses, consent records, and candidate thumbnail URLs must never be copied into this repository. Only aggregate reactions belong in `catalog/reactions.json`.

### Process an approved thumbnail

After a human has checked the public source URL, usage rights, sensitive content, and personal information, save the source image locally and run:

```bash
npm run thumbnail -- path/to/source.png solution-slug
```

The command accepts PNG, JPEG, or WebP files up to 10 MB and 25 MP. It creates a metadata-free 1200×675 WebP at `public/images/solutions/<slug>.webp`. Use the resulting `/images/solutions/<slug>.webp` value in the approved catalog record. Do not run this command directly against an unreviewed remote URL.

## Forms, reactions, and analytics

Copy `.env.example` to `.env.local` and fill only the public submission/report Forms URLs and the public `NEXT_PUBLIC_REACTIONS_API_URL` when they are ready. Application Insights remains disabled until its collection settings, retention, region, and cost receive human review.

### Cloudflare reactions

The optional reaction API lives in [`worker/`](worker/). It uses Cloudflare Workers Free and D1 Free. Apply `worker/migrations/0001_reactions.sql`, set the fixed `ALLOWED_ORIGIN` and `CATALOG_MANIFEST_URL` in `worker/wrangler.toml`, and configure the D1 database ID before enabling the deployment workflow. The worker stores only aggregate counters and SHA-256 visitor-token hashes; raw tokens and personal data are never persisted. A hard limit of 5,000 new events per UTC day and a unique `(slug, reaction_type, visitor_hash)` key provide abuse and retry guardrails. The Cloudflare workflow skips safely when its production token/account variables are absent.

The submission form questions, privacy boundary, review-only fields, and release checklist are defined in [`docs/submission-form.md`](docs/submission-form.md).

Public applicant and operator instructions are exported at `/guide/`. `/lounge/` shows a short consent page first, then embeds one fixed chat.exe room after the attendee confirms. It is available whenever `NEXT_PUBLIC_LOUNGE_MODE=open` and a valid room name are configured; PLUG does not add an event-time window or presence-based auto-close. Set the mode to `closed` for an emergency shutdown. `private=1` only hides the room from chat.exe's public room list, and is not authentication. The embed keeps room movement and camera, microphone, and screen-capture permissions disabled.

The production environment must define `NEXT_PUBLIC_SUBMISSION_FORM_URL` before release. The deployment workflow passes public `NEXT_PUBLIC_*` environment variables into the static build; never store secrets in these variables.

## Project links

- [PLUG on connpass](https://plug.connpass.com/)

PLUG Solutions is operated personally by minoru365 and is not an official Microsoft service.
