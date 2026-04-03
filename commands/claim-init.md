# /claim-init

Run the CLAIM setup flow. Read `~/.claude/rules/claim.md` and follow the **First-Run Setup** section.

If `vaults` config is empty (`[]`), run the full interactive setup — ask about vaults, folders, routing, capture preferences, then create everything.

If vaults are already configured, show current config and ask what to change:
- Add a vault
- Modify a vault (path, folders, routes, purpose)
- Update capture settings (capture_mode, save_mode)
- Regenerate the sweep hook
- Update sweep intervals

Always idempotent — never overwrites existing vault content or registries.
