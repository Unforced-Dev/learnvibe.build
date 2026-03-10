/**
 * Seed script for Cohort 1 content.
 * Run via: CLOUDFLARE_ACCOUNT_ID=... npx wrangler d1 execute learnvibe-db --remote --file=src/lib/seed-cohort1.sql
 *
 * This file generates the SQL. Run the companion .sql file against D1.
 */

// Cohort 1 lesson content as markdown
// Each week is a complete markdown document

export const COHORT_1_WEEKS = [
  {
    weekNumber: 1,
    title: 'Orientation & Play',
    description: 'Get set up with Claude Desktop. Explore what\'s possible. Learn the foundational framework for thinking with AI.',
    date: '2026-01-20',
  },
  {
    weekNumber: 2,
    title: 'Expanding the Toolbox',
    description: 'Go deeper with Claude\'s capabilities. Learn MCPs, Skills, and Projects to extend what\'s possible.',
    date: '2026-01-27',
  },
  {
    weekNumber: 3,
    title: 'Building & Iteration',
    description: 'Deep dive into Claude Code. Git and GitHub. From idea to PRD to working software.',
    date: '2026-02-03',
  },
  {
    weekNumber: 4,
    title: 'Ship & Celebrate',
    description: 'The 4 D\'s: Decision, Design, Development, Deployment. Demo day and what\'s next.',
    date: '2026-02-10',
  },
]
