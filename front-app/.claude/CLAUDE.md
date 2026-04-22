## CLAUDE.md File for the front-app folder of the GTC project

1. This folder is 1 of the 4 services that this project has.
2. So knowing this you should commit to the main repository which is the parent folder of the root folder in this service.

### Github commit guidelines:
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

## What this service does:
This service is the frontend for the Graph-to-Code project. It is built with React and TypeScript.

The Pages structure is the following:

1. Auth pages — outside any layout:

    /login

    /register
    
    /oauth

    /callback

Personal workspace — simple top nav, no sidebar
/home                        → all your personal boards + orgs you belong to.

/boards/:boardId             → the canvas itself (fullscreen, minimal chrome)

Organization workspace — sidebar with org context
/org/:orgSlug                          → org overview, recent boards, members summary.
/org/:orgSlug/teams                    → all teams in the org
/org/:orgSlug/teams/:teamSlug          → team page with its boards and members
/org/:orgSlug/teams/:teamSlug/boards/:boardId  → canvas (same component as personal)
/org/:orgSlug/members                  → org member management
/org/:orgSlug/settings                 → org settings, plan, billing

The canvas /boards/:boardId or the org version — fullscreen, same component either way. The URL tells it the context, the UI adapts. No sidebar, just a floating toolbar.

Why this structure:

/home is the single landing spot after login — no confusion about where to go
The canvas is always fullscreen regardless of ownership — personal or team board, same experience
Org slug in the URL makes sharing links intuitive (/org/acme/teams/backend)
Settings are scoped to the org, not buried in a global settings page

