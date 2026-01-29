# Subagent Template

## Subagent creation instructions

Location: `.claude/agents/$AGENT-NAME.md`

```markdown
---
name: your-sub-agent-name
description: Description of when this subagent should be invoked
tools: tool1, tool2, tool3 # Optional - inherits all tools if omitted
model: sonnet # Optional - specify model alias or 'inherit'
color: Choose between red, blue, green, yellow, purple, orange, pink, cyan
---

Your subagent's system prompt goes here. This can be multiple paragraphs
and should clearly define the subagent's role, capabilities, and approach
to solving problems.

Include specific instructions, best practices, and any constraints
the subagent should follow.
```

## Key Fields

- **name**: Unique identifier for the subagent (lowercase with hyphens)
- **description**: When should this subagent be invoked? Be specific!
- **tools**: Optional tool restrictions (omit to inherit all tools)
- **model**: Optional model selection (sonnet, opus, haiku, or inherit)
- **color**: Visual distinction in output (red, blue, green, yellow, purple, orange, pink, cyan)

## Best Practices

1. **Clear role definition**: What is this subagent's expertise?
2. **Specific triggers**: When should it be invoked?
3. **Boundaries**: What should it NOT do?
4. **Tool restrictions**: Only include tools needed for the role
5. **Model selection**: Use haiku for simple tasks, sonnet for complex

## Examples

### Backend API Developer
```yaml
name: backend-api-dev
description: Develops Node.js/Express backend APIs, controllers, services, and routes
model: sonnet
color: blue
```

### Mobile UI Developer
```yaml
name: mobile-ui-dev
description: Creates React Native components and screens for mobile apps
tools: Read, Edit, Write, Glob, Grep
model: sonnet
color: purple
```

### Database Architect
```yaml
name: database-architect
description: Designs database schemas and writes SQL migrations
tools: Read, Edit, Write
model: sonnet
color: green
```

More info: https://code.claude.com/docs/en/sub-agents
