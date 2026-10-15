# Dependency review — 15 October 2026

The full application's production dependency audit now reports **0 vulnerabilities** (`npm audit --omit=dev`). The complete audit reports **5 high-severity package entries**, all in the development-only Tailwind 3 toolchain. These are five affected packages in one dependency chain, not five independently demonstrated exploits.

## Changes

| Package | Version selected | Reason |
|---|---|---|
| Next.js | 15.5.28 | Current v15 backport; avoids an unrelated React/framework migration |
| Nodemailer | 10.1.1 | Removes the reported SMTP, parsing and transport advisories |
| Puppeteer | 25.14.0 | Removes the old browser extraction/proxy dependency chain |
| Supabase SSR | 0.6.1 | Uses patched cookie parsing while retaining the existing Supabase client API |
| Apify Client | 2.25.0 | Updated maintained v2 release |
| PostCSS | 8.5.30 | Applied throughout the tree through an explicit override, including Next's pinned older copy |
| basic-ftp | 6.2.3 | Explicit override of the vulnerable transitive proxy dependency |
| postcss-selector-parser | 7.1.6 | Explicit override for the reported selector parser issue |

The exact tree and integrity checksums are in `full-app/package-lock.json`. Overrides are intentional and should be removed when upstream version ranges select patched releases themselves. Compilation, types and local behavior must be checked when changing them. Production audit is a blocking CI step.

Node **22.12+** is required by the updated Puppeteer dependency. Browser download is skipped during installation: the local interface does not use it. The optional HTML-to-image integration needs its own browser installation and integration test before enabling that remote-service mode.

## Remaining build-only advisory

`tailwindcss → fast-glob/micromatch → braces`, also reached through `chokidar`, remains affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The advisory lists no patched braces version. The issue is stack exhaustion when processing deeply nested brace patterns.

In this repository Tailwind's glob patterns are the fixed source paths in `full-app/tailwind.config.ts`. Customer form fields, imported agency data, provider replies and HTTP requests do not enter this compiler configuration. It runs during development/build and is not included in the production-only package tree. This is a bounded development exposure, not evidence of an exploitable local customer flow; untrusted repository changes or generated glob patterns must still be reviewed before building.

Eliminating this chain requires migrating the styling build to Tailwind 4, or an upstream patch. Tailwind's [official upgrade guide](https://tailwindcss.com/docs/upgrade-guide) documents changes to utilities, defaults and browser support. That migration needs a dedicated visual regression review across the original UI; it has not been silently applied or declared complete. The full audit remains nonzero and is recorded here rather than suppressed by configuration.

Sources checked: npm registry metadata and audit responses on 15 October 2026; [Puppeteer release](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-v25.14.0), [Nodemailer release](https://github.com/nodemailer/nodemailer/releases/tag/v10.1.1), [Supabase SSR release](https://github.com/supabase/ssr/releases/tag/v0.6.1). These updates do not certify any real provider connection.
