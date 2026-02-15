import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-parchment px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-4xl px-icon">[404]</span>
        <h1 className="text-xl text-deep-forest">Page Not Found</h1>
        <p className="text-sm text-weathered-stone">
          This path doesn't lead anywhere.
        </p>
        <Link
          href="/app"
          className="btn btn-primary"
          style={{ marginTop: "1rem" }}
        >
          Back to App
        </Link>
      </div>
    </div>
  );
}
