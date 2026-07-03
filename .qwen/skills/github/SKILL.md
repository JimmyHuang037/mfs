---
name: github
description: GitHub workflow operations — commit, push, sync, merge, PR, status check, and conflict resolution for the mfs project
priority: 10
---

# GitHub Workflow Skill

Handles common GitHub operations for the mfs monorepo.

## Repository Info

- **Remote**: `git@github.com:JimmyHuang037/mfs.git`
- **Default branch**: `main`
- **GitHub**: https://github.com/JimmyHuang037/mfs

## Credentials

GitHub credentials are stored in `/home/jimmy/repo/mfs/.env` (gitignored):
- `GITHUB_USER` — username
- `GITHUB_PASS` — password
- `GITHUB_TOKEN` — Personal Access Token (for API calls)

## Common Operations

### 1. Status Check
```bash
git status
git log --oneline -5
```

### 2. Commit & Push
```bash
git add -A
git commit -m "<message>"
git push origin main
```

### 3. Sync (pull latest)
```bash
git pull origin main --rebase
```

### 4. Create PR
```bash
# Push branch first, then create PR via API
curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"<title>","head":"<branch>","base":"main"}' \
  https://api.github.com/repos/JimmyHuang037/mfs/pulls
```

### 5. Merge PR
```bash
curl -s -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merge_method":"squash"}' \
  https://api.github.com/repos/JimmyHuang037/mfs/pulls/<number>/merge
```

### 6. Resolve Conflicts
```bash
# After pull with conflicts, manually fix files, then:
git add <resolved-files>
git commit -m "merge: resolve conflicts"
git push origin main
```

## Branch Convention

- `main` — stable, production-ready
- `feat/<name>` — new features
- `fix/<name>` — bug fixes

## Notes

- Always pull before starting new work
- Use squash merge for feature branches
- Never commit `.env` or `node_modules/`