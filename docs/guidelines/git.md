# Git

`main` is the integration branch. Feature work uses short-lived branches, **one concern per branch**.

## Naming

```
<type>/<chunk>-<slug>
```

| Part | Values | Example |
| --- | --- | --- |
| `type` | `feat`, `fix`, `refactor`, `chore` | `feat` |
| `chunk` | Roadmap ID when there is one (`C*`, `B*`, `A*`, `W*`) | `B2` |
| `slug` | Short kebab-case | `session-logging` |

Examples: `feat/B2-session-logging`, `fix/auth-refresh-failure`.

Do not use auto-generated `cursor/...` branch names for ongoing work.

## Workflow

1. `git switch main && git pull`
2. `git switch -c feat/B2-session-logging`
3. One chunk (or one isolated fix)
4. PR → merge into `main`
5. Delete the branch
6. Next task: start again from step 1

Before non-trivial code: propose a **branch name + short plan** and wait. If the current branch is stale or unrelated, suggest switching.

## Commits

- Conventional Commits: `feat(fe): …`, `feat(be): …`, `fix(fe): …`
- One concern per commit
- Update `WORKBOOK.md` when closing a roadmap chunk (C*, B*)
- Do not commit unless asked
- No Cursor attribution (`Co-authored-by: Cursor`, `Made-with: Cursor`, …)

One-time clone setup:

1. Cursor → Settings → Agents → Attribution: disable Commit and PR Attribution
2. CLI: `~/.cursor/cli-config.json` with `"commitAttribution": false` and `"prAttribution": false`
3. Hook:

```bash
chmod +x .githooks/prepare-commit-msg
ln -sf ../../.githooks/prepare-commit-msg .git/hooks/prepare-commit-msg
```
