## — Agent Rules for GTC-app-service

## Repository
This project is tracked in the GitHub repository:
**https://github.com/Max20050/GTC**

---

## Mandatory Commit Rule

> **Every change you make to any file in this project MUST be committed and pushed to the repository.**

### Workflow to follow after every file change:

1. **Stage all changes:**
   ```bash
   git add -A
   ```

2. **Commit with a descriptive message:**
   ```bash
   git commit -m "<type>: <short description of what changed>"
   ```
   Use conventional commit prefixes:
   - `feat:` — new feature or file added
   - `fix:` — bug fix
   - `refactor:` — code restructure without behavior change
   - `docs:` — documentation change
   - `chore:` — config, tooling, or dependency changes
   - `style:` — formatting, linting

3. **Push to origin:**
   ```bash
   git pull --rebase origin master
   git push origin master
   ```

### Rules:
- **Never leave uncommitted changes** at the end of a task or conversation turn.
- If multiple files are changed as part of one logical task, **group them in a single commit**.
- If a task spans many steps, commit at each meaningful milestone (e.g., after scaffolding, after implementing a feature, after writing tests).
- Commit messages must be **clear and specific** — avoid generic messages like "update files" or "changes".
- Do **not** commit secrets, `.env` files, or credentials. Always check `.gitignore` first.

---
