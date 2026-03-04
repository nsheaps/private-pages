# Deploy to Private Pages

Deploys static files to a branch for serving via Private Pages.

## Usage

```yaml
- uses: ./src/actions/deploy
  with:
    source-directory: dist
    target-branch: gh-pages
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `source-directory` | Yes | — | Directory containing built static files |
| `target-branch` | No | `gh-pages` | Branch to deploy to |
| `target-repo` | No | Current repo | Target repository (`owner/repo`) |
| `token` | No | `${{ github.token }}` | GitHub token with repo write access |

## Behavior

1. Validates that the source directory exists
2. Clones the target branch (or creates an orphan branch if it doesn't exist)
3. Removes all existing files from the branch
4. Copies new files from the source directory
5. Commits and pushes (skips if no changes detected)
6. Cleans up the temporary work directory

## Example Workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - uses: ./src/actions/deploy
        with:
          source-directory: dist
          target-branch: gh-pages
```
