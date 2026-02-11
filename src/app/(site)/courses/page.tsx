import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TierSection } from "@/components/courses/TierSection";
import { getCoursesByTier } from "@/data/courses";

export const metadata: Metadata = {
  title: "Courses — Learn Vibe Build",
  description:
    "Explore AI courses from fundamentals to capstone. Learn, Vibe, Build your way to capability.",
};

export default function CourseCatalogPage() {
  const learnCourses = getCoursesByTier("LEARN");
  const vibeCourses = getCoursesByTier("VIBE");
  const buildCourses = getCoursesByTier("BUILD");

  return (
    <>
      {/* Hero */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-mono text-accent text-sm mb-4">
            // learning_path
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Your Journey
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            From curious to capable. Each level builds on the last, giving you
            the skills to create with AI.
          </p>

          {/* Path visualization */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className="px-5 py-2 rounded-full bg-accent/20 text-accent font-mono text-sm font-semibold">
              100 · LEARN
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-5 py-2 rounded-full bg-storm/20 text-storm font-mono text-sm font-semibold">
              200 · VIBE
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-5 py-2 rounded-full bg-form/20 text-form font-mono text-sm font-semibold">
              300 · BUILD
            </span>
          </div>
        </div>
      </section>

      {/* 100-Level: LEARN */}
      <TierSection
        tier="LEARN"
        label="LEARN — Foundations"
        description="Start here. Build a working relationship with AI and understand how to think alongside it."
        courses={learnCourses}
        color="indigo"
        levelLabel="100-LEVEL"
      />

      {/* 200-Level: VIBE */}
      <TierSection
        tier="VIBE"
        label="VIBE — Specialization"
        description="Choose your track. Deep dive into the craft of building, creating, and thinking with AI."
        courses={vibeCourses}
        color="amber"
        levelLabel="200-LEVEL"
      />

      {/* 300-Level: BUILD */}
      <TierSection
        tier="BUILD"
        label="BUILD — Capstone"
        description="Bring it all together. A guided capstone project where you ship something real to the world."
        courses={buildCourses}
        color="green"
        levelLabel="300-LEVEL"
      />
    </>
  );
}
