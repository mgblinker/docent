# Processity.CICD — Backlog

## SonarQube Autofix Agent

- **Model selection based on issue complexity**: instead of a single fixed model, route to a cheaper/faster model for low-severity CODE_SMELLs (MINOR/INFO) and a larger model for MAJOR/CRITICAL issues. The LLM provider abstraction already exists in `sonar_autofix.py` — add a `select_model(issue)` helper and pass in configurable small/large model names via env vars.
