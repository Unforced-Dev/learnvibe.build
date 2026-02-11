import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-slate">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="font-mono text-sm text-gray-600">
          // learnvibe.build
        </span>
        <div className="flex gap-6">
          <Link
            href="/courses"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Courses
          </Link>
          <Link
            href="#"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Community
          </Link>
          <Link
            href="#"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            About
          </Link>
          <Link
            href="#"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Discord
          </Link>
        </div>
      </div>
    </footer>
  );
}
