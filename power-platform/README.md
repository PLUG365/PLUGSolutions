# Power Platform assets

`flows/plug-solutions-submission-review.definition.template.json` is the review-ingestion flow source template.

- Replace `__FORM_ID__`, `__SHAREPOINT_SITE_URL__`, and `__SHAREPOINT_LIST_ID__` only in an untracked deployment copy.
- Never persist connection names, access tokens, responder email addresses, or tenant-specific secrets in this repository.
- New flows must be created stopped in the `みのる環境` developer environment.
- Activation, connection sharing, and promotion to another environment require human review and explicit approval.
- The two deployed flows belong to the unmanaged `PLUGSolutions` development Solution with publisher `PLUG365` and prefix `plug`.
- The unpacked `../solutions/PLUGSolutions` directory remains local-only because exported workflow definitions contain tenant-specific SharePoint bindings.
- The placeholder-based JSON files under `flows/` are the reviewable, repository-safe source templates. Tracking a full unpacked Solution is deferred until connection references and deployment settings can be represented without tenant-specific values.
- Both the ingestion flow and the approved-JSON export flow are active. The export flow has passed its controlled first-run test with synthetic operations data; it still writes only to the private `Exports` library.

The flow intentionally ignores the Microsoft Forms `responder` property. The current form has nine questions: Q6 carries multi-select format/use values, Q8 carries at most one `ソース:` and one `手順:` HTTPS URL, and Q9/I01 carries the optional thumbnail candidate. Legacy P08/`Requirements` and the former normalized Catalog* columns were retired from SharePoint on 2026-08-28 after reference and view checks; they are not used for public JSON. Only the public author name, public X handle, submitted work information, consent answer, response identifier, and submission timestamp are written to the private review list.

`flows/plug-solutions-approved-json-export.definition.template.json` generates a private JSON candidate from an approved review item using the raw Forms fields, Q6/Q8 normalization preview, and safe defaults for values removed from the form. Final classification, URL validation, and image processing remain fail-closed in the GitHub Actions Node step. It uses an allowlisted object matching `catalog/schema.json` and overwrites `Exports/<slug>.json` idempotently. It never writes to GitHub or the public site.

GitHub intake automation is a separate read-only consumer of the approved SharePoint list. See `../docs/approved-intake-automation.md`. It uses Entra OIDC and list-scoped read permission, then creates a reviewable Pull Request; it does not modify SharePoint or publish the site.

## Import an approved JSON candidate manually

Download the reviewed file from the private `Exports` library, then validate it locally without writing:

```powershell
npm run import:solution -- --input "<downloaded-json>"
```

After reviewing the reported slug and destination, create the catalog record explicitly:

```powershell
npm run import:solution -- --input "<downloaded-json>" --write
```

The importer rejects unknown or private fields, invalid public data, and missing processed thumbnails. It does not overwrite an existing slug unless `--write --replace` is supplied. Always review the existing record before using `--replace`, then run `npm run check` before committing.
