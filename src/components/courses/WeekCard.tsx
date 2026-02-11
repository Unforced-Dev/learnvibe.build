import { WeekSummary } from "@/types/course";

interface WeekCardProps {
  week: WeekSummary;
}

export function WeekCard({ week }: WeekCardProps) {
  return (
    <div className="rounded-xl bg-charcoal border border-slate p-6 flex gap-5">
      <span className="font-mono text-accent text-xl font-semibold shrink-0">
        {String(week.number).padStart(2, "0")}
      </span>
      <div className="flex flex-col gap-2">
        <h4 className="text-lg font-semibold text-white">{week.title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">
          {week.description}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {week.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-md bg-slate text-gray-400 font-mono text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
