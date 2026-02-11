export type Tier = "LEARN" | "VIBE" | "BUILD";
export type TierLevel = 100 | 200 | 300;
export type CourseColor = "indigo" | "amber" | "purple" | "green";
export type CourseStatus = "active" | "coming-soon" | "future";

export interface WeekSummary {
  number: number;
  title: string;
  description: string;
  tags: string[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  slug: string;
  tier: Tier;
  tierLevel: TierLevel;
  color: CourseColor;
  status: CourseStatus;
  description: string;
  longDescription?: string;
  weeks: WeekSummary[];
  prerequisites: string[];
  price?: number;
  duration: string;
  nextCohortDate?: string;
}

export const tierColors: Record<
  CourseColor,
  { bg: string; text: string; border: string; bgLight: string }
> = {
  indigo: {
    bg: "bg-accent/20",
    text: "text-accent",
    border: "border-accent/30",
    bgLight: "bg-accent/10",
  },
  amber: {
    bg: "bg-storm/20",
    text: "text-storm",
    border: "border-storm/30",
    bgLight: "bg-storm/10",
  },
  purple: {
    bg: "bg-swarm/20",
    text: "text-swarm",
    border: "border-swarm/30",
    bgLight: "bg-swarm/10",
  },
  green: {
    bg: "bg-form/20",
    text: "text-form",
    border: "border-form/30",
    bgLight: "bg-form/10",
  },
};
