# Skill Template

> Use this template to create new Agent Skills for Claude Code.

## File Location

```
.claude/skills/{skill-name}/SKILL.md
```

**Rules:**
- Skill name must be lowercase with hyphens (e.g., `my-skill-name`)
- Maximum 64 characters for the name
- Must have a `SKILL.md` file in the skill folder

---

## Basic Template (Single File)

```yaml
---
name: your-skill-name
description: Brief description of what this skill does. Include WHEN Claude should use it.
---

# Your Skill Name

## Instructions

1. First step
2. Second step
3. Third step

## Examples

Input: What the user might ask
Output: What Claude should do/produce

## Best Practices

- List important guidelines
- Include dos and don'ts
```

---

## Multi-File Template

For complex skills, use multiple files:

```
your-skill/
  SKILL.md # Main entry point (required)
  reference.md # Detailed reference documentation
  examples.md # Extended examples
  patterns.md # Common patterns/templates
```

Claude only loads additional files when needed (progressive disclosure).

---

## Tool-Restricted Template

Limit what tools Claude can use with this skill:

```yaml
---
name: safe-reviewer
description: Review code without making changes. Use for code audits or read-only analysis.
allowed-tools: Read, Grep, Glob
---

# Safe Code Reviewer

This is a READ-ONLY skill. You can:
- Read files (Read tool)
- Search for patterns (Grep tool)
- Find files (Glob tool)

You CANNOT:
- Edit files
- Write new files
- Run commands
```

---

## Description Best Practices

The `description` field is **critical** for skill discovery.

**Bad (too vague):**
```yaml
description: Helps with code
```

**Good (specific):**
```yaml
description: Generate unit tests using pytest. Use when writing tests or when user mentions pytest, test coverage, or TDD.
```

---

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase, hyphens only, max 64 chars |
| `description` | Yes | What + When, max 1024 chars |
| `allowed-tools` | No | Comma-separated list of allowed tools |

More info: https://code.claude.com/docs/en/skills
