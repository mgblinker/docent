# Welcome (redirect)

This repository uses `WELCOME.md` as the canonical landing page. This `index.md` file exists so MkDocs has a known site root and to provide a quick redirect to the main welcome page.

<!-- HTML meta redirect — browsers will navigate immediately to the generated WELCOME.html -->
<meta http-equiv="refresh" content="0; url=WELCOME.html" />

If your environment blocks meta refresh, click here to open the main page: [Open Welcome page](WELCOME.md)

---

Alternative options:

- Duplicate `WELCOME.md` into `index.md` (simple, no redirect), or
- Use `mkdocs-redirects` plugin to declare redirects in `mkdocs.yml`.
