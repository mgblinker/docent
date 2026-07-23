---
type: howto
---

# Updating Translations (German)

How translation keys are structured, where the German translation files live, how to
add/change keys, and how to run the extraction tool instead of hand-scanning the
codebase.

## Where things live

- Source of truth for German text: `/Users/michael/Projects/Files/translations_de/*.json`
  — one file per app module, e.g. `social-care_de.json`, `settings_de.json`, `shared_de.json`.
- Extraction/validation tool: `Processity.WebApp.Angular/tools/i18n/extract_missing_translations.py`
  (see `tools/i18n/README.md` in that repo — stdlib-only, no install step).
- Registered modules: `src/shared/config/modules.ts` (`STARTUP_MODULES` + `LAZY_MODULES`).
  A translation file whose module isn't in this list will never load in the app (see
  [Unregistered modules](#unregistered-modules) below).

## File format — the one rule that matters

Each file is a single top-level object keyed by module name. Keys **inside** that
object must NOT repeat the module name:

```json
{
  "social-care": {
    "case-detail.back-to-list": "Zurück zur Liste",
    "referrer.status.active": "Aktiv"
  }
}
```

```html
<!-- code references the FULL key, module prefix included -->
<span [appTranslate]="'social-care.case-detail.back-to-list'"></span>
```

**Why this matters:** the app's `ApiTranslateLoader` merges all modules into one object
(`{ "social-care": {...}, "settings": {...}, ... }`) and ngx-translate's default parser
resolves a dotted key by greedily walking segments, falling back to flat-string matches
at the leaf. If the JSON key repeats the module name —
`"social-care": { "social-care.case-detail.back-to-list": "..." }` — the lookup fails
silently and the raw key is shown instead of the translation. This is the single most
common mistake when hand-editing these files; `validate` (below) catches it.

## Adding or changing a key

1. Find (or invent) the key. Convention: `<feature>.<sub-feature>.<field-or-action>`,
   e.g. `referrer.detail.deleteSuccess`. Check the target module's JSON file first —
   many generic labels already exist in `shared_de.json` (`shared.fields.name`,
   `system.buttons.cancel`, etc.) and should be reused rather than duplicated.
2. Wire it into the component:
   - Static text: `<span [appTranslate]="'module.key'">Fallback</span>`
   - Pipe form (interpolation / attribute bindings): `{{ 'module.key' | appTranslate }}`,
     `[matTooltip]="'module.key' | appTranslate"`
   - With interpolated values: `[appTranslate]="'module.key'" [appTranslateParams]="{ name: someVar }"`
     — the JSON value must contain the matching `{{name}}` placeholder, or the
     substitution silently does nothing and the raw `{{name}}` shows up.
   - TypeScript (snackbars, dialog titles, validation messages): inject
     `TranslateService` from `@ngx-translate/core` and call
     `this.translate.instant('module.key', { param: value })`.
3. Add the JSON entry under the correct module's file, key text WITHOUT the module
   prefix (see rule above).
4. Run `validate` (below) before committing.

### Params — check every call site before adding `{{placeholder}}`

A single key is often called from multiple places. If you add `{{type}}` to a value
but even one call site doesn't pass a `type` param, that site will show the literal
text `{{type}}` to users. Before adding a placeholder, grep every usage of the key and
confirm the param is passed everywhere:

```bash
grep -rn "'module.key'" src --include="*.ts" --include="*.html"
```

If usage is inconsistent (some sites pass the param, some don't), that's a source bug
in the component, not something fixable in the translation file — fix the call site
instead of guessing at the text.

### Dynamic keys (built via string concatenation)

Some code builds keys at runtime, e.g.:

```ts
this.translate.instant(`social-care.referrer.type.${type.toString().toLowerCase()}`);
```

These can't be found by grepping for a literal string. The extraction tool flags them
separately and tries to resolve the suffix values by matching the variable's TS type
against `export enum` definitions in the generated API clients
(`src/shared/services/api/clients/*.ts`) — but always double check the resolved enum
against the actual call site; the type-matching is a regex heuristic, not a real
compiler.

### Unregistered modules

A translation file can exist and be perfectly well-formed but never load, if its
module isn't listed in `src/shared/config/modules.ts`. As of this writing,
`personalization`, `filestorage`, `planning`, `setup`, `epic`, and `new-request` have
translation files but are **not** registered — this needs a code change (add to
`STARTUP_MODULES`/`LAZY_MODULES`, and for lazy modules a route-level
`translationPreloadResolver`, see how `sales` wires it) before those translations will
ever appear in the app. Adding keys to those files is still useful groundwork, just
know they're inert until the module is registered.

## Running the extraction tool

```bash
cd /Users/michael/Projects/Processity.WebApp.Angular

# report missing keys + dynamic-key sites (read-only)
python3 tools/i18n/extract_missing_translations.py extract

# same, but also stage missing keys as null-valued stubs
python3 tools/i18n/extract_missing_translations.py extract --write-pending
# -> /Users/michael/Projects/Files/translations_de/pending/<module>_pending.json

# after filling in the null values with real German text:
python3 tools/i18n/extract_missing_translations.py merge
# folds filled (non-null) entries into the real *_de.json files;
# keys still null stay staged in pending/

# structural sanity check — valid JSON + no module-prefix-duplication bug
python3 tools/i18n/extract_missing_translations.py validate
```

The tool scans every `.ts` and `.html` under `src/` (components, services, templates —
not just templates), so `.instant()`/`.get()` calls in services are covered, not only
template bindings.

Known false positive: `shared.button_save` always shows up — it's a `Usage:` example
in a JSDoc comment (`app-translate.directive.ts`), not a real call. Safe to ignore.

## Quick checklist before committing a translation change

- [ ] JSON key does not repeat its own module's top-level name
- [ ] Ran `validate` — no output beyond "all clean"
- [ ] If the key takes params, checked every call site uses the same param names
- [ ] New module (if any) registered in `modules.ts`, or explicitly left for later with
      a note
