#!/usr/bin/env node
/**
 * Learn Vibe Build — MCP Server
 *
 * Bridges your AI assistant to the LVB API.
 * Install: npx @learnvibe/mcp-server
 * Env: LVB_API_KEY=lvb_your_key
 *      LVB_BASE_URL=https://learnvibe.build (optional)
 */

const API_KEY = process.env.LVB_API_KEY
const BASE_URL = process.env.LVB_BASE_URL || 'https://learnvibe.build'

if (!API_KEY) {
  console.error('Error: LVB_API_KEY environment variable is required')
  process.exit(1)
}

// Helper: call the LVB API
async function api(method: string, path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}

// MCP Tool definitions
const TOOLS = [
  {
    name: 'get_my_profile',
    description: 'Get your Learn Vibe Build profile, enrollments, and role',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_cohorts',
    description: 'List all available cohorts in Learn Vibe Build',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_lessons',
    description: 'Get all lessons for a cohort with your completion progress',
    inputSchema: {
      type: 'object',
      properties: {
        cohortSlug: { type: 'string', description: 'Cohort slug, e.g. "cohort-1"' },
      },
      required: ['cohortSlug'],
    },
  },
  {
    name: 'read_lesson',
    description: 'Read the full markdown content of a specific lesson',
    inputSchema: {
      type: 'object',
      properties: {
        cohortSlug: { type: 'string', description: 'Cohort slug' },
        weekNumber: { type: 'number', description: 'Week number of the lesson' },
      },
      required: ['cohortSlug', 'weekNumber'],
    },
  },
  {
    name: 'mark_complete',
    description: 'Toggle a lesson as complete or incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        lessonId: { type: 'number', description: 'Lesson ID to toggle' },
      },
      required: ['lessonId'],
    },
  },
  {
    name: 'get_progress',
    description: 'Get your lesson-by-lesson progress for a cohort',
    inputSchema: {
      type: 'object',
      properties: {
        cohortSlug: { type: 'string', description: 'Cohort slug' },
      },
      required: ['cohortSlug'],
    },
  },
  {
    name: 'list_projects',
    description: 'Browse projects shared by community members',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max projects to return (default 20)' },
      },
      required: [],
    },
  },
  {
    name: 'share_project',
    description: 'Share a new project with the community',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Project title' },
        description: { type: 'string', description: 'Project description (Markdown)' },
        url: { type: 'string', description: 'Live project URL (optional)' },
        githubUrl: { type: 'string', description: 'GitHub repo URL (optional)' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'list_discussions',
    description: 'List discussion threads. Use cohort parameter for cohort-specific, omit for community-wide',
    inputSchema: {
      type: 'object',
      properties: {
        cohort: { type: 'string', description: 'Cohort slug to filter by (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'read_discussion',
    description: 'Read a discussion thread with all its comments',
    inputSchema: {
      type: 'object',
      properties: {
        discussionId: { type: 'number', description: 'Discussion ID' },
      },
      required: ['discussionId'],
    },
  },
  {
    name: 'start_discussion',
    description: 'Start a new discussion thread',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Discussion title' },
        body: { type: 'string', description: 'Discussion body (Markdown)' },
        cohortId: { type: 'number', description: 'Cohort ID for cohort-specific discussion (optional, omit for community-wide)' },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'post_comment',
    description: 'Reply to a discussion thread',
    inputSchema: {
      type: 'object',
      properties: {
        discussionId: { type: 'number', description: 'Discussion ID to reply to' },
        body: { type: 'string', description: 'Comment body (Markdown)' },
        parentId: { type: 'number', description: 'Parent comment ID for threaded reply (optional)' },
      },
      required: ['discussionId', 'body'],
    },
  },
  {
    name: 'list_members',
    description: 'List community members',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_profile',
    description: 'Update your profile information',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your display name' },
        bio: { type: 'string', description: 'Short bio' },
        location: { type: 'string', description: 'Location' },
        website: { type: 'string', description: 'Website URL' },
        github: { type: 'string', description: 'GitHub username' },
      },
      required: [],
    },
  },
]

// Tool handler
async function handleTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_my_profile':
      return api('GET', '/api/v1/me')

    case 'list_cohorts':
      return api('GET', '/api/v1/cohorts')

    case 'get_lessons':
      return api('GET', `/api/v1/cohorts/${args.cohortSlug}/lessons`)

    case 'read_lesson':
      return api('GET', `/api/v1/cohorts/${args.cohortSlug}/lessons/${args.weekNumber}`)

    case 'mark_complete':
      return api('POST', `/api/v1/progress/${args.lessonId}`)

    case 'get_progress':
      return api('GET', `/api/v1/cohorts/${args.cohortSlug}/progress`)

    case 'list_projects':
      return api('GET', `/api/v1/projects?limit=${args.limit || 20}`)

    case 'share_project':
      return api('POST', '/api/v1/projects', args)

    case 'list_discussions': {
      const qs = args.cohort ? `?cohort=${args.cohort}` : ''
      return api('GET', `/api/v1/discussions${qs}`)
    }

    case 'read_discussion':
      return api('GET', `/api/v1/discussions/${args.discussionId}`)

    case 'start_discussion':
      return api('POST', '/api/v1/discussions', args)

    case 'post_comment':
      return api('POST', `/api/v1/discussions/${args.discussionId}/comments`, {
        body: args.body,
        parentId: args.parentId,
      })

    case 'list_members':
      return api('GET', '/api/v1/members')

    case 'update_profile':
      return api('PUT', '/api/v1/me', args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ===== MCP Protocol (stdio JSON-RPC) =====

import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin })

function send(message: any) {
  process.stdout.write(JSON.stringify(message) + '\n')
}

rl.on('line', async (line) => {
  try {
    const msg = JSON.parse(line)

    if (msg.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'learnvibe-build',
            version: '1.0.0',
          },
        },
      })
    } else if (msg.method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOLS },
      })
    } else if (msg.method === 'tools/call') {
      try {
        const result = await handleTool(msg.params.name, msg.params.arguments || {})
        send({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        })
      } catch (err: any) {
        send({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        })
      }
    } else if (msg.method === 'notifications/initialized') {
      // Acknowledgement — no response needed
    } else {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      })
    }
  } catch (err) {
    // Ignore parse errors for non-JSON lines
  }
})
