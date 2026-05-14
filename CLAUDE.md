# Workflow

When pushing changes, always:
1. Commit to a feature branch
2. Open a PR and enable auto-merge with squash:
   ```
   gh pr create --fill && gh pr merge --auto --squash
   ```
