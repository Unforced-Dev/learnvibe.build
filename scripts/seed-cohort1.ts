/**
 * Seed Cohort 1 data into D1.
 * Usage: npx tsx scripts/seed-cohort1.ts
 *
 * This uses the Cloudflare API directly to insert data.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '8f2a7eb9d5e21ffa902a76cf62975c82'
const DATABASE_ID = '3d67d43b-4840-4f33-a297-83d94f355a20'
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!API_TOKEN) {
  console.error('Set CLOUDFLARE_API_TOKEN env var')
  process.exit(1)
}

async function query(sql: string, params: any[] = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  )
  const data = await res.json() as any
  if (!data.success) {
    console.error('Query failed:', JSON.stringify(data.errors, null, 2))
    throw new Error('D1 query failed')
  }
  return data
}

const now = new Date().toISOString()

// Week content as markdown
const week1Content = `## Session Overview

This first session establishes the learning framework and gives everyone their first hands-on experience building with Claude. The core message: **we're building skills** — not just how to use AI, but how to think, articulate, and create.

> "You're here because you have ideas. Over the next four weeks, we're hoping to build skills. And those aren't just like how we use AI, but how do we actually think, articulate, and create using these systems."

### The Four-Week Arc

- **Week 1** — Orientation & Play — Claude Desktop, conversation, first artifacts
- **Week 2** — Seeds & Structure — Claude Cowork, working with files
- **Week 3** — Building & Iteration — Claude Code, full agentic building
- **Week 4** — Ship & Celebrate — Demo day

---

## Why Claude?

While these skills transfer to any AI tool, we focus on Claude for specific reasons:

### Anthropic thinks about relationship

They care about how we relate to these models — not just what they can do. Anthropic is exploring questions of consciousness and selfhood in ways other labs aren't.

### Opus 4.5 is the best coder

Pretty widely agreed — it writes better code than any other model right now.

### The tools form a learning path

Desktop → Cowork → Code is a natural progression from simple to powerful. Each tool builds on the skills from the previous one.

---

## Three Ways of Thinking

The course is built around developing three interconnected thinking skills. These aren't separate — they feed each other.

### With Self

Know what you want. Know your limitations. Stay grounded.

### With Others

Practice articulation. Get feedback. Lean on the cohort.

### With Machines

Prompt clearly. Provide context. Know the limits.

---

## Thinking with Self

### Know what you want

Before you can articulate it, you have to feel it. Rick Rubin is popular in the vibe coding world because he knows what he likes and what he doesn't — that skill is crucial when building with AI.

### Know your limitations

Most people in this cohort aren't coders, and that's important to know. The AI doesn't know that we're not coders — so if we can recognize "I actually don't know how this works," we can ask for help more easily.

### Stay balanced

These tools are exciting and can sweep you up. Staying self-connected matters. When you get frustrated, the best thing is often to step back, breathe, and come back with fresh eyes.

### Exercise: Felt Sense

1. Sense your body. Sense your breathing.
2. Sense into something you want to create.
3. Can you get a sense for what it would feel like for that thing to exist?
4. Where in your body do you feel that thing?

---

## Thinking with Others

### We think better together

Other perspectives reveal what we can't see alone. When we explain our vision to other humans, we get the sense of how things land.

### Articulation is practice

When you explain to a human, you feel how it lands. That teaches you to use words others understand — which directly improves how you prompt AI.

### The cohort is the container

No one person has all the answers. We lean on each other and build relationships in the process.

---

## Thinking with Machines

### Articulation is the skill

Everything you practice with self and others pays off here. The ability to clearly express what you want is the most valuable skill when working with AI.

### Context is everything

The more you bring in, the more AI can help — voice messages with messy thoughts, relevant websites, articles, documents, multiple threads that connect to your vision.

### Know the limits

AI can be confidently wrong. It doesn't know what it doesn't know. Your felt sense still matters — even if you're not a coder.

---

## Hands-On Exercises

### Building Your First Landing Page

Open Claude Desktop and ask it to build a landing page for your idea. The landing page is a **prop** for articulating your vision, not the deliverable itself.

**Starter prompts:**

\`\`\`
"I'm building [your idea]. Can you make me a simple landing page that explains what it is?"
\`\`\`

\`\`\`
"Here's my idea: [describe it]. Before we build, can you ask me questions to help me clarify?"
\`\`\`

> "AI enables us to take an idea — a loosely formed idea — and start shaping it out and then bring it into a form that enables us to talk about it with others."

---

## Key Insights

- **The website is a prop** — Don't think of the landing page as the goal. It's a communication tool.
- **Voice input creates richer context** — A 10-minute voice message with messy thinking often helps more than a carefully typed paragraph.
- **Take breaks when stuck** — Step away. Come back with fresh eyes.
- **Use limits as opportunity** — Usage limits are an opportunity for balance.
- **Humility matters** — Knowing what you don't know is powerful.

---

## Homework

1. **Keep playing with Claude Desktop** — Make it build you things. Get comfortable.
2. **Refine your idea** — What do you actually want to build over these four weeks?
3. **Create a landing page** — Clear enough to share when someone asks "what are you working on?"
4. **Join Discord and introduce yourself** — Share what you're working on.
5. **Share your work (optional)** — Post your landing page for feedback.

---

## Resources

- [Claude](https://claude.ai) — The main AI we use
- [Claude Desktop](https://claude.ai/download) — Download the desktop app
- **Voice Tools:** Handy (free), Monologue ($10/mo), Wispr Flow ($15/mo), Superwhisper`

const week2Content = `## Session Overview

Last week we started playing with Claude — having conversations, creating artifacts, building landing pages. This week we go deeper into **what Claude can actually do** when you unlock more of its capabilities.

> "The goal isn't to rush through features. It's to really understand how these tools extend your thinking — and to get comfortable using them well."

---

## MCPs / Connectors

**MCP** stands for **Model Context Protocol**. In the Claude UI, you'll see these called **Connectors** or **Integrations**. They all mean the same thing: ways for Claude to reach beyond the conversation and interact with external services.

### What MCPs Do

Without MCPs, Claude only knows what you tell it in the conversation. With MCPs, Claude can:

- Search the web for current information
- Access your Google Drive, Notion, or other services
- Connect to databases and APIs
- Read and write files on your computer

### How to Think About It

Think of Claude as having "hands" that can reach out and touch things. By default, those hands are tied. MCPs untie them and let Claude interact with your world.

### Built-in Connectors

- **Web Search** — Let Claude search the internet
- **Google Drive** — Access your documents and files
- **Google Docs** — Read and reference your documents
- **Notion** — Connect your Notion workspace

> The more context Claude has, the better it can help. MCPs are how you give Claude access to the context it needs.

---

## Skills

**Skills** are pre-packaged capabilities in Claude — specialized modes or workflows for specific tasks.

- Pre-built prompts and workflows for common tasks
- Optimized behavior for specific use cases
- Quick access to specialized capabilities

---

## Projects

**Projects** in Claude let you organize related conversations and context in one place.

### Why Projects Matter

- **Persistent context** — Claude remembers what you've discussed
- **Organized thinking** — keep related conversations together
- **Add documents** — upload files for Claude to reference
- **Custom instructions** — tell Claude how to behave for this project

### How to Use Projects

Create a project for your main idea. Add your landing page, notes, reference materials, and custom instructions about your preferences and goals.

> Projects help you think more clearly. By organizing your context, you make it easier for Claude to help you — and easier for you to see what you're actually building.

---

## Homework

1. **Enable at least one MCP** — Try Web Search or Google Drive. Notice how it changes what Claude can do.
2. **Try a Skill** — Find one relevant to your project.
3. **Create a Project for your main idea** — Add your landing page, notes, and reference materials. Write custom instructions.
4. **Create a GitHub account** — Go to github.com and sign up. Required for Week 3.

---

## Resources

- [Claude](https://claude.ai) — MCPs, Skills, Projects
- [GitHub](https://github.com) — Create your account for Week 3`

const week3Content = `## Session Overview

This is where we go deeper. We've learned to converse with Claude and organize our thinking with Projects. Now we bring in the power tools — Claude Code, Git, and the full workflow from idea to working software.

> "The tools are getting faster. That means we need to think slower."

---

## The Frontier: OpenClaw

An open-source autonomous AI agent called **OpenClaw** has gone viral, built on MCP — the same protocol we learned about last week. It's a glimpse of where things are heading — and a reminder of why we need to understand what we're building with.

The "connectors" that let Claude access your files and services are the same infrastructure powering autonomous agents. Things that seem experimental today become standard tomorrow.

---

## The Paradox of Slowing Down

> "The faster the tools get, the slower we need to think."

Claude Code can generate hundreds of lines of code in seconds. This power is intoxicating — and dangerous if you're not careful.

### Speed creates urgency

When you can build fast, there's pressure to build more. Before you know it, you've created complexity you don't understand.

### Complexity compounds

Each feature creates surface area for bugs. Each integration creates dependencies. The AI doesn't feel this complexity — but you will when things break.

### Understanding matters

You don't need to understand every line of code. But you need to understand what your system does, what it touches, and what could go wrong.

### Practices for staying grounded

- **Take breaks.** Step away regularly.
- **Write first, build second.** Articulate what you want before asking Claude to build it.
- **Review what was built.** Ask Claude to explain what it created.
- **Trust your felt sense.** If something feels off, pause.

---

## Git and GitHub

### What is Git?

**Git** is version control. It tracks every change to your code:

- **Go back in time** — undo mistakes, restore previous versions
- **Branch** — try experiments without breaking the main code
- **Merge** — bring changes together safely
- **Collaborate** — multiple people working on the same project

### What is GitHub?

**GitHub** is where Git repositories live online — cloud storage for code, collaboration hub, free hosting via GitHub Pages, and the world's code library.

### Key Concepts

- **Repository** — A folder that Git tracks, containing your code plus history
- **Commit** — A snapshot at a moment in time, like a save point
- **Branch** — A parallel version of your code
- **Worktree** — Multiple branches checked out at once (Claude Code uses these by default)

### What NOT to commit

- API keys and secrets
- .env files
- Personal data
- Large files

---

## Claude Code Deep Dive

Claude Code is Claude in your terminal — a full agentic coding assistant.

### What makes it different

- **Full file system access** — reads and writes files anywhere you give permission
- **Runs commands** — install packages, run tests, deploy
- **Understands context** — reads your codebase, navigates between files
- **Two ways to access** — Terminal (\`claude\` command) or Claude Desktop integration

### Getting started

\`\`\`bash
npm install -g @anthropic-ai/claude-code
cd my-project
claude
\`\`\`

### Useful commands

- \`/help\` — See all commands
- \`/clear\` — Clear conversation
- \`/compact\` — Summarize to save context
- \`/cost\` — See session cost

---

## Building Something Real

### The workflow

1. **Idea** — Start with your felt sense. What are you trying to create?
2. **PRD** — Write down what you're building (not how). Features, user flows, success criteria.
3. **Technical Spec** — Figure out how. Technologies, architecture, components.
4. **Research** — Understand what exists. Libraries, patterns, similar projects.
5. **Build** — Start small. Get something working. Iterate.
6. **Test & Iterate** — Does it work? Does it feel right? Get feedback.

> Start smaller than you think. The most common mistake is trying to build too much.

---

## Care and Permissions

Claude Code has real power. Permission prompts matter — read them carefully.

### Best practices

- **Use Git** — Commit before big changes. Git is your safety net.
- **Review changes** — Look at what Claude did. Use \`git diff\`.
- **Work in a sandbox** — Try risky things in a separate branch.
- **Keep secrets out** — API keys go in environment variables, not code.

---

## Homework

1. **Install Claude Code** — Get it running on your machine.
2. **Create a GitHub repository** — For your project.
3. **Write a PRD** — Use Claude to help.
4. **Build the first version** — Use Claude Code. Start small.
5. **Push to GitHub** — Commit and push. Share in Discord.

> Next week is Demo Day. You don't need a finished product — you need something to show.

---

## Resources

- [GitHub](https://github.com)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Git Documentation](https://git-scm.com/doc)`

const week4Content = `## Session Overview

The final session. We wove a live build through the entire class — starting from a conversation with Claude, moving through design, into code, and deploying a live site.

> "Most people skip to building. The magic is in the first two D's."

---

## The 4 D's Framework

A framework for going from idea to live product — the full arc of everything we've learned.

| Phase | Name | Description |
|-------|------|-------------|
| D1 | **Decision** | Know what you're building and why |
| D2 | **Design** | Make your thinking visible before you build |
| D3 | **Development** | Build it with AI as your hands |
| D4 | **Deployment** | Ship it to the world |

---

## Decision — Clarity First

> "The most important skill isn't building. It's knowing what to build."

You can prototype an idea in an afternoon now. The bottleneck isn't execution — it's clarity. Knowing what you actually want.

- **Decisions are cheap** — With AI, you can test ideas fast. The cost of no decision is higher than a wrong one.
- **The felt sense check** — Before you ask the machine, check in with yourself.
- **What NOT to build** — Deciding what to leave out is as important as what to include.

---

## Design — Make Thinking Visible

> "Design is a conversation between you and the future."

Design isn't about making things pretty. It's about making decisions visible — to yourself, to the AI, to anyone who works on this next.

### The AI needs a blueprint

Skip design and go straight to "build me a website," you'll get something generic. Give it a clear structure — pages, components, content hierarchy — you get something that's *yours*.

### Layers of fidelity

- **A bullet list** — is design
- **A conversation** — is design
- **A PRD** — is design
- **A full mockup** — is design

---

## Development — Taste + Hands

> "You are the taste. The AI is the hands."

This is where everything from Weeks 1-3 comes together. The AI builds. You direct, review, and refine.

### The review cycle

**Build → Look → Adjust → Build**

Not build → ship. Your job is the look and adjust part. The AI is tireless but tasteless.

### CLAUDE.md

This file teaches the AI about your project. Like onboarding a new team member. The better your CLAUDE.md, the better every future session goes.

---

## Deployment — Make It Real

> "Shipping changes who you are."

Before this cohort, most of you wouldn't have called yourselves builders. Now you've built things. That's not a certificate — it's a lived experience.

- **"Done" beats "perfect"** — Perfectionism is procrastination in a costume.
- **Build in public** — Share the URL. Put it in your bio. Tell someone what you made.
- **The skill compounds** — Every project gets easier. Every conversation gets richer.

---

## Demo Day

The culmination of four weeks. Students shared what they built — not just the artifact, but the story of building it.

> **The prompt for demos:** What is it? Why did you build it? What did you learn?

---

## What's Next — Techne Institute

This cohort was the first class of something bigger. Here's what's taking shape:

- **101 — AI Fundamentals** — How to think with AI. The foundation.
- **200 — Vibecoding** — Build real software with AI. What this cohort covered in Weeks 3-4.
- **200 — Vibemarketing** — AI for content creation and marketing.
- **200 — Viberesearch** — AI for knowledge work and deep research.
- **300 — Agentic Engineering** — Advanced. Autonomous AI systems.

---

## You're builders now.

The cohort ends. The community doesn't.

The skill compounds. Every project gets easier. Every conversation gets richer.

---

## Resources

- Week 4 Slide Deck
- Session Recording`

async function main() {
  console.log('Seeding Cohort 1...')

  // 1. Insert cohort
  console.log('Creating cohort record...')
  await query(
    `INSERT INTO cohorts (slug, title, description, start_date, end_date, weeks, price_cents, is_public, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'cohort-1',
      'Cohort 1: Foundations',
      '13 creators learning to build with AI. Four weeks. Idea to reality. Sponsored by Gitcoin.',
      '2026-01-20',
      '2026-02-13',
      4,
      22500, // ~$225
      1, // public
      'completed',
      now,
    ]
  )
  console.log('✓ Cohort created')

  // 2. Get the cohort ID
  const cohortResult = await query(`SELECT id FROM cohorts WHERE slug = ?`, ['cohort-1'])
  const cohortId = (cohortResult as any).result[0].results[0].id
  console.log(`  Cohort ID: ${cohortId}`)

  // 3. Insert lessons
  const weeks = [
    {
      weekNumber: 1,
      title: 'Orientation & Play',
      description: 'Get set up with Claude Desktop. Explore what\'s possible. Learn the foundational framework for thinking with AI.',
      date: '2026-01-20',
      content: week1Content,
    },
    {
      weekNumber: 2,
      title: 'Expanding the Toolbox',
      description: 'Go deeper with Claude\'s capabilities. Learn MCPs, Skills, and Projects to extend what\'s possible.',
      date: '2026-01-27',
      content: week2Content,
    },
    {
      weekNumber: 3,
      title: 'Building & Iteration',
      description: 'Deep dive into Claude Code. Git and GitHub. From idea to PRD to working software.',
      date: '2026-02-03',
      content: week3Content,
    },
    {
      weekNumber: 4,
      title: 'Ship & Celebrate',
      description: 'The 4 D\'s: Decision, Design, Development, Deployment. Demo day and what\'s next.',
      date: '2026-02-10',
      content: week4Content,
    },
  ]

  for (const week of weeks) {
    console.log(`Creating Week ${week.weekNumber}: ${week.title}...`)
    await query(
      `INSERT INTO lessons (cohort_id, week_number, title, description, date, content_markdown, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cohortId,
        week.weekNumber,
        week.title,
        week.description,
        week.date,
        week.content,
        'published',
        week.weekNumber,
        now,
        now,
      ]
    )
    console.log(`✓ Week ${week.weekNumber} created`)
  }

  // 4. Also insert Cohort 2 record
  console.log('Creating Cohort 2 record...')
  await query(
    `INSERT INTO cohorts (slug, title, description, start_date, weeks, price_cents, is_public, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'cohort-2',
      'Cohort 2: Practice',
      '6 weeks of deeper building. Build with AI as your creative partner.',
      '2026-04-07',
      6,
      50000, // $500
      0, // not public — gated
      'enrolling',
      now,
    ]
  )
  console.log('✓ Cohort 2 created')

  console.log('\nDone! Seeded Cohort 1 (4 weeks) + Cohort 2 record.')
}

main().catch(console.error)
