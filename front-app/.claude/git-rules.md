### Git rules
- **Never leave uncommitted changes** at the end of a task or conversation turn.
- If multiple files are changed as part of one logical task, **group them in a single commit**.
- If a task spans many steps, commit at each meaningful milestone (e.g., after scaffolding, after implementing a feature, after writing tests).
- Commit messages must be **clear and specific** — avoid generic messages like "update files" or "changes".
- Do **not** commit secrets, `.env` files, or credentials. Always check `.gitignore` first.