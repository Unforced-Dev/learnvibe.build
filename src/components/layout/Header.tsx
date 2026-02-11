import Link from "next/link";

export function Header() {
  return (
    <nav className="px-6 py-4 border-b border-slate">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm text-accent hover:text-accent-light transition-colors"
        >
          // learnvibe.build
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/courses"
            className="text-sm text-white hover:text-accent-light transition-colors"
          >
            Courses
          </Link>
          <Link
            href="/cohort-1"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cohort 1
          </Link>
          <Link
            href="#"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Community
          </Link>
          <Link
            href="#"
            className="text-xs bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-light transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
