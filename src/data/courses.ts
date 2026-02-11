import { Course } from "@/types/course";

export const courses: Course[] = [
  {
    id: "lvb-101",
    code: "LVB 101",
    title: "AI Fundamentals",
    slug: "ai-fundamentals",
    tier: "LEARN",
    tierLevel: 100,
    color: "indigo",
    status: "active",
    description:
      "Your first conversation with AI as a creative partner. Prompting, context, and the three ways of thinking.",
    longDescription:
      "Start your journey with AI by building a real working relationship with it. Learn how to prompt clearly, provide context effectively, and understand the three ways of thinking: with self, with others, and with machines. By the end, you'll have built your first AI-assisted project.",
    weeks: [
      {
        number: 1,
        title: "Orientation & Play",
        description:
          "Get set up with Claude Desktop. Explore what's possible. Learn the three ways of thinking.",
        tags: ["Claude Desktop", "Prompting", "Exploration"],
      },
      {
        number: 2,
        title: "Expanding the Toolbox",
        description:
          "Deep dive into MCPs, Skills, and Projects. Organize your thinking and extend Claude's capabilities.",
        tags: ["MCPs", "Skills", "Projects"],
      },
    ],
    prerequisites: [],
    price: 197,
    duration: "2 weeks",
    nextCohortDate: "March 2026",
  },
  {
    id: "lvb-201",
    code: "LVB 201",
    title: "VibeCoding",
    slug: "vibecoding",
    tier: "VIBE",
    tierLevel: 200,
    color: "indigo",
    status: "active",
    description:
      "Turn conversation into software. From idea to deployed web application through dialogue with AI.",
    longDescription:
      "Take what you learned in AI Fundamentals and apply it to building real software. Set up Claude Code, learn Git and GitHub, write product requirements documents, and ship a working web application — all through conversation with AI.",
    weeks: [
      {
        number: 1,
        title: "From Conversation to Code",
        description:
          "Set up Claude Code. Build your first project through dialogue. Understand how AI writes and structures code.",
        tags: ["Claude Code", "First Project"],
      },
      {
        number: 2,
        title: "Git, GitHub & Iteration",
        description:
          "Version control fundamentals. Collaborate with AI on real repos. Ship updates, handle branches, review PRs.",
        tags: ["Git", "GitHub", "PRs"],
      },
      {
        number: 3,
        title: "From PRD to Product",
        description:
          "Write a product requirements doc. Break it into tasks. Build features iteratively with AI pair programming.",
        tags: ["PRDs", "Task Breakdown", "Pair Programming"],
      },
      {
        number: 4,
        title: "Ship & Demo Day",
        description:
          "Polish your project. Deploy to production. Present to the cohort. Celebrate what you built.",
        tags: ["Deploy", "Demo Day", "Showcase"],
      },
    ],
    prerequisites: ["lvb-101"],
    price: 297,
    duration: "4 weeks",
    nextCohortDate: "April 2026",
  },
  {
    id: "lvb-202",
    code: "LVB 202",
    title: "VibeProduction",
    slug: "vibeproduction",
    tier: "VIBE",
    tierLevel: 200,
    color: "amber",
    status: "coming-soon",
    description:
      "Create content at the speed of thought. Social media, video, audio, and visual storytelling with AI.",
    weeks: [
      {
        number: 1,
        title: "The AI Content Studio",
        description:
          "Set up your AI-powered creative workflow. Image generation, video, and audio tools.",
        tags: ["Creative Tools", "Workflow"],
      },
      {
        number: 2,
        title: "Visual Storytelling",
        description:
          "Design graphics, social posts, and brand materials with AI assistance.",
        tags: ["Design", "Branding"],
      },
      {
        number: 3,
        title: "Video & Audio",
        description:
          "Create video content, podcasts, and audio experiences with AI tools.",
        tags: ["Video", "Audio", "Podcasts"],
      },
      {
        number: 4,
        title: "Content Strategy & Ship",
        description:
          "Build a content calendar. Create a portfolio piece. Ship your content.",
        tags: ["Strategy", "Portfolio", "Launch"],
      },
    ],
    prerequisites: ["lvb-101"],
    duration: "4 weeks",
  },
  {
    id: "lvb-203",
    code: "LVB 203",
    title: "VibeThinking",
    slug: "vibethinking",
    tier: "VIBE",
    tierLevel: 200,
    color: "purple",
    status: "coming-soon",
    description:
      "Build a second brain. Knowledge management, research workflows, and structured thinking with AI.",
    weeks: [
      {
        number: 1,
        title: "The Second Brain",
        description:
          "Set up Obsidian with AI integration. Build your personal knowledge system.",
        tags: ["Obsidian", "Knowledge Management"],
      },
      {
        number: 2,
        title: "Research Workflows",
        description:
          "Use AI to synthesize information, explore topics deeply, and build understanding.",
        tags: ["Research", "Synthesis"],
      },
      {
        number: 3,
        title: "Structured Thinking",
        description:
          "Frameworks for decision-making, analysis, and strategic thinking with AI.",
        tags: ["Frameworks", "Analysis"],
      },
      {
        number: 4,
        title: "Your Thinking System",
        description:
          "Build and present your personal thinking system. Share your workflow.",
        tags: ["System Design", "Presentation"],
      },
    ],
    prerequisites: ["lvb-101"],
    duration: "4 weeks",
  },
  {
    id: "lvb-301",
    code: "LVB 301",
    title: "Capstone Project",
    slug: "capstone",
    tier: "BUILD",
    tierLevel: 300,
    color: "green",
    status: "future",
    description:
      "Choose a real problem. Build a real solution. Ship it. Present it. Get feedback from alumni and mentors.",
    weeks: [
      {
        number: 1,
        title: "Problem Discovery",
        description:
          "Identify a real problem worth solving. Research, validate, and scope your project.",
        tags: ["Research", "Scoping"],
      },
      {
        number: 2,
        title: "Design & Architecture",
        description:
          "Design your solution. Plan the build. Set milestones with your mentor.",
        tags: ["Design", "Planning"],
      },
      {
        number: 3,
        title: "Build Sprint 1",
        description: "Core functionality. Ship early and often. Weekly demos.",
        tags: ["Building", "Iteration"],
      },
      {
        number: 4,
        title: "Build Sprint 2",
        description: "Polish, test, and refine. Prepare for launch.",
        tags: ["Polish", "Testing"],
      },
      {
        number: 5,
        title: "Launch Week",
        description:
          "Deploy to production. Write your project story. Prepare your demo.",
        tags: ["Deploy", "Storytelling"],
      },
      {
        number: 6,
        title: "Demo Day & Graduation",
        description:
          "Present to the community. Celebrate. Join the alumni network.",
        tags: ["Demo Day", "Graduation"],
      },
    ],
    prerequisites: ["lvb-101", "lvb-201"],
    duration: "6 weeks",
  },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getCoursesByTier(tier: Course["tier"]): Course[] {
  return courses.filter((c) => c.tier === tier);
}
