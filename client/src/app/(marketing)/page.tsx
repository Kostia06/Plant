import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-parchment px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl text-deep-forest">Mind Bloom</h1>
        <p className="max-w-md text-lg text-weathered-stone">
          Grow your mind, one bloom at a time. Build habits, reflect daily, and
          challenge your thinking.
        </p>
        <Link
          href="/app"
          className="rounded-full bg-deep-forest px-8 py-3 text-sm text-parchment transition-colors hover:bg-spring-canopy"
        >
          Open App
        </Link>
      </div>
    </div>
  );
}
