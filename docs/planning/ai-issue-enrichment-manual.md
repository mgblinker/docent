---
title: Planning App — AI Suggestions for New Items (Manual)
type: manual
audience: public
---

# AI suggestions for new items

When you create a **Story**, **Task** or **Bug** in Planning, the app can draft the
description, the acceptance criteria and the Definition of Done (DoD) for you. You
always review the result before the item is created.

## How to use it

1. Open **New Issue** (board or backlog) and pick the **project** and **type**.
2. Type a **summary** (the title). Optionally write a few words of **description**.
3. Leave the summary field. Planning generates suggestions automatically, once.
   The button **Generate / refine with AI** shows "Generating…" while it works.
4. Review what appeared:
   - **Description** is filled in. If you had already written one, it is *refined*:
     wording and structure are cleaned up, your facts are kept.
   - **Definition of Done** and **Acceptance Criteria** appear as lists below the form.
     Remove entries with the **✕**, or add your own (Definition of Done).
5. Click **Create**. The item is saved together with the lists you kept.

To run it again (for example after changing the summary or type), click
**Generate / refine with AI**. New suggestions are added to the lists; entries that
are already there are not duplicated, and ones you removed may come back.

## What you get per type

| Type  | Description                                  | Acceptance criteria                | Definition of Done                         |
|-------|----------------------------------------------|------------------------------------|--------------------------------------------|
| Story | The user need and its value                  | Testable, observable behaviours    | Tests, review, documentation               |
| Task  | What to do and why                           | How to tell the work is complete   | Tests, review, documentation               |
| Bug   | Observed vs. expected behaviour, repro steps | How to verify the fix              | Regression test, verification              |
| Epic  | not available                                | not available                      | not available                              |

**Why not for epics?** An epic is an initiative; its acceptance criteria and
Definition of Done belong on the stories and tasks beneath it. The button is hidden
when the type is Epic.

## Good to know

- **Nothing is saved until you click Create.** Suggestions are a draft.
- **Your language is kept.** German input gives German suggestions, English gives English.
- **Check the content.** The text is machine-generated from your title and description
  only. It does not know your product or codebase and must not be trusted blindly —
  especially bug reproduction steps and acceptance criteria.
- **Your typing wins.** If you keep editing the description while suggestions are
  being generated, your text is not overwritten (lists are still added).
- **Definition of Done** is only filled in while the status is Backlog, Todo or
  In Progress, matching the normal Definition of Done rules.
- Suggestions only exist in the **New Issue** dialog. Existing items and items created
  by voice capture are not enriched.

## Troubleshooting

| Message / symptom                                        | What to do                                                                 |
|----------------------------------------------------------|----------------------------------------------------------------------------|
| "AI suggestions unavailable - you can still create the item." | The AI service did not answer. Create the item as usual, or retry the button later. |
| Button is disabled                                       | Enter a summary first.                                                     |
| No button                                                | The type is Epic, or you are editing an existing item.                     |
| Suggestions are off-topic                                | Make the summary more specific or add a sentence of description, then retry. |
