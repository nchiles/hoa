# UI Backlog

Running list of UI/UX issues found during testing. The point of this file is
to capture polish items **without interrupting feature work**. We clear them
in dedicated UI passes between build milestones, not mid-feature.

**How to use:** add an item under "Open" with a date, the page/flow, what's
wrong, and (if known) the fix. When an item is addressed, move it to "Done"
with the PR number. Trivial one-liners may be fixed opportunistically when
someone is already in the relevant file.

Severity: `blocker` (can't complete the task) · `rough` (works but confusing)
· `polish` (cosmetic).

## Open

- 2026-05-16 · `rough` · Layout — content body widths are inconsistent
  across pages. `/admin/invite` and `/lots/import` use different max-widths.
  Audit all authenticated pages and standardize on one container width
  (shared layout wrapper) unless a page intentionally differs.
- 2026-05-16 · `polish` · Privacy notice — the link/text should live in a
  footer anchored to the bottom of the viewport (sticky/normal-flow footer),
  consistently across pages, rather than inline near page content.

## Done

- 2026-05-16 · `rough` · `/lots/import` — "Expected header row" `<pre>` block
  was too cryptic for non-technical board members. Replaced with a
  downloadable CSV template + a plain-language column table. (PR #7)
