-- Seed Cohort 1 data for LearnVibe
-- This file inserts the cohort record and all 4 weekly lessons.

-- ============================================================
-- Cohort Record
-- ============================================================
INSERT INTO cohorts (slug, title, description, start_date, end_date, weeks, price_cents, is_public, status, created_at)
VALUES ('cohort-1', 'Cohort 1: Foundations', '13 creators learning to build with AI. Four weeks. Idea to reality. January–February 2026, sponsored by Gitcoin.', '2026-01-20', '2026-02-13', 4, 22500, 1, 'completed', '2026-01-20T00:00:00.000Z');

-- ============================================================
-- Week 1: Orientation & Play
-- ============================================================
INSERT INTO lessons (cohort_id, week_number, sort_order, title, description, date, content_markdown, status, created_at, updated_at)
VALUES (
  (SELECT id FROM cohorts WHERE slug = 'cohort-1'),
  1,
  1,
  'Orientation & Play',
  'Get set up with Claude Desktop. Explore what''s possible. Learn the foundational framework for thinking with AI.',
  '2026-01-20',
  '## Session Overview

This first session establishes the learning framework and gives everyone their first hands-on experience building with Claude. The core message: **we''re building skills** -- not just how to use AI, but how to think, articulate, and create.

> "You''re here because you have ideas. Over the next four weeks, we''re hoping to build skills."

### The Four-Week Arc

- **Week 1** — Orientation & Play — Claude Desktop, conversation, first artifacts
- **Week 2** — Seeds & Structure — Claude Cowork, working with files
- **Week 3** — Building & Iteration — Claude Code, full agentic building
- **Week 4** — Ship & Celebrate — Demo day

## Why Claude?

While these skills transfer to any AI tool, we focus on Claude for specific reasons:

**Anthropic thinks about relationship.** They care about how we relate to these models -- not just what they can do.

**Opus 4.5 is the best coder.** Pretty widely agreed -- it writes better code than any other model right now.

**The tools form a learning path.** Desktop → Cowork → Code is a natural progression from simple to powerful.

## Three Ways of Thinking

The course is built around developing three interconnected thinking skills. These aren''t separate -- they feed each other.

### With Self
Know what you want. Know your limitations. Stay grounded.

### With Others
Practice articulation. Get feedback. Lean on the cohort.

### With Machines
Prompt clearly. Provide context. Know the limits.

## Thinking with Self

Before you can articulate it, you have to feel it. Rick Rubin is popular in the vibe coding world because he knows what he likes and what he doesn''t -- that skill is crucial when building with AI.

Know your limitations. Most people in this cohort aren''t coders, and that''s important to know. The AI doesn''t know that we''re not coders.

> "The amount of times I''ve spent an hour trying to solve a problem with an AI, and when I took a step back and thought about it, and then I came back with a fresh prompt, it just solved it."

### Exercise: Felt Sense

1. Sense your body. Sense your breathing.
2. Sense into something you want to create.
3. Can you get a sense for what it would feel like for that thing to exist?
4. Where in your body do you feel that thing?

## Thinking with Others

Other perspectives reveal what we can''t see alone. When we explain our vision to other humans, we get the sense of how things land.

> "When you hit an edge you don''t understand, that''s when you lean on human others."

## Thinking with Machines

Everything you practice with self and others pays off here. The ability to clearly express what you want is the most valuable skill when working with AI.

**Context is everything.** The more you bring in, the more AI can help -- voice messages with messy thoughts, relevant websites, multiple threads that connect to your vision.

**Know the limits.** AI can be confidently wrong. It doesn''t know what it doesn''t know. Your felt sense still matters.

## Hands-On: Building Your First Landing Page

Open Claude Desktop and ask it to build a landing page for your idea. The landing page is a **prop** for articulating your vision, not the deliverable itself.

```
"I''m building [your idea]. Can you make me a simple landing page that explains what it is?"
```

> "AI enables us to take a loosely formed idea and start shaping it out and bring it into a form that enables us to talk about it with others."

## Key Insights

- **The website is a prop** — a communication tool, a way to articulate your vision
- **Voice input creates richer context** — messy thinking helps the AI
- **Take breaks when stuck** — step away, come back with fresh eyes
- **Humility matters** — knowing what you don''t know is powerful

## Homework

1. **Keep playing with Claude Desktop** -- Get comfortable with the conversation.
2. **Refine your idea** -- What do you actually want to build?
3. **Create a landing page** -- Clear enough to share when someone asks "what are you working on?"
4. **Join Discord and introduce yourself** -- Share what you''re working on.
5. **Share your work (optional)** -- Post in Discord for feedback.

## Resources

- [Claude](https://claude.ai) -- The main AI we use
- [Claude Desktop](https://claude.ai/download) -- Download the desktop app
- Voice dictation: Handy (free), Monologue ($10/mo), Wispr Flow ($15/mo), Superwhisper',
  'published',
  '2026-03-10T00:00:00.000Z',
  '2026-03-10T00:00:00.000Z'
);

-- ============================================================
-- Week 2: Expanding the Toolbox
-- ============================================================
INSERT INTO lessons (cohort_id, week_number, sort_order, title, description, date, content_markdown, status, created_at, updated_at)
VALUES (
  (SELECT id FROM cohorts WHERE slug = 'cohort-1'),
  2,
  2,
  'Expanding the Toolbox',
  'Go deeper with Claude''s capabilities. Learn MCPs, Skills, and Projects to extend what''s possible.',
  '2026-01-27',
  '## Session Overview

Last week we started playing with Claude -- having conversations, creating artifacts, building landing pages. This week we go deeper into **what Claude can actually do** when you unlock more of its capabilities.

> "The goal isn''t to rush through features. It''s to really understand how these tools extend your thinking."

## MCPs / Connectors

**MCP** stands for **Model Context Protocol**. In the Claude UI, you''ll see these called **Connectors** or **Integrations**. They all mean the same thing: ways for Claude to reach beyond the conversation and interact with external services.

### What MCPs Do

Without MCPs, Claude only knows what you tell it in the conversation. With MCPs, Claude can:

- Search the web for current information
- Access your Google Drive, Notion, or other services
- Connect to databases and APIs
- Read and write files on your computer

Think of Claude as having "hands" that can reach out and touch things. By default, those hands are tied. MCPs untie them.

### Built-in Connectors

- **Web Search** -- Search the internet for current information
- **Google Drive** -- Access your documents and files
- **Google Docs** -- Read and reference your documents
- **Notion** -- Connect your Notion workspace

> The more context Claude has, the better it can help. MCPs are how you give Claude access to the context it needs.

## Skills

**Skills** are pre-packaged capabilities in Claude -- specialized modes or workflows for specific tasks. They extend what Claude can do without complex prompts.

## Projects

**Projects** in Claude let you organize related conversations and context in one place.

### Why Projects Matter

- **Persistent context** -- Claude remembers what you''ve discussed
- **Organized thinking** -- keep related conversations together
- **Add documents** -- upload files for Claude to reference
- **Custom instructions** -- tell Claude how to behave

Create a project for your main idea. Add your landing page, notes, reference materials, and custom instructions.

> Projects help you think more clearly. By organizing your context, you make it easier for Claude to help you.

## Homework

1. **Enable at least one MCP** -- Try Web Search or Google Drive. Notice how it changes what Claude can do.
2. **Try a Skill** -- Find one relevant to your project.
3. **Create a Project for your main idea** -- Add your landing page, notes, reference materials. Write custom instructions.
4. **Create a GitHub account** -- Go to github.com and sign up. Required for Week 3.

> Don''t rush through these. The goal isn''t to check boxes -- it''s to genuinely understand how these tools extend what''s possible.

## Resources

- [Claude](https://claude.ai) -- MCPs, Skills, Projects
- [GitHub](https://github.com) -- Create your account for next week',
  'published',
  '2026-03-10T00:00:00.000Z',
  '2026-03-10T00:00:00.000Z'
);

-- ============================================================
-- Week 3: Building & Iteration
-- ============================================================
INSERT INTO lessons (cohort_id, week_number, sort_order, title, description, date, content_markdown, status, created_at, updated_at)
VALUES (
  (SELECT id FROM cohorts WHERE slug = 'cohort-1'),
  3,
  3,
  'Building & Iteration',
  'Deep dive into Claude Code. Git and GitHub. From idea to PRD to working software.',
  '2026-02-03',
  '## Session Overview

This is where we go deeper. We''ve learned to converse with Claude and organize our thinking. Now we bring in the power tools -- Claude Code, Git, and the full workflow from idea to working software.

> "The tools are getting faster. That means we need to think slower."

## The Paradox of Slowing Down

Claude Code can generate hundreds of lines of code in seconds. This power is intoxicating -- and dangerous if you''re not careful.

**Speed creates urgency.** When you can build fast, there''s pressure to build more. Before you know it, you''ve created complexity you don''t understand.

**Complexity compounds.** Each feature creates surface area for bugs. Each integration creates dependencies.

**Understanding matters.** You don''t need to understand every line of code. But you need to understand what your system does, what it touches, and what could go wrong.

### Practices for staying grounded

- Take breaks. Step away regularly.
- Write first, build second. Articulate what you want before asking Claude.
- Review what was built. Ask Claude to explain.
- Trust your felt sense. If something feels off, pause.

## Git and GitHub

### What is Git?

**Git** is version control. It tracks every change to your code:
- **Go back in time** -- undo mistakes, restore previous versions
- **Branch** -- try experiments without breaking the main code
- **Merge** -- bring changes together safely

### What is GitHub?

**GitHub** is where Git repositories live online:
- Cloud storage for code
- Collaboration hub
- Free hosting via GitHub Pages
- The world''s code library

### Key Concepts

- **Repository** — a folder that Git tracks, including all change history
- **Commit** — a snapshot of your code at a point in time, like a save point
- **Branch** — a parallel version of your code for experiments
- **Worktree** — multiple branches checked out at once (Claude Code uses these by default)

### What NOT to commit

- API keys and secrets
- .env files
- Personal data
- Large binary files

## Claude Code Deep Dive

Claude Code is Claude in your terminal -- a full agentic coding assistant.

### What makes it different

- **Full file system access** -- reads and writes files across your project
- **Runs commands** -- install packages, run tests, deploy
- **Understands context** -- navigates between files, understands dependencies

### Getting started

```
npm install -g @anthropic-ai/claude-code
cd my-project
claude
```

### Useful commands

- `/help` -- See all available commands
- `/clear` -- Clear conversation history
- `/compact` -- Summarize conversation to save context
- `/cost` -- See session cost

## Building Something Real

### The Workflow

1. **Idea** — Start with your felt sense. What are you creating? Who is it for?
2. **PRD** — Write down *what* you''re building (not how). Features, user flows, success criteria.
3. **Technical Spec** — Figure out *how*. Technologies, architecture, components.
4. **Research** — Understand what exists. Libraries, patterns, similar projects.
5. **Build** — Start small. Get something working. Then iterate.
6. **Test & Iterate** — Does it work? Get feedback. Make changes.

> Start smaller than you think. The most common mistake is trying to build too much.

## Care and Permissions

Claude Code has real power. Permission prompts matter -- read them carefully.

- **Use Git** -- commit before big changes, it''s your safety net
- **Review changes** -- look at what Claude did, use `git diff`
- **Work in a sandbox** -- try risky things in a separate branch
- **Keep secrets out** -- API keys go in environment variables, not code

## Homework

1. **Install Claude Code** -- Get it running on your machine.
2. **Create a GitHub repository** -- For your project.
3. **Write a PRD** -- Use Claude to help. What are you building?
4. **Build the first version** -- Start small. Get something working.
5. **Push to GitHub** -- Commit and push. Share in Discord.

> Next week is Demo Day. You need something to show -- a working demo, a prototype, a proof of concept.

## Resources

- [GitHub](https://github.com)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Git Documentation](https://git-scm.com/doc)',
  'published',
  '2026-03-10T00:00:00.000Z',
  '2026-03-10T00:00:00.000Z'
);

-- ============================================================
-- Week 4: Ship & Celebrate
-- ============================================================
INSERT INTO lessons (cohort_id, week_number, sort_order, title, description, date, content_markdown, status, created_at, updated_at)
VALUES (
  (SELECT id FROM cohorts WHERE slug = 'cohort-1'),
  4,
  4,
  'Ship & Celebrate',
  'The 4 D''s: Decision, Design, Development, Deployment. Demo day and what''s next.',
  '2026-02-10',
  '## Session Overview

The final session. We wove a live build through the entire class -- from a conversation with Claude, through design, into code, and deploying a live site.

> "Most people skip to building. The magic is in the first two D''s."

## The 4 D''s Framework

A framework for going from idea to live product -- the full arc of everything we''ve learned.

### D1 — Decision
Know what you''re building and why.

### D2 — Design
Make your thinking visible before you build.

### D3 — Development
Build it with AI as your hands.

### D4 — Deployment
Ship it to the world.

## Decision -- Clarity First

> "The most important skill isn''t building. It''s knowing what to build."

You can prototype an idea in an afternoon now. The bottleneck isn''t execution anymore -- it''s clarity.

**Decisions are cheap.** With AI, you can test ideas fast. The cost of a wrong decision is low. The cost of no decision is high.

**The felt sense check.** Week 1 principle, still true in Week 4: before you ask the machine, check in with yourself.

**What NOT to build.** Deciding what to leave out is as important as deciding what to include.

## Design -- Make Thinking Visible

> "Design is a conversation between you and the future."

Design isn''t about making things pretty. It''s about making decisions visible.

**The AI needs a blueprint.** If you skip design and go straight to "build me a website," you''ll get something generic. Give it structure and you get something that''s *yours*.

### Layers of fidelity

- A bullet list -- is design
- A conversation -- is design
- A PRD -- is design
- A full mockup -- is design

## Development -- Taste + Hands

> "You are the taste. The AI is the hands."

The AI builds. You direct, review, and refine. The skill isn''t writing code -- it''s knowing what good looks like.

**The review cycle:** Build → Look → Adjust → Build. Your job is the look and adjust part.

**CLAUDE.md** — This file teaches the AI about your project. Like onboarding a new team member. The better your CLAUDE.md, the better every future session goes.

## Deployment -- Make It Real

> "Shipping changes who you are."

Before this cohort, most of you wouldn''t have called yourselves builders. Now you''ve built things. That''s a lived experience. Nobody can take it back.

**"Done" beats "perfect."** Perfectionism is procrastination in a costume. Ship the version that works.

**Build in public.** Share the URL. Tell someone what you made. The act of sharing completes the creative cycle.

**The skill compounds.** Every project gets easier. Every conversation with the AI gets richer.

## Demo Day

The culmination of four weeks. Students shared what they built -- not just the artifact, but the story of building it.

> What is it? Why did you build it? What did you learn?

## What''s Next

This cohort was the first class of something bigger. Here''s what''s taking shape:

- **101 — AI Fundamentals** — How to think with AI. Chat, context-giving, the basics done deep.
- **200 — Vibecoding** — Build real software with AI. What this cohort covered in Weeks 3-4.
- **200 — Vibemarketing** — AI for content creation. Websites, social media, marketing copy.
- **200 — Viberesearch** — AI for knowledge work. Obsidian, research workflows, synthesis.
- **300 — Agentic Engineering** — Advanced. Autonomous AI systems for developers.

## You''re builders now.

The cohort ends. The community doesn''t. The skill compounds. Every project gets easier. Every conversation gets richer.

## Resources

- [Week 1: Orientation & Play](week-1.html)
- [Week 2: Expanding the Toolbox](week-2.html)
- [Week 3: Building & Iteration](week-3.html)
- [Week 4: Ship & Celebrate](week-4.html)',
  'published',
  '2026-03-10T00:00:00.000Z',
  '2026-03-10T00:00:00.000Z'
);
