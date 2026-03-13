

## Project-specific gotchas

- Always use the `Read` tool before `Edit` — `Bash cat` does not satisfy the read requirement
- Express: register static routes (e.g. `/api/skus/reorder`) before dynamic ones (`/api/skus/:id`)
- JS validation: use `value === ''` not `!value` when 0 is a valid input
- DB migrations: wrap each `ALTER TABLE` in try/catch so server starts on both fresh and existing DBs
- Number inputs: use `min="0"` not `min="0.01"` when zero is a valid amount

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.

The key document is PLAN.md included in full below

@planning/PLAN.md