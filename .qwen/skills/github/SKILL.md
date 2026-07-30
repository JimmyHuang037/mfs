# GitHub Skill

Check and manage the MFS repository on GitHub using the GitHub REST API.

## Prerequisites

- Token stored in `/home/jimmy/repo/mfs/.env` as `GITHUB_TOKEN`
- Repo: `JimmyHuang037/mfs`
- No `gh` CLI installed — use `curl` + GitHub API

## Commands

### Check Pull Requests
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/JimmyHuang037/mfs/pulls
```

### Check Issues
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/JimmyHuang037/mfs/issues?state=open
```

### Check Repo Info
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/JimmyHuang037/mfs
```

### Check Branches
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/JimmyHuang037/mfs/branches
```

### Check Recent Commits
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/JimmyHuang037/mfs/commits?per_page=5
```

### Create a Pull Request
```bash
source /home/jimmy/repo/mfs/.env && \
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/JimmyHuang037/mfs/pulls \
  -d '{"title":"PR_TITLE","head":"BRANCH_NAME","base":"main","body":"PR_DESCRIPTION"}'
```

## Usage

Invoke with `/github` followed by what to check:
- `/github check prs` — list open pull requests
- `/github check issues` — list open issues
- `/github check branches` — list branches
- `/github check commits` — show recent commits
- `/github check repo` — show repo info
