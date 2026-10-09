---
type: feature
---

# Planning — AI Issue Enrichment

User-facing guide: [AI suggestions for new items](ai-issue-enrichment-manual.md).

## Overview

When creating an issue, Planning asks the ProcessInsights service to draft a
description (generated or refined), acceptance criteria and Definition of Done (DoD).
The suggestions are **a preview only**: nothing is persisted by the enrichment call.
The frontend queues the accepted items and writes them through the existing
acceptance-criteria / DoD endpoints after the issue is created.

Eligible types: **Story, Task, Bug**. **Epic is excluded** — AC/DoD live on child items.

## Flow

```
IssueModal (new issue)
  └─ summary blur (once) / "Generate / refine with AI"
       POST /api/planning/v1.0/issues/enrich   {type, summary, description?}
         └─ EnrichIssueCommandHandler
              └─ POST {Services:ProcessInsights:BaseUrl}/api/process-insights/v1.0/generate/text {prompt}
              ← {description, acceptanceCriteria[], definitionOfDone[]}
  └─ user reviews/edits queued lists
  └─ Create → POST issues, then sequentially POST AC items, then DoD items
```

## Backend (Processity.Planning)

Folder `src/Planning.Core/Issues/Application/EnrichIssue/`:

| File                          | Purpose                                              |
|-------------------------------|------------------------------------------------------|
| `EnrichIssueRequest.cs`       | `Type` (required), `Summary`, `Description?`          |
| `EnrichedIssueDto.cs`         | `Description?`, `AcceptanceCriteria`, `DefinitionOfDone` |
| `EnrichIssueCommand.cs`       | CQRS command                                         |
| `EnrichIssueCommandHandler.cs`| Validation, prompt, ProcessInsights call, parsing    |
| `EnrichmentRules.cs`          | `SupportsType(type)` — false for `Epic`              |

Endpoint: `POST /api/planning/v1.0/issues/enrich` in `IssuesController` (authorized, no
extra license check beyond the controller's). Returns `Result<EnrichedIssueDto>`.

Validation (`Result.Fail` with message): epic type, empty summary, summary > 200
chars, description > 4000 chars.

### ProcessInsights integration

Reuses the `"ProcessInsights"` named `HttpClient` (60 s timeout) and the
`Services:ProcessInsights:BaseUrl` setting — the same pair as speech parsing
(`ParseIssueFromSpeechCommandHandler`). Calls `generate/text` with a single prompt string.

The prompt is type-specific (bug: observed/expected/repro, verification AC, regression
test DoD; story: need and value; task: what and why). It differs depending on whether a
description exists: *write one from the title* vs. *refine, keep every fact*. The model
must keep the input language and answer with a bare JSON object.

### Response handling

The handler extracts the outermost `{…}` from the text and parses
`description`, `acceptanceCriteria`, `definitionOfDone`. Defensive limits:

- Lists: max 8 items, each trimmed to 300 chars, case-insensitive de-duplication.
- Description capped at 4000 chars.
- If the JSON is unparseable or all three parts are empty → `"Could not generate content for this item."`
- Any HTTP / exception failure is logged and returned as `"AI enrichment unavailable."`

The summary/description are interpolated into the prompt, so a crafted title can steer
the model; the output is only ever parsed into plain strings and shown to the user for
review, never executed or stored without confirmation.

## Frontend (webapp/projects/planning)

- `IssuesApiService.enrich()` — plain `HttpClient` call (no NSwag client regeneration needed);
  `EnrichedIssueDto` interface in the same file.
- `IssueModalComponent` (`app/board/issue-modal/`):
  - `canEnrich`: new issue and type ≠ `epic`.
  - `onSummaryBlur()` triggers the first run only (`enrichAttempted`); the button reruns it.
  - Description is replaced only if it is unchanged since the request started.
  - Results merge case-insensitively into `pendingCriteria` / `pendingDod`
    (`pendingDod` only when `canEditDod`).
  - `finishSave()` posts criteria then DoD items with `concat` (sequential, keeps order).
    A failure while posting closes the dialog anyway, as it did for DoD before.
  - Failure sets `enrichFailed`; Create is never blocked.

## Configuration

No new settings. `Services:ProcessInsights:BaseUrl` must be set (already present in
`.docker/local/appsettings.json` and `.docker/prod/appsettings.json`). The ApiGateway
needs no route change for `issues/enrich`.

## Known limitations

- Not applied to voice capture (`capture-queue.service.ts`) or when editing existing items.
- Latency is that of one LLM call; the UI shows a progress label, no timeout beyond the 60 s client timeout.
- Quality depends on title/description only; there is no project or codebase context.
- No tests yet for the handler's prompt/parse logic.
