# Preview Deploy for Private Pages

Creates preview branches for pull requests, enabling PR-specific site previews. Automatically cleans up when the PR is closed.

## Usage

```yaml
- uses: ./src/actions/preview
  with:
    source-directory: dist
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `source-directory` | Yes | — | Directory containing built static files |
| `token` | No | `${{ github.token }}` | GitHub token with repo write access |

## Behavior

### On PR Open/Update
1. Creates or updates a `preview/pr-<N>` branch
2. Copies built files from the source directory
3. Commits and pushes changes

### On PR Close
1. Deletes the `preview/pr-<N>` branch from the remote
2. Handles missing branches gracefully (no error if already deleted)

## Example Workflow

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - if: github.event.action != 'closed'
        run: npm ci && npm run build
      - uses: ./src/actions/preview
        with:
          source-directory: dist
```

## Branch Naming

Preview branches follow the pattern `preview/pr-<number>`. For example, PR #42 would deploy to `preview/pr-42`. Private Pages can serve content from these branches by configuring a site with the preview branch.
