import { Course, Tier, tierColors, CourseColor } from "@/types/course";
import { CourseCard } from "./CourseCard";

interface TierSectionProps {
  tier: Tier;
  label: string;
  description: string;
  courses: Course[];
  color: CourseColor;
  levelLabel: string;
}

export function TierSection({
  label,
  description,
  courses,
  color,
  levelLabel,
}: TierSectionProps) {
  const colors = tierColors[color];

  return (
    <section className="px-6 py-16 border-t border-slate">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <span
            className={`inline-block px-4 py-1.5 rounded-full font-mono text-xs font-semibold tracking-wider ${colors.bg} ${colors.text}`}
          >
            {levelLabel}
          </span>
          <h2 className="text-2xl font-bold text-white">{label}</h2>
        </div>

        <p className="text-gray-400 text-base mb-10 max-w-xl leading-relaxed">
          {description}
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
