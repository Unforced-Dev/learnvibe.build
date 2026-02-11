import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, getCourseBySlug } from "@/data/courses";
import { tierColors } from "@/types/course";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WeekCard } from "@/components/courses/WeekCard";

export async function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.code}: ${course.title} — Learn Vibe Build`,
    description: course.description,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const colors = tierColors[course.color];
  const prereqCourses = course.prerequisites
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean);

  return (
    <>
      {/* Breadcrumbs + Header */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm mb-8">
            <Link
              href="/courses"
              className="text-accent hover:text-accent-light transition-colors"
            >
              Courses
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-500">{course.title}</span>
          </div>

          {/* Level badges */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`px-3 py-1 rounded-full font-mono text-xs font-semibold ${colors.bg} ${colors.text}`}
            >
              {course.tierLevel}-LEVEL
            </span>
            <span className="px-3 py-1 rounded-full font-mono text-xs font-semibold bg-swarm/20 text-swarm">
              {course.tier}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {course.code}: {course.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed mb-8">
            {course.longDescription || course.description}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm mb-8">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-mono">Duration</span>
              <span className="text-white">{course.duration}</span>
            </div>
            <span className="text-gray-600">·</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-mono">Max size</span>
              <span className="text-white">15 students</span>
            </div>
            <span className="text-gray-600">·</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-mono">Format</span>
              <span className="text-white">Live + async</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            {course.status === "active" ? (
              <button className="bg-accent text-white font-semibold px-8 py-4 rounded-lg hover:bg-accent-light transition-colors">
                Apply for Next Cohort
              </button>
            ) : (
              <button
                className={`border ${colors.border} ${colors.text} font-semibold px-8 py-4 rounded-lg hover:opacity-80 transition-opacity bg-transparent`}
              >
                {course.status === "coming-soon"
                  ? "Join Waitlist"
                  : "Get Notified"}
              </button>
            )}
            {course.nextCohortDate && (
              <span className="text-gray-500 font-mono text-sm">
                Next cohort: {course.nextCohortDate}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Weekly Breakdown */}
      <section className="px-6 py-16 border-t border-slate">
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            label="weekly_breakdown"
            title={`${course.weeks.length} weeks, idea to shipped ${course.tier === "BUILD" ? "project" : "app"}`}
          />
          <div className="mt-8 space-y-3">
            {course.weeks.map((week) => (
              <WeekCard key={week.number} week={week} />
            ))}
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      {prereqCourses.length > 0 && (
        <section className="px-6 py-12 border-t border-slate">
          <div className="max-w-4xl mx-auto">
            <SectionHeader label="prerequisites" title="Before You Start" />
            <div className="mt-6 flex flex-wrap gap-4">
              {prereqCourses.map((prereq) => {
                if (!prereq) return null;
                const pc = tierColors[prereq.color];
                return (
                  <Link
                    key={prereq.id}
                    href={`/courses/${prereq.slug}`}
                    className={`rounded-xl bg-charcoal border ${pc.border} p-4 flex items-center gap-3 hover:border-accent/40 transition-colors`}
                  >
                    <span
                      className={`font-mono text-xs font-semibold ${pc.text}`}
                    >
                      {prereq.code}
                    </span>
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {prereq.title}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Required — or equivalent experience
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      {course.price && (
        <section className="px-6 py-16 border-t border-slate">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <p className="font-mono text-accent text-sm mb-8">// enrollment</p>

            <div className="rounded-2xl bg-charcoal border border-accent/30 p-10 w-full max-w-md text-center">
              <div className="flex items-end justify-center gap-1 mb-6">
                <span className="text-accent text-2xl font-semibold">$</span>
                <span className="text-white text-5xl font-bold">
                  {course.price}
                </span>
                <span className="text-gray-500 text-base mb-1">/ course</span>
              </div>

              <div className="space-y-3 text-left mb-8">
                {[
                  `${course.weeks.length} weeks of live sessions`,
                  "Small cohort (max 15 students)",
                  "Discord community access",
                  "Alumni network and study groups",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <span className="text-form font-mono font-semibold">+</span>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button className="w-full bg-accent text-white font-semibold py-4 rounded-lg hover:bg-accent-light transition-colors">
                Apply for Next Cohort
              </button>
            </div>

            <p className="text-gray-600 text-sm mt-6">
              Need financial assistance? We offer scholarships and payment
              plans.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
