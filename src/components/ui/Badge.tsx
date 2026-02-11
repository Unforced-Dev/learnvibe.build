type BadgeVariant =
  | "default"
  | "accent"
  | "storm"
  | "swarm"
  | "form"
  | "completed"
  | "active";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate text-gray-400",
  accent: "bg-accent/20 text-accent",
  storm: "bg-storm/20 text-storm",
  swarm: "bg-swarm/20 text-swarm",
  form: "bg-form/20 text-form",
  completed: "bg-green-500/20 text-green-400",
  active: "bg-amber-500/20 text-amber-400",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-mono ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
