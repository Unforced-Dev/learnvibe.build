import Link from "next/link";
import { Course, tierColors } from "@/types/course";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const colors = tierColors[course.color];
  const isAvailable = course.status === "active";

  return (
    <div
      className={`rounded-2xl bg-charcoal border ${colors.border} p-8 flex flex-col gap-5`}
    >
      <span
        className={`inline-block self-start px-3 py-1 rounded-md font-mono text-xs font-semibold ${colors.bg} ${colors.text}`}
      >
        {course.code}
      </span>

      <h3 className="text-xl font-bold text-white">{course.title}</h3>

      <p className="text-gray-400 text-sm leading-relaxed">
        {course.description}
      </p>

      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-gray-500">{course.duration}</span>
        <span className="text-gray-600">·</span>
        {isAvailable && course.price ? (
          <span className="text-white font-semibold">${course.price}</span>
        ) : (
          <span className={`font-mono font-semibold ${colors.text}`}>
            {course.status === "coming-soon" ? "Coming Soon" : "Coming 2027"}
          </span>
        )}
      </div>

      {isAvailable ? (
        <Link
          href={`/courses/${course.slug}`}
          className={`mt-auto block text-center rounded-lg ${colors.bg.replace("/20", "")} text-white font-semibold py-3 px-6 hover:opacity-90 transition-opacity`}
          style={{
            backgroundColor:
              course.color === "indigo"
                ? "#6366f1"
                : course.color === "amber"
                  ? "#f59e0b"
                  : course.color === "purple"
                    ? "#8b5cf6"
                    : "#10b981",
          }}
        >
          View Course
        </Link>
      ) : (
        <button
          className={`mt-auto rounded-lg border ${colors.border} ${colors.text} font-semibold py-3 px-6 hover:opacity-80 transition-opacity bg-transparent`}
        >
          {course.status === "coming-soon" ? "Join Waitlist" : "Get Notified"}
        </button>
      )}
    </div>
  );
}
