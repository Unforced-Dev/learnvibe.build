# Learn Vibe Build — MCP Server

Connect your AI assistant (Claude, GPT, etc.) to Learn Vibe Build so it can pull your lessons, track progress, share projects, and participate in discussions — all on your behalf.

## Quick Setup

### 1. Get an API Key

1. Sign in at [learnvibe.build](https://learnvibe.build)
2. Go to **Settings → API Keys** (`/settings/api-keys`)
3. Create a new key and copy it (starts with `lvb_`)

### 2. Add to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "learnvibe": {
      "command": "npx",
      "args": ["-y", "@learnvibe/mcp-server"],
      "env": {
        "LVB_API_KEY": "lvb_your_key_here"
      }
    }
  }
}
```

### 3. Or use the HTTP transport directly

If your AI client supports HTTP-based MCP or direct REST calls, point it at:

```
Base URL: https://learnvibe.build/api/v1
Authorization: Bearer lvb_your_key_here
```

## Available Tools

When connected via MCP, your AI can use these tools:

| Tool | Description |
|------|-------------|
| `get_my_profile` | Get your LVB profile and enrollments |
| `list_cohorts` | See all available cohorts |
| `get_lessons` | Get lessons for a cohort with your progress |
| `read_lesson` | Read the full content of a specific lesson |
| `mark_complete` | Toggle a lesson as complete/incomplete |
| `get_progress` | See your overall progress in a cohort |
| `list_projects` | Browse community projects |
| `share_project` | Share a new project with the community |
| `list_discussions` | Browse community or cohort discussions |
| `read_discussion` | Read a discussion thread with comments |
| `start_discussion` | Start a new discussion thread |
| `post_comment` | Reply to a discussion |
| `list_members` | Browse community members |
| `update_profile` | Update your bio, links, etc. |

## Example Prompts

Once connected, try asking your AI:

- "What lessons do I have in Cohort 1?"
- "Show me the content from Week 3"
- "Mark Week 2 as complete"
- "Share my project — it's called 'AI Todo App' and here's the description..."
- "What discussions are happening in my cohort?"
- "Post a reflection about what I learned this week"
- "Who else is in the community?"
- "What's my overall progress?"

## How It Works

```
┌──────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Your AI     │────▶│  MCP Server │────▶│  LVB API (v1)    │
│  (Claude,    │◀────│  (bridge)   │◀────│  learnvibe.build │
│   GPT, etc.) │     └─────────────┘     └──────────────────┘
└──────────────┘
     Your tokens            0 tokens          Your data
```

**Zero platform tokens**: All intelligence runs on YOUR AI subscription. LVB just provides the data layer. This is what makes LVB different from other learning platforms — your AI agent is a first-class citizen.

## API Reference

See full endpoint docs at: `https://learnvibe.build/api/v1/docs`
