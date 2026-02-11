import Link from "next/link";
import { GradientText } from "@/components/ui/GradientText";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { courses } from "@/data/courses";

function TerminalPreview() {
  return (
    <div className="terminal rounded-xl p-6 max-w-lg w-full">
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-gray-500">$</span>{" "}
          <span className="text-accent">claude</span>{" "}
          <span className="text-gray-400">
            &quot;help me build a website for my community garden&quot;
          </span>
        </p>
        <p className="text-gray-500">
          I&apos;ll help you create a beautiful community garden website.
          Let&apos;s start with what matters most to your members...
        </p>
        <p>
          <span className="text-form">+</span>{" "}
          <span className="text-gray-400">Creating project structure</span>
        </p>
        <p>
          <span className="text-form">+</span>{" "}
          <span className="text-gray-400">Building landing page</span>
        </p>
        <p>
          <span className="text-form">+</span>{" "}
          <span className="text-gray-400">Adding garden plot map</span>
        </p>
        <p className="text-gray-500">
          <span className="cursor-blink">_</span>
        </p>
      </div>
    </div>
  );
}

function LearningPathCard({
  level,
  label,
  description,
  color,
}: {
  level: string;
  label: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> =
    {
      indigo: {
        bg: "bg-accent/10",
        text: "text-accent",
        border: "border-accent/20",
      },
      amber: {
        bg: "bg-storm/10",
        text: "text-storm",
        border: "border-storm/20",
      },
      green: {
        bg: "bg-form/10",
        text: "text-form",
        border: "border-form/20",
      },
    };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} p-6`}>
      <span className={`font-mono text-xs font-semibold ${c.text}`}>
        {level}
      </span>
      <h3 className="text-white font-bold text-lg mt-2">{label}</h3>
      <p className="text-gray-400 text-sm mt-2 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  const activeCourses = courses.filter((c) => c.status === "active");

  return (
    <>
      {/* Hero */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <p className="font-mono text-accent text-sm mb-6">
              // learn_vibe_build
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Build with AI.
              <br />
              <GradientText>Ship real things.</GradientText>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
              Hands-on cohort courses that teach you to create with AI — from
              your first prompt to a shipped product.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="bg-accent text-white font-semibold px-6 py-3 rounded-lg hover:bg-accent-light transition-colors"
              >
                Explore Courses
              </Link>
              <Link
                href="/courses/ai-fundamentals"
                className="border border-slate text-gray-300 font-semibold px-6 py-3 rounded-lg hover:border-accent/30 transition-colors"
              >
                Start with Fundamentals
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* Learning Path Overview */}
      <section className="px-6 py-20 border-t border-slate">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            label="learning_path"
            title="Your Journey"
            subtitle="From curious to capable. Each level builds on the last."
            centered
          />

          {/* Path pills */}
          <div className="flex items-center justify-center gap-4 mt-8 mb-12">
            <span className="px-4 py-2 rounded-full bg-accent/20 text-accent font-mono text-sm font-semibold">
              100 · LEARN
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-4 py-2 rounded-full bg-storm/20 text-storm font-mono text-sm font-semibold">
              200 · VIBE
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-4 py-2 rounded-full bg-form/20 text-form font-mono text-sm font-semibold">
              300 · BUILD
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <LearningPathCard
              level="100-LEVEL"
              label="LEARN — Foundations"
              description="Build a working relationship with AI. Prompting, context, and the three ways of thinking."
              color="indigo"
            />
            <LearningPathCard
              level="200-LEVEL"
              label="VIBE — Specialization"
              description="Choose your track: coding, content production, or knowledge management with AI."
              color="amber"
            />
            <LearningPathCard
              level="300-LEVEL"
              label="BUILD — Capstone"
              description="Ship something real. A guided capstone project with mentor support and community feedback."
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Featured Cohorts */}
      <section className="px-6 py-20 border-t border-slate">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            label="featured_cohorts"
            title="Upcoming Cohorts"
            subtitle="Small groups, big outcomes. Each cohort is capped at 15 students."
          />

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {activeCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="card rounded-xl p-6 flex gap-6 items-start group"
              >
                <div className="shrink-0">
                  <div className="font-mono text-accent text-xl font-bold">
                    {course.code.split(" ")[1]}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {course.nextCohortDate}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white group-hover:text-accent-light transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-gray-400 text-sm mt-1">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    <span className="font-mono text-gray-500">
                      {course.duration}
                    </span>
                    <span className="text-gray-600">·</span>
                    <span className="text-white font-semibold">
                      ${course.price}
                    </span>
                  </div>
                </div>
                <div className="text-accent shrink-0 mt-1">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="px-6 py-20 border-t border-slate">
        <div className="max-w-6xl mx-auto text-center">
          <SectionHeader
            label="community"
            title="Built Together"
            subtitle="A growing community of creators learning to build with AI."
            centered
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[
              { value: "13", label: "Alumni" },
              { value: "1", label: "Cohorts Completed" },
              { value: "10+", label: "Projects Shipped" },
              { value: "4", label: "Mentors" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-slate">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to <GradientText>start building</GradientText>?
          </h2>
          <p className="text-gray-400 mb-8">
            Begin with AI Fundamentals. No coding experience required.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-accent text-white font-semibold px-8 py-4 rounded-lg hover:bg-accent-light transition-colors"
          >
            View All Courses
          </Link>
        </div>
      </section>
    </>
  );
}
